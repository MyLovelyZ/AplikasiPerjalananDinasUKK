<?php

use App\Enums\ExpenseCategory;
use App\Models\Budget;
use App\Models\Disbursement;
use App\Models\Expense;
use App\Models\ExpenseReport;
use App\Models\TravelRequest;
use App\Models\User;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;

/**
 * An expense on a verified report, dated when the money was spent.
 */
function verifiedExpense(string $date, ExpenseCategory $category, int $approvedAmount): Expense
{
    return Expense::factory()
        ->for(ExpenseReport::factory()->verified())
        ->approved()
        ->create(['expense_date' => $date, 'category' => $category, 'amount' => $approvedAmount]);
}

it('compares spending this month with last month and breaks it down by category', function () {
    $this->travelTo(Carbon::parse('2026-06-15 10:00'));
    Sanctum::actingAs(User::factory()->finance()->create());
    verifiedExpense('2026-06-03', ExpenseCategory::Transportation, 1_200_000);
    verifiedExpense('2026-06-10', ExpenseCategory::Accommodation, 800_000);
    verifiedExpense('2026-05-20', ExpenseCategory::Transportation, 1_600_000);
    Expense::factory()->for(ExpenseReport::factory()->submitted())->create(['expense_date' => '2026-06-05', 'amount' => 9_999_000]);

    $response = $this->getJson('/api/finance/dashboard')->assertOk();

    $response
        ->assertJsonPath('data.spending.this_month', 2000000)
        ->assertJsonPath('data.spending.last_month', 1600000)
        ->assertJsonPath('data.spending.change_amount', 400000)
        ->assertJsonPath('data.spending.change_percentage', 25);
    expect(collect($response->json('data.spending.this_month_by_category'))->pluck('total', 'category')->only(['transportation', 'accommodation'])->all())
        ->toBe(['transportation' => 1200000, 'accommodation' => 800000]);
    expect(collect($response->json('data.spending.monthly_trend'))->pluck('total', 'month')->only([5, 6])->all())
        ->toBe([5 => 1600000, 6 => 2000000]);
});

it("shows the year's budget absorption and the finance queues", function () {
    $this->travelTo(Carbon::parse('2026-06-15 10:00'));
    Sanctum::actingAs(User::factory()->finance()->create());
    $budget = Budget::factory()->create(['year' => 2026, 'amount' => 20_000_000]);
    TravelRequest::factory()->approved()->create(['department_id' => $budget->department_id, 'budget_id' => $budget->id, 'estimated_cost' => 5_000_000]);
    TravelRequest::factory()->supervisorApproved()->create();
    ExpenseReport::factory()->submitted()->create();
    Disbursement::factory()->count(2)->create(['amount' => 750_000]);

    $this->getJson('/api/finance/dashboard')
        ->assertOk()
        ->assertJsonPath('data.budget.amount', 20000000)
        ->assertJsonPath('data.budget.committed_amount', 5000000)
        ->assertJsonPath('data.budget.remaining_amount', 15000000)
        ->assertJsonPath('data.budget.utilization_percentage', 25)
        ->assertJsonPath('data.budget.by_department.0.department.id', $budget->department_id)
        ->assertJsonPath('data.queues.budget_verification', 1)
        ->assertJsonPath('data.queues.expense_report_verification', 1)
        ->assertJsonPath('data.queues.pending_disbursements', 2)
        ->assertJsonPath('data.queues.pending_disbursement_amount', 1500000)
        ->assertJsonCount(2, 'data.oldest_pending_disbursements');
});
