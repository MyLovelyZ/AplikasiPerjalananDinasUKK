<?php

namespace App\Http\Controllers\Employee;

use App\Enums\AuditAction;
use App\Enums\DisbursementStatus;
use App\Enums\DisbursementType;
use App\Enums\ExpenseCategory;
use App\Enums\ExpenseReportStatus;
use App\Enums\ExpenseStatus;
use App\Enums\TravelRequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\StoreExpenseRequest;
use App\Http\Resources\ExpenseReportResource;
use App\Http\Resources\TravelRequestResource;
use App\Models\AuditLog;
use App\Models\Disbursement;
use App\Models\Expense;
use App\Models\ExpenseReport;
use App\Models\TravelRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Number;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * The post-trip expense report (LPJ): receipts the employee files for reimbursement.
 */
class ExpenseController extends Controller
{
    /**
     * The expense report of a trip, with what the employee may still do with it.
     */
    public function index(TravelRequest $travelRequest): JsonResponse
    {
        Gate::authorize('update', $travelRequest);

        $travelRequest->load(['expenseReport.expenses', 'expenseReport.verifier', 'disbursements']);
        $expenseReport = $travelRequest->expenseReport;

        return response()->json([
            'data' => [
                'travel_request' => TravelRequestResource::make($travelRequest),
                'can_manage' => $travelRequest->status === TravelRequestStatus::Approved
                    && ($expenseReport === null || $expenseReport->status->isEditable()),
                'advance_paid' => round($travelRequest->disbursements
                    ->filter(fn (Disbursement $disbursement): bool => $disbursement->type === DisbursementType::Advance
                        && $disbursement->status === DisbursementStatus::Paid)
                    ->sum(fn (Disbursement $disbursement): float => (float) $disbursement->amount), 2),
                'expense_categories' => ExpenseCategory::options(),
            ],
        ]);
    }

    /**
     * Add expenses with their receipts, and optionally submit the report to finance with `submit: true`.
     */
    public function store(StoreExpenseRequest $request, TravelRequest $travelRequest): JsonResponse
    {
        $newExpenses = $request->validated('expenses') ?? [];
        $submits = $request->boolean('submit');

        $expenseReport = DB::transaction(function () use ($request, $travelRequest, $newExpenses, $submits): ExpenseReport {
            $travelRequest->lockInStatus(TravelRequestStatus::Approved);

            $expenseReport = $travelRequest->expenseReport()->first()
                ?? $travelRequest->expenseReport()->create(['status' => ExpenseReportStatus::Draft]);

            if (! $expenseReport->status->isEditable()) {
                throw ValidationException::withMessages([
                    'status' => __('The expense report is ":status" and can no longer be changed.', [
                        'status' => $expenseReport->status->label(),
                    ]),
                ]);
            }

            foreach ($newExpenses as $expense) {
                $receipt = $expense['receipt'] ?? null;

                $expenseReport->expenses()->create([
                    'category' => $expense['category'],
                    'expense_date' => $expense['expense_date'],
                    'description' => $expense['description'],
                    'amount' => $expense['amount'],
                    'status' => ExpenseStatus::Pending,
                    'receipt_path' => $receipt?->store("expense-reports/{$expenseReport->id}", 'local'),
                    'receipt_name' => $receipt === null ? null : Str::limit($receipt->getClientOriginalName(), 150, ''),
                    'receipt_mime_type' => $receipt?->getMimeType(),
                    'receipt_size' => $receipt?->getSize(),
                ]);
            }

            if ($request->filled('summary')) {
                $expenseReport->summary = $request->validated('summary');
            }

            if ($submits) {
                $expenseReport->status = ExpenseReportStatus::Submitted;
                $expenseReport->submitted_at = now();
                $expenseReport->verification_note = null;
            }

            $expenseReport->save();

            AuditLog::record(
                $request,
                $submits ? AuditAction::Submitted : AuditAction::Updated,
                $expenseReport,
                $submits
                    ? __('Submitted the expense report of travel request :number.', ['number' => $travelRequest->request_number])
                    : trans_choice(
                        'Added :count expense to travel request :number.|Added :count expenses to travel request :number.',
                        count($newExpenses),
                        ['number' => $travelRequest->request_number],
                    ),
            );

            return $expenseReport;
        });

        return ExpenseReportResource::make($expenseReport->load(['expenses', 'verifier']))
            ->additional([
                'message' => $submits
                    ? __('Expense report submitted to finance for verification.')
                    : __('Expenses saved.'),
            ])
            ->response()
            ->setStatusCode($newExpenses === [] ? 200 : 201);
    }

    /**
     * Remove an expense (and its receipt) while the report can still be changed.
     */
    public function destroy(Request $request, TravelRequest $travelRequest, Expense $expense): JsonResponse
    {
        Gate::authorize('update', $travelRequest);

        DB::transaction(function () use ($request, $travelRequest, $expense): void {
            $travelRequest->lockInStatus(TravelRequestStatus::Approved);

            $expenseReport = $expense->expenseReport;

            if (! $expenseReport->status->isEditable()) {
                throw ValidationException::withMessages([
                    'status' => __('The expense report is ":status" and can no longer be changed.', [
                        'status' => $expenseReport->status->label(),
                    ]),
                ]);
            }

            $expense->delete();

            AuditLog::record($request, AuditAction::Deleted, $expense, __('Removed an expense of :amount from travel request :number.', [
                'amount' => Number::currency((float) $expense->amount, in: 'IDR', locale: 'id'),
                'number' => $travelRequest->request_number,
            ]));
        });

        if ($expense->receipt_path !== null) {
            Storage::disk('local')->delete($expense->receipt_path);
        }

        return response()->json(['message' => __('Expense removed.')]);
    }
}
