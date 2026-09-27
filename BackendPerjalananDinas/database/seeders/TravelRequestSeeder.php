<?php

namespace Database\Seeders;

use App\Enums\ApprovalDecision;
use App\Enums\ApprovalStage;
use App\Enums\DisbursementStatus;
use App\Enums\DisbursementType;
use App\Enums\ExpenseCategory;
use App\Enums\ExpenseReportStatus;
use App\Enums\PaymentMethod;
use App\Enums\Role;
use App\Enums\SettlementType;
use App\Enums\TravelRequestStatus;
use App\Models\Approval;
use App\Models\Budget;
use App\Models\Disbursement;
use App\Models\Expense;
use App\Models\ExpenseReport;
use App\Models\TravelRequest;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * Demo trips in every stage of the workflow, so each dashboard, queue, and report has data.
 */
class TravelRequestSeeder extends Seeder
{
    /**
     * A 1×1 PNG used as the demo receipt image.
     */
    private const DEMO_RECEIPT_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    private const DEMO_RECEIPT_PATH = 'expense-reports/demo/receipt.png';

    private User $financeManager;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->financeManager = User::query()->where('role', Role::Finance)->firstOrFail();

        Storage::disk('local')->put(self::DEMO_RECEIPT_PATH, base64_decode(self::DEMO_RECEIPT_PNG));

        $demoEmployee = User::query()->where('email', 'employee@citramandiri.test')->firstOrFail();
        $this->seedOneTripPerStage($demoEmployee);

        $expenseSets = [
            ['advance' => 2_000_000, 'expenses' => [
                [ExpenseCategory::Transportation, 1_850_000, 'Return flight'],
                [ExpenseCategory::Accommodation, 1_100_000, 'Hotel, 2 nights'],
                [ExpenseCategory::DailyAllowance, 300_000, 'Daily allowance, 2 days'],
            ]],
            ['advance' => 2_500_000, 'expenses' => [
                [ExpenseCategory::Transportation, 650_000, 'Train tickets'],
                [ExpenseCategory::Accommodation, 900_000, 'Hotel, 2 nights'],
                [ExpenseCategory::Meals, 350_000, 'Client lunch'],
            ]],
            ['advance' => 1_500_000, 'expenses' => [
                [ExpenseCategory::Transportation, 700_000, 'Office car fuel and tolls'],
                [ExpenseCategory::Accommodation, 800_000, 'Guest house, 2 nights'],
            ]],
            ['advance' => 3_000_000, 'expenses' => [
                [ExpenseCategory::Transportation, 2_400_000, 'Return flight'],
                [ExpenseCategory::Accommodation, 1_800_000, 'Hotel, 3 nights'],
                [ExpenseCategory::DailyAllowance, 450_000, 'Daily allowance, 3 days'],
                [ExpenseCategory::Other, 250_000, 'Airport taxi'],
            ]],
        ];
        $daysAgo = [12, 26, 40, 55, 70, 90, 120, 150];

        $otherEmployees = User::query()
            ->where('role', Role::Employee)
            ->whereKeyNot($demoEmployee->id)
            ->orderBy('id')
            ->get();

