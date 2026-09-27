<?php

namespace App\Http\Controllers\Finance;

use App\Enums\ApprovalDecision;
use App\Enums\ApprovalStage;
use App\Enums\AuditAction;
use App\Enums\DisbursementStatus;
use App\Enums\DisbursementType;
use App\Enums\ExpenseReportStatus;
use App\Enums\ExpenseStatus;
use App\Enums\SettlementType;
use App\Enums\TravelRequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\BudgetResource;
use App\Http\Resources\TravelRequestResource;
use App\Models\AuditLog;
use App\Models\Budget;
use App\Models\ExpenseReport;
use App\Models\TravelRequest;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Number;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Finance works two queues of travel requests:
 *  - `finance`: approved by the supervisor, waiting for the budget check and the advance;
 *  - `expense_report`: back from the trip, waiting for the receipts to be verified.
 */
class ApprovalController extends Controller
{
    /**
     * Requests waiting for finance, the most urgent departure first. Filter with `stage`.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'stage' => ['nullable', Rule::in([ApprovalStage::Finance->value, ApprovalStage::ExpenseReport->value])],
            'department_id' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $travelRequests = TravelRequest::query()
            ->awaitingFinance(isset($filters['stage']) ? ApprovalStage::from($filters['stage']) : null)
            ->with(['user', 'department', 'expenseReport'])
            ->when($filters['department_id'] ?? null, fn (Builder $query, int $departmentId) => $query->where('department_id', $departmentId))
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where(
                fn (Builder $query) => $query
                    ->where('purpose', 'like', "%{$search}%")
                    ->orWhere('request_number', 'like', "%{$search}%")
                    ->orWhereHas('user', fn (Builder $query) => $query->where('name', 'like', "%{$search}%")),
            ))
            ->orderBy('departure_date')
            ->orderBy('id')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return TravelRequestResource::collection($travelRequests);
    }

    /**
     * The full request. While it waits for budget verification, `budget_check` shows
     * which budget it would be charged to and whether enough is left.
     */
    public function show(TravelRequest $travelRequest): TravelRequestResource
    {
        Gate::authorize('view', $travelRequest);

        $travelRequest->loadDetails();

        return TravelRequestResource::make($travelRequest)->additional([
            'budget_check' => $travelRequest->financeStage() === ApprovalStage::Finance
                ? $this->budgetCheck($travelRequest)
                : null,
        ]);
    }

    /**
     * Approve whichever finance stage the request is waiting in.
     */
    public function verify(Request $request, TravelRequest $travelRequest): TravelRequestResource
    {
        Gate::authorize('view', $travelRequest);

        return match ($travelRequest->financeStage()) {
            ApprovalStage::Finance => $this->verifyBudget($request, $travelRequest),
            ApprovalStage::ExpenseReport => $this->verifyExpenseReport($request, $travelRequest),
            default => throw ValidationException::withMessages([
                'status' => __('This travel request is not waiting for finance verification.'),
            ]),
        };
    }

    /**
     * Reject the request before the trip, or return the expense report to the employee after it.
     */
    public function reject(Request $request, TravelRequest $travelRequest): TravelRequestResource
    {
        Gate::authorize('view', $travelRequest);

        $stage = $travelRequest->financeStage();

        if ($stage === null) {
            throw ValidationException::withMessages([
                'status' => __('This travel request is not waiting for finance verification.'),
            ]);
        }

        $validated = $request->validate([
            'note' => ['required', 'string', 'min:5', 'max:1000'],
        ], [
            'note.required' => __('Please give the reason for rejecting this request.'),
        ]);

        DB::transaction(function () use ($request, $travelRequest, $stage, $validated): void {
            if ($stage === ApprovalStage::Finance) {
                $travelRequest->lockInStatus(TravelRequestStatus::SupervisorApproved);
                $travelRequest->update(['status' => TravelRequestStatus::Rejected]);
            } else {
                $travelRequest->lockInStatus(TravelRequestStatus::Approved);
                $this->lockSubmittedExpenseReport($travelRequest)->update([
                    'status' => ExpenseReportStatus::Returned,
                    'verification_note' => $validated['note'],
                ]);
            }

            $travelRequest->approvals()->create([
                'approver_id' => $request->user()->id,
                'stage' => $stage,
                'decision' => ApprovalDecision::Rejected,
                'note' => $validated['note'],
            ]);

            AuditLog::record($request, AuditAction::Rejected, $travelRequest, $stage === ApprovalStage::Finance
                ? __('Rejected travel request :number at budget verification.', ['number' => $travelRequest->request_number])
                : __('Returned the expense report of travel request :number for revision.', ['number' => $travelRequest->request_number]));
        });

        return TravelRequestResource::make($travelRequest->loadDetails())->additional([
            'message' => $stage === ApprovalStage::Finance
                ? __('Travel request rejected.')
                : __('Expense report returned to the employee for revision.'),
        ]);
    }

