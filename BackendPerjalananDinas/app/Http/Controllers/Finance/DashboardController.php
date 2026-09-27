<?php

namespace App\Http\Controllers\Finance;

use App\Enums\ApprovalStage;
use App\Enums\DisbursementStatus;
use App\Enums\ExpenseCategory;
use App\Http\Controllers\Controller;
use App\Http\Resources\DepartmentResource;
use App\Http\Resources\DisbursementResource;
use App\Models\Budget;
use App\Models\Disbursement;
use App\Models\Expense;
use App\Models\TravelRequest;
use Carbon\CarbonInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class DashboardController extends Controller
{
    /**
     * Spending this month against last month, what the money went to, and budget absorption.
     *
     * "Spending" means expenses finance has verified, dated by when the money was spent.
     */
    public function __invoke(): JsonResponse
    {
        $now = now();
        $thisMonth = [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()];
        $lastMonth = [$now->copy()->subMonthNoOverflow()->startOfMonth(), $now->copy()->subMonthNoOverflow()->endOfMonth()];

        $spendingThisMonth = $this->spendingBetween(...$thisMonth);
        $spendingLastMonth = $this->spendingBetween(...$lastMonth);

        $budgets = Budget::query()->withUsage()->with('department')->where('year', $now->year)->get();
        $pendingDisbursements = Disbursement::query()->where('status', DisbursementStatus::Pending);

        return response()->json([
            'data' => [
                'spending' => [
                    'this_month' => $spendingThisMonth,
                    'last_month' => $spendingLastMonth,
                    'change_amount' => round($spendingThisMonth - $spendingLastMonth, 2),
                    'change_percentage' => $spendingLastMonth > 0
                        ? round(($spendingThisMonth - $spendingLastMonth) / $spendingLastMonth * 100, 1)
                        : null,
                    'this_month_by_category' => $this->spendingByCategory(...$thisMonth),
                    'last_month_by_category' => $this->spendingByCategory(...$lastMonth),
                    'monthly_trend' => $this->monthlyTrend($now->year),
                ],
                'budget' => [
                    'year' => $now->year,
                    ...$this->budgetTotals($budgets),
                    'by_department' => $budgets
                        ->groupBy('department_id')
                        ->map(fn (Collection $departmentBudgets): array => [
                            'department' => DepartmentResource::make($departmentBudgets->first()->department),
                            ...$this->budgetTotals($departmentBudgets),
                        ])
                        ->sortByDesc('utilization_percentage')
                        ->values(),
                ],
                'queues' => [
                    'budget_verification' => TravelRequest::query()->awaitingFinance(ApprovalStage::Finance)->count(),
                    'expense_report_verification' => TravelRequest::query()->awaitingFinance(ApprovalStage::ExpenseReport)->count(),
                    'pending_disbursements' => (clone $pendingDisbursements)->count(),
                    'pending_disbursement_amount' => (float) (clone $pendingDisbursements)->sum('amount'),
                ],
                'oldest_pending_disbursements' => DisbursementResource::collection(
                    (clone $pendingDisbursements)->with('travelRequest.user')->oldest('id')->limit(5)->get(),
                ),
            ],
        ]);
    }

    private function spendingBetween(CarbonInterface $from, CarbonInterface $to): float
    {
        return round((float) Expense::query()
            ->realized()
            ->whereBetween('expense_date', [$from, $to])
            ->sum('approved_amount'), 2);
    }

    /**
     * @return list<array{category: string, label: string, total: float}>
     */
    private function spendingByCategory(CarbonInterface $from, CarbonInterface $to): array
    {
        $totals = Expense::query()
            ->realized()
            ->whereBetween('expense_date', [$from, $to])
            ->toBase()
            ->selectRaw('category, sum(approved_amount) as total')
            ->groupBy('category')
            ->pluck('total', 'category');

        return array_map(fn (ExpenseCategory $category): array => [
            'category' => $category->value,
            'label' => $category->label(),
            'total' => round((float) ($totals[$category->value] ?? 0), 2),
        ], ExpenseCategory::cases());
    }

    /**
     * Grouped in PHP so the query stays portable between MySQL and SQLite.
     *
     * @return list<array{month: int, label: string, total: float}>
     */
    private function monthlyTrend(int $year): array
    {
        $totalsByMonth = Expense::query()
            ->realized()
            ->whereBetween('expense_date', [Carbon::create($year)->startOfYear(), Carbon::create($year)->endOfYear()])
            ->get(['expense_date', 'approved_amount'])
            ->groupBy(fn (Expense $expense): int => $expense->expense_date->month)
            ->map(fn (Collection $expenses): float => $expenses->sum(fn (Expense $expense): float => (float) $expense->approved_amount));

        return array_map(fn (int $month): array => [
            'month' => $month,
            'label' => Carbon::create($year, $month)->format('M'),
            'total' => round((float) $totalsByMonth->get($month, 0), 2),
        ], range(1, 12));
    }

    /**
     * @param  Collection<int, Budget>  $budgets
     * @return array{amount: float, committed_amount: float, spent_amount: float, remaining_amount: float, utilization_percentage: float}
     */
    private function budgetTotals(Collection $budgets): array
    {
        $amount = round($budgets->sum(fn (Budget $budget): float => (float) $budget->amount), 2);
        $committed = round($budgets->sum(fn (Budget $budget): float => (float) $budget->committed_amount), 2);

        return [
            'amount' => $amount,
            'committed_amount' => $committed,
            'spent_amount' => round($budgets->sum(fn (Budget $budget): float => (float) $budget->spent_amount), 2),
            'remaining_amount' => round($amount - $committed, 2),
            'utilization_percentage' => $amount > 0 ? round($committed / $amount * 100, 1) : 0.0,
        ];
    }
}