        foreach ($otherEmployees as $index => $employee) {
            $set = $expenseSets[$index % count($expenseSets)];

            $this->seedCompletedTrip(
                $employee,
                today()->subDays($daysAgo[$index % count($daysAgo)]),
                days: count($set['expenses']) > 3 ? 3 : 2,
                advance: $set['advance'],
                expenses: $set['expenses'],
            );

            if ($index % 2 === 0) {
                $this->seedTrip($employee, TravelRequestStatus::Submitted, today()->addDays(10 + $index), 2);
            }

            if ($index % 3 === 0) {
                $this->recordSupervisorApproval(
                    $this->seedTrip($employee, TravelRequestStatus::SupervisorApproved, today()->addDays(6 + $index), 1),
                );
            }
        }
    }

    private function seedOneTripPerStage(User $employee): void
    {
        $this->seedTrip($employee, TravelRequestStatus::Draft, today()->addDays(20), 2, [
            'destination' => 'Bandung',
            'purpose' => 'Vendor site inspection',
        ]);

        $this->seedTrip($employee, TravelRequestStatus::Submitted, today()->addDays(12), 3, [
            'destination' => 'Surabaya',
            'purpose' => 'Regional sales coordination',
            'estimated_cost' => 4_500_000,
            'advance_requested' => 1_000_000,
        ]);

        $awaitingFinance = $this->seedTrip($employee, TravelRequestStatus::SupervisorApproved, today()->addDays(8), 2, [
            'destination' => 'Makassar',
            'purpose' => 'Client meeting and contract negotiation',
            'estimated_cost' => 5_200_000,
            'advance_requested' => 1_500_000,
        ]);
        $this->recordSupervisorApproval($awaitingFinance);

        $upcoming = $this->seedTrip($employee, TravelRequestStatus::Approved, today()->addDays(3), 3, [
            'destination' => 'Medan',
            'purpose' => 'Technical training for branch staff',
            'estimated_cost' => 6_000_000,
            'advance_requested' => 2_000_000,
        ]);
        $this->recordSupervisorApproval($upcoming);
        $this->recordBudgetVerification($upcoming);

        $awaitingReport = $this->seedTrip($employee, TravelRequestStatus::Approved, today()->subDays(6), 3, [
            'destination' => 'Denpasar',
            'purpose' => 'Industry conference attendance',
            'estimated_cost' => 5_500_000,
            'advance_requested' => 2_000_000,
        ]);
        $this->recordSupervisorApproval($awaitingReport);
        $this->recordBudgetVerification($awaitingReport);
        $expenseReport = ExpenseReport::factory()->for($awaitingReport)->submitted()->create([
            'summary' => 'Attended the three-day conference and met two prospective partners.',
        ]);
        $this->seedExpenses($expenseReport, $awaitingReport->departure_date, [
            [ExpenseCategory::Transportation, 2_100_000, 'Return flight'],
            [ExpenseCategory::Accommodation, 1_950_000, 'Hotel, 3 nights'],
            [ExpenseCategory::DailyAllowance, 450_000, 'Daily allowance, 3 days'],
        ], approved: false);

        $this->seedCompletedTrip($employee, today()->subMonthNoOverflow()->startOfMonth()->addDays(9), 3, advance: 2_000_000, expenses: [
            [ExpenseCategory::Transportation, 1_800_000, 'Return flight'],
            [ExpenseCategory::Accommodation, 1_650_000, 'Hotel, 3 nights'],
            [ExpenseCategory::DailyAllowance, 450_000, 'Daily allowance, 3 days'],
        ], attributes: [
            'destination' => 'Yogyakarta',
            'purpose' => 'Branch office system audit',
        ]);

        $rejected = $this->seedTrip($employee, TravelRequestStatus::Rejected, today()->addDays(15), 2, [
            'destination' => 'Semarang',
            'purpose' => 'Partner workshop',
        ]);
        Approval::factory()->for($rejected)->rejected()->create([
            'approver_id' => $employee->supervisor_id,
            'stage' => ApprovalStage::Supervisor,
            'note' => 'Please combine this visit with the Surabaya trip next week.',
        ]);

        $this->seedTrip($employee, TravelRequestStatus::Cancelled, today()->addDays(25), 1, [
            'destination' => 'Balikpapan',
            'purpose' => 'Vendor site inspection',
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function seedTrip(User $employee, TravelRequestStatus $status, CarbonInterface $departureDate, int $days, array $attributes = []): TravelRequest
    {
        return TravelRequest::factory()
            ->for($employee, 'user')
            ->departingOn($departureDate, $days)
            ->withCostEstimates()
            ->create([
                'request_number' => TravelRequest::nextRequestNumber(),
                'department_id' => $employee->department_id,
                'status' => $status,
                'submitted_at' => $status === TravelRequestStatus::Draft
                    ? null
                    : $departureDate->copy()->subDays(10)->setTime(9, 0)->min(now()->subHour()),
                ...$attributes,
            ]);
    }

    /**
     * A finished trip: approved, advance paid, receipts verified, and the difference settled.
     *
     * @param  list<array{0: ExpenseCategory, 1: int, 2: string}>  $expenses
     * @param  array<string, mixed>  $attributes
     */
    private function seedCompletedTrip(User $employee, CarbonInterface $departureDate, int $days, int $advance, array $expenses, array $attributes = []): void
    {
        $totalClaimed = array_sum(array_column($expenses, 1));

        $trip = $this->seedTrip($employee, TravelRequestStatus::Approved, $departureDate, $days, [
            'estimated_cost' => (int) ceil(max($totalClaimed, $advance) * 1.1 / 50_000) * 50_000,
            'advance_requested' => $advance,
            ...$attributes,
        ]);
        $this->recordSupervisorApproval($trip);
        $this->recordBudgetVerification($trip);

        $verifiedAt = $trip->return_date->copy()->addDays(4)->setTime(10, 0)->min(now());

        $expenseReport = ExpenseReport::factory()->for($trip)->create([
            'summary' => 'All planned activities were completed on schedule.',
            'status' => ExpenseReportStatus::Verified,
            'submitted_at' => $trip->return_date->copy()->addDays(2)->setTime(9, 0)->min(now()),
        ]);
        $this->seedExpenses($expenseReport, $departureDate, $expenses, approved: true);

        $difference = $totalClaimed - $advance;
        $settlementType = SettlementType::fromDifference($difference);

        $expenseReport->update([
            'total_approved' => $totalClaimed,
            'advance_amount' => $advance,
            'difference' => $difference,
            'settlement_type' => $settlementType,
            'verified_by' => $this->financeManager->id,
            'verified_at' => $verifiedAt,
        ]);

        Approval::factory()->for($trip)->create([
            'approver_id' => $this->financeManager->id,
            'stage' => ApprovalStage::ExpenseReport,
            'decision' => ApprovalDecision::Approved,
            'created_at' => $verifiedAt,
        ]);

        if ($settlementType !== SettlementType::None) {
            $this->markPaid(
                $trip->createDisbursement(
                    $settlementType === SettlementType::Reimbursement ? DisbursementType::Reimbursement : DisbursementType::Refund,
                    abs($difference),
                ),
                $verifiedAt,
            );
        }

        $trip->update(['status' => TravelRequestStatus::Completed, 'completed_at' => $verifiedAt]);
    }

    private function recordSupervisorApproval(TravelRequest $travelRequest): void
    {
        Approval::factory()->for($travelRequest)->create([
            'approver_id' => $travelRequest->user->supervisor_id,
            'stage' => ApprovalStage::Supervisor,
            'decision' => ApprovalDecision::Approved,
            'created_at' => $travelRequest->submitted_at->copy()->addDay()->min(now()),
        ]);
    }

    /**
     * Charge the trip to its budget, approve the requested advance, and record the advance as paid.
     */
    private function recordBudgetVerification(TravelRequest $travelRequest): void
    {
        $verifiedAt = $travelRequest->submitted_at->copy()->addDays(2)->min(now());
        $budget = Budget::query()->applicableTo($travelRequest->department_id, $travelRequest->departure_date)->first();

        $travelRequest->update([
            'budget_id' => $budget?->id,
            'advance_approved' => $travelRequest->advance_requested,
        ]);

        Approval::factory()->for($travelRequest)->create([
            'approver_id' => $this->financeManager->id,
            'stage' => ApprovalStage::Finance,
            'decision' => ApprovalDecision::Approved,
            'created_at' => $verifiedAt,
        ]);

        if ((float) $travelRequest->advance_requested > 0) {
            $this->markPaid(
                $travelRequest->createDisbursement(DisbursementType::Advance, (float) $travelRequest->advance_requested),
                $verifiedAt->copy()->addDay()->min(now()),
            );
        }
    }

    /**
     * @param  list<array{0: ExpenseCategory, 1: int, 2: string}>  $expenses
     */
    private function seedExpenses(ExpenseReport $expenseReport, CarbonInterface $departureDate, array $expenses, bool $approved): void
    {
        foreach ($expenses as $dayOffset => [$category, $amount, $description]) {
            $factory = Expense::factory()->for($expenseReport);

            ($approved ? $factory->approved() : $factory)->create([
                'category' => $category,
                'expense_date' => $departureDate->copy()->addDays(min($dayOffset, 1)),
                'description' => $description,
                'amount' => $amount,
                'receipt_path' => $category->requiresReceipt() ? self::DEMO_RECEIPT_PATH : null,
                'receipt_name' => $category->requiresReceipt() ? 'receipt.png' : null,
                'receipt_mime_type' => $category->requiresReceipt() ? 'image/png' : null,
                'receipt_size' => $category->requiresReceipt() ? 70 : null,
            ]);
        }
    }

    private function markPaid(Disbursement $disbursement, CarbonInterface $paidAt): void
    {
        $disbursement->update([
            'status' => DisbursementStatus::Paid,
            'method' => PaymentMethod::Transfer,
            'reference_number' => 'TRF-'.str_pad((string) $disbursement->id, 6, '0', STR_PAD_LEFT),
            'paid_at' => $paidAt,
            'processed_by' => $this->financeManager->id,
        ]);
    }
}
