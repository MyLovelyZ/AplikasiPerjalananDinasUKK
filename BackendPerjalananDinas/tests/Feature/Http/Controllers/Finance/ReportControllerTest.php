<?php

use App\Enums\AuditAction;
use App\Enums\ExpenseCategory;
use App\Models\Budget;
use App\Models\Department;
use App\Models\Disbursement;
use App\Models\Expense;
use App\Models\ExpenseReport;
use App\Models\TravelRequest;
use App\Models\User;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;

/**
 * A completed March 2026 trip for the department: 1,500,000 spent against a 1,000,000 advance.
 */
function completedMarchTrip(Department $department): TravelRequest
{
    $trip = TravelRequest::factory()
        ->for(User::factory()->employee()->create(['department_id' => $department->id]), 'user')
        ->completed()
        ->departingOn(Carbon::parse('2026-03-10'), 2)
        ->create(['estimated_cost' => 2_000_000]);
    $expenseReport = ExpenseReport::factory()->for($trip)->verified()->create(['total_approved' => 1_500_000]);
    Expense::factory()->for($expenseReport)->approved()->create(['expense_date' => '2026-03-10', 'category' => ExpenseCategory::Transportation, 'amount' => 1_000_000]);
    Expense::factory()->for($expenseReport)->approved()->create(['expense_date' => '2026-03-11', 'category' => ExpenseCategory::Accommodation, 'amount' => 500_000]);
    Disbursement::factory()->for($trip)->paid()->create(['amount' => 1_000_000, 'paid_at' => '2026-03-05 09:00']);
    Disbursement::factory()->for($trip)->reimbursement()->paid()->create(['amount' => 500_000, 'paid_at' => '2026-03-20 09:00']);

    return $trip;
}

it('returns the recap of a month as JSON', function () {
    Sanctum::actingAs(User::factory()->finance()->create());
    $department = Department::factory()->create(['code' => 'IT', 'name' => 'Information Technology']);
    $trip = completedMarchTrip($department);
    Budget::factory()->for($department)->create(['year' => 2026, 'amount' => 50_000_000]);
    completedMarchTrip(Department::factory()->create())->update(['departure_date' => '2026-04-10', 'return_date' => '2026-04-11']);

    $response = $this->getJson('/api/finance/reports?year=2026&month=3')->assertOk();

    $response
        ->assertJsonPath('data.period.label', 'March 2026')
        ->assertJsonPath('data.summary.trips_approved', 1)
        ->assertJsonPath('data.summary.estimated_cost', 2000000)
        ->assertJsonPath('data.summary.budget_amount', 50000000)
        ->assertJsonPath('data.by_month', [])
        ->assertJsonPath('data.trips.0.request_number', $trip->request_number)
        ->assertJsonPath('data.trips.0.realized_cost', 1500000);
    // Trips count by departure date, but spending counts by expense date and payments by
    // payment date, so the April trip's March expenses and March payments are included.
    expect($response->json('data.trips'))->toHaveCount(1)
        ->and($response->json('data.summary.realized_spending'))->toEqual(3000000)
        ->and($response->json('data.summary.advances_paid'))->toEqual(2000000)
        ->and($response->json('data.summary.reimbursements_paid'))->toEqual(1000000);
    expect(collect($response->json('data.by_category'))->pluck('total', 'category')->only(['transportation', 'accommodation'])->all())
        ->toEqual(['transportation' => 2000000, 'accommodation' => 1000000]);
});

it('limits the recap to one department', function () {
    Sanctum::actingAs(User::factory()->finance()->create());
    $department = Department::factory()->create();
    completedMarchTrip($department);
    completedMarchTrip(Department::factory()->create());

    $response = $this->getJson("/api/finance/reports?year=2026&department_id={$department->id}")->assertOk();

    $response
        ->assertJsonPath('data.department.id', $department->id)
        ->assertJsonPath('data.summary.trips_approved', 1)
        ->assertJsonCount(12, 'data.by_month')
        ->assertJsonPath('data.by_month.2.total', 1500000)
        ->assertJsonCount(1, 'data.by_department');
    expect($response->json('data.summary.realized_spending'))->toEqual(1500000);
});

it('downloads the recap as a PDF and records the export', function () {
    Sanctum::actingAs(User::factory()->finance()->create());
    completedMarchTrip(Department::factory()->create());

    $response = $this->get('/api/finance/reports?year=2026&month=3&format=pdf');

    $response->assertOk()
        ->assertHeader('Content-Type', 'application/pdf')
        ->assertDownload('finance-report-2026-03.pdf');
    expect($response->streamedContent())->toStartWith('%PDF');
    $this->assertDatabaseHas('audit_logs', ['action' => AuditAction::Exported->value]);
});

it('downloads the recap as an Excel workbook', function () {
    Sanctum::actingAs(User::factory()->finance()->create());
    $department = Department::factory()->create(['code' => 'OPS']);
    completedMarchTrip($department);

    $response = $this->get("/api/finance/reports?year=2026&department_id={$department->id}&format=xlsx");

    $response->assertOk()
        ->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        ->assertDownload('finance-report-2026-ops.xlsx');
    expect($response->streamedContent())->toStartWith('PK');
});

it('rejects an unknown export format', function () {
    Sanctum::actingAs(User::factory()->finance()->create());

    $this->getJson('/api/finance/reports?format=docx')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['format']);
});