    /**
     * Charge the trip to its department budget and approve the travel advance.
     */
    private function verifyBudget(Request $request, TravelRequest $travelRequest): TravelRequestResource
    {
        $estimatedCost = (float) $travelRequest->estimated_cost;

        $validated = $request->validate([
            'advance_approved' => ['nullable', 'numeric', 'min:0', 'max:'.$estimatedCost],
            'note' => ['nullable', 'string', 'max:1000'],
        ], [
            'advance_approved.max' => __('The approved advance cannot exceed the estimated cost of :amount.', [
                'amount' => $this->money($estimatedCost),
            ]),
        ]);

        $advanceApproved = DB::transaction(function () use ($request, $travelRequest, $validated, $estimatedCost): float {
            $travelRequest->lockInStatus(TravelRequestStatus::SupervisorApproved);

            // Locking the budget row makes concurrent verifications against it run one at a time,
            // so two trips cannot both pass the "enough left" check and overspend it together.
            $budget = Budget::query()
                ->applicableTo($travelRequest->department_id, $travelRequest->departure_date)
                ->lockForUpdate()
                ->first();

            if ($budget === null) {
                throw ValidationException::withMessages([
                    'budget' => __('No budget has been allocated to :department for :period. Allocate one before verifying this request.', [
                        'department' => $travelRequest->department->name,
                        'period' => $travelRequest->departure_date->format('F Y'),
                    ]),
                ]);
            }

            $remainingAmount = round((float) $budget->amount - $budget->committedAmount(), 2);

            if ($remainingAmount < $estimatedCost) {
                throw ValidationException::withMessages([
                    'budget' => __('The :period budget of :department has :remaining left, but this trip needs :required.', [
                        'period' => $budget->period_label,
                        'department' => $travelRequest->department->name,
                        'remaining' => $this->money($remainingAmount),
                        'required' => $this->money($estimatedCost),
                    ]),
                ]);
            }

            $advanceApproved = round((float) ($validated['advance_approved'] ?? $travelRequest->advance_requested), 2);

            $travelRequest->update([
                'status' => TravelRequestStatus::Approved,
                'budget_id' => $budget->id,
                'advance_approved' => $advanceApproved,
            ]);

            $travelRequest->approvals()->create([
                'approver_id' => $request->user()->id,
                'stage' => ApprovalStage::Finance,
                'decision' => ApprovalDecision::Approved,
                'note' => $validated['note'] ?? null,
            ]);

            if ($advanceApproved > 0) {
                $travelRequest->createDisbursement(DisbursementType::Advance, $advanceApproved);
            }

            AuditLog::record($request, AuditAction::Verified, $travelRequest, __('Verified the budget of travel request :number and approved an advance of :amount.', [
                'number' => $travelRequest->request_number,
                'amount' => $this->money($advanceApproved),
            ]));

            return $advanceApproved;
        });

        return TravelRequestResource::make($travelRequest->loadDetails())->additional([
            'message' => $advanceApproved > 0
                ? __('Travel request approved. An advance of :amount is waiting for payment.', ['amount' => $this->money($advanceApproved)])
                : __('Travel request approved and its cost committed to the budget.'),
        ]);
    }

    /**
     * Approve the claimed expenses (fully, partly, or not at all) and settle the difference with the advance.
     * Expenses left out of `expenses` are approved in full.
     */
    private function verifyExpenseReport(Request $request, TravelRequest $travelRequest): TravelRequestResource
    {
        $expenseReport = $travelRequest->expenseReport;

        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:1000'],
            'expenses' => ['nullable', 'array'],
            'expenses.*.id' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('expenses', 'id')->where('expense_report_id', $expenseReport->id),
            ],
            'expenses.*.approved_amount' => ['required', 'numeric', 'min:0'],
            'expenses.*.note' => ['nullable', 'string', 'max:500'],
        ]);

        $decisions = collect($validated['expenses'] ?? [])->keyBy('id');

        foreach ($validated['expenses'] ?? [] as $index => $decision) {
            $claimedAmount = (float) $expenseReport->expenses->firstWhere('id', $decision['id'])->amount;

            if ((float) $decision['approved_amount'] > $claimedAmount) {
                throw ValidationException::withMessages([
                    "expenses.{$index}.approved_amount" => __('The approved amount cannot exceed the claimed :amount.', [
                        'amount' => $this->money($claimedAmount),
                    ]),
                ]);
            }
        }

        $hasUnpaidAdvance = $travelRequest->disbursements()
            ->where('type', DisbursementType::Advance)
            ->where('status', DisbursementStatus::Pending)
            ->exists();

        if ($hasUnpaidAdvance) {
            throw ValidationException::withMessages([
                'disbursements' => __('Pay the travel advance before verifying the expense report, so the settlement is calculated from what the employee really received.'),
            ]);
        }

        [$settlementType, $settlementAmount] = DB::transaction(function () use ($request, $travelRequest, $validated, $decisions): array {
            $travelRequest->lockInStatus(TravelRequestStatus::Approved);
            $lockedReport = $this->lockSubmittedExpenseReport($travelRequest);

            $totalApproved = 0.0;

            foreach ($lockedReport->expenses as $expense) {
                $decision = $decisions->get($expense->id);
                $approvedAmount = round((float) ($decision['approved_amount'] ?? $expense->amount), 2);

                $expense->update([
                    'approved_amount' => $approvedAmount,
                    'status' => ExpenseStatus::fromAmounts((float) $expense->amount, $approvedAmount),
                    'verification_note' => $decision['note'] ?? null,
                ]);

                $totalApproved += $approvedAmount;
            }

            $advancePaid = round((float) $travelRequest->disbursements()
                ->where('type', DisbursementType::Advance)
                ->where('status', DisbursementStatus::Paid)
                ->sum('amount'), 2);
            $difference = round($totalApproved - $advancePaid, 2);
            $settlementType = SettlementType::fromDifference($difference);

            $lockedReport->update([
                'status' => ExpenseReportStatus::Verified,
                'total_approved' => round($totalApproved, 2),
                'advance_amount' => $advancePaid,
                'difference' => $difference,
                'settlement_type' => $settlementType,
                'verified_by' => $request->user()->id,
                'verified_at' => now(),
                'verification_note' => $validated['note'] ?? null,
            ]);

            match ($settlementType) {
                SettlementType::Reimbursement => $travelRequest->createDisbursement(DisbursementType::Reimbursement, $difference),
                SettlementType::Refund => $travelRequest->createDisbursement(DisbursementType::Refund, abs($difference)),
                SettlementType::None => null,
            };

            $travelRequest->approvals()->create([
                'approver_id' => $request->user()->id,
                'stage' => ApprovalStage::ExpenseReport,
                'decision' => ApprovalDecision::Approved,
                'note' => $validated['note'] ?? null,
            ]);

            $travelRequest->completeIfSettled();

            AuditLog::record($request, AuditAction::Verified, $lockedReport, __('Verified the expense report of travel request :number: :total approved.', [
                'number' => $travelRequest->request_number,
                'total' => $this->money($totalApproved),
            ]));

            return [$settlementType, abs($difference)];
        });

        return TravelRequestResource::make($travelRequest->loadDetails())->additional([
            'message' => match ($settlementType) {
                SettlementType::Reimbursement => __('Expense report verified. A reimbursement of :amount is waiting for payment.', ['amount' => $this->money($settlementAmount)]),
                SettlementType::Refund => __('Expense report verified. The employee must return :amount of unused advance.', ['amount' => $this->money($settlementAmount)]),
                SettlementType::None => __('Expense report verified. Nothing is left to settle, so the trip is complete.'),
            },
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function budgetCheck(TravelRequest $travelRequest): array
    {
        $requiredAmount = (float) $travelRequest->estimated_cost;

        $budget = Budget::query()
            ->applicableTo($travelRequest->department_id, $travelRequest->departure_date)
            ->withUsage()
            ->with('department')
            ->first();

        if ($budget === null) {
            return [
                'budget' => null,
                'required_amount' => $requiredAmount,
                'remaining_amount' => 0.0,
                'is_sufficient' => false,
                'message' => __('No budget has been allocated to :department for :period.', [
                    'department' => $travelRequest->department->name,
                    'period' => $travelRequest->departure_date->format('F Y'),
                ]),
            ];
        }

        $remainingAmount = round((float) $budget->amount - (float) $budget->committed_amount, 2);
        $isSufficient = $remainingAmount >= $requiredAmount;

        return [
            'budget' => BudgetResource::make($budget),
            'required_amount' => $requiredAmount,
            'remaining_amount' => $remainingAmount,
            'is_sufficient' => $isSufficient,
            'message' => $isSufficient
                ? __('The :period budget has enough left for this trip.', ['period' => $budget->period_label])
                : __('The :period budget has :remaining left, but this trip needs :required.', [
                    'period' => $budget->period_label,
                    'remaining' => $this->money($remainingAmount),
                    'required' => $this->money($requiredAmount),
                ]),
        ];
    }

    /**
     * @throws ValidationException
     */
    private function lockSubmittedExpenseReport(TravelRequest $travelRequest): ExpenseReport
    {
        $expenseReport = ExpenseReport::query()
            ->whereBelongsTo($travelRequest)
            ->lockForUpdate()
            ->firstOrFail();

        if ($expenseReport->status !== ExpenseReportStatus::Submitted) {
            throw ValidationException::withMessages([
                'status' => __('The expense report is ":status", not waiting for verification.', [
                    'status' => $expenseReport->status->label(),
                ]),
            ]);
        }

        return $expenseReport;
    }

    private function money(float $amount): string
    {
        return Number::currency($amount, in: 'IDR', locale: 'id');
    }
}
