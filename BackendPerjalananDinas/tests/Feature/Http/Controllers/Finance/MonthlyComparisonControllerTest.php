<?php

use App\Enums\AuditAction;
use App\Enums\ExpenseCategory;
use App\Models\Department;
use App\Models\Disbursement;
use App\Models\Expense;
use App\Models\ExpenseReport;
use App\Models\TravelRequest;
use App\Models\User;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * A trip of the department whose expense report is in the given state, with one approved
 * expense per [date, category, amount].
 *
 * @param  list<array{0: string, 1: ExpenseCategory, 2: int}>  $expenses
 */
function tripWithExpenses(Department $department, array $expenses, bool $verified = true): TravelRequest
{
    $trip = TravelRequest::factory()
        ->for(User::factory()->employee()->create(['department_id' => $department->id]), 'user')
        ->completed()
        ->create();
    $factory = ExpenseReport::factory()->for($trip);
    $report = ($verified ? $factory->verified() : $factory->submitted())->create();

    foreach ($expenses as [$date, $category, $amount]) {
        Expense::factory()->for($report)->approved()->create(['expense_date' => $date, 'category' => $category, 'amount' => $amount]);
    }

    return $trip;
}

it('compares the verified spending of a month with the month before it', function () {
    Sanctum::actingAs(User::factory()->finance()->create());
    $it = Department::factory()->create(['code' => 'IT', 'name' => 'Information Technology']);
    $trip = tripWithExpenses($it, [
        ['2026-03-05', ExpenseCategory::Transportation, 1_000_000],
        ['2026-03-20', ExpenseCategory::Accommodation, 500_000],
    ]);
    tripWithExpenses($it, [['2026-02-10', ExpenseCategory::Transportation, 1_200_000]]);
    tripWithExpenses(Department::factory()->create(['name' => 'Marketing']), [['2026-03-12', ExpenseCategory::Meals, 300_000]]);
    // A report finance has not verified yet is not spending.
    tripWithExpenses($it, [['2026-03-15', ExpenseCategory::Meals, 9_000_000]], verified: false);
    Disbursement::factory()->for($trip)->paid()->create(['amount' => 800_000, 'paid_at' => '2026-03-02 09:00']);

    $response = $this->getJson('/api/finance/reports/monthly?year=2026&month=3')->assertOk();

    $response
        ->assertJsonPath('data.period.label', 'March 2026')
        ->assertJsonPath('data.previous_period.label', 'February 2026')
        ->assertJsonPath('data.same_day_last_month', null)
        ->assertJsonPath('data.summary.spending.change_percentage', 50)
        ->assertJsonPath('data.summary.expense_count.current', 3)
        ->assertJsonPath('data.summary.trip_count.current', 2)
        ->assertJsonPath('data.summary.average_per_trip.current', 900000)
        ->assertJsonPath('data.summary.advances_paid.current', 800000)
        ->assertJsonPath('data.by_department.0.department', 'Information Technology')
        ->assertJsonCount(2, 'data.by_department')
        ->assertJsonCount(3, 'data.largest_expenses')
        ->assertJsonPath('data.largest_expenses.0.request_number', $trip->request_number);
    expect($response->json('data.summary.spending'))->toEqual([
        'current' => 1_800_000, 'previous' => 1_200_000, 'change_amount' => 600_000, 'change_percentage' => 50,
    ]);
    expect(collect($response->json('data.by_category'))->keyBy('category')['transportation'])->toMatchArray([
        'current' => 1_000_000, 'previous' => 1_200_000, 'change_amount' => -200_000, 'change_percentage' => -16.7,
    ]);
    // Nothing was spent on accommodation in February, so there is no percentage to show.
    expect(collect($response->json('data.by_category'))->keyBy('category')['accommodation']['change_percentage'])->toBeNull();
});

it('limits the comparison to one department', function () {
    Sanctum::actingAs(User::factory()->finance()->create());
    $department = Department::factory()->create();
    tripWithExpenses($department, [['2026-03-05', ExpenseCategory::Transportation, 1_000_000]]);
    tripWithExpenses(Department::factory()->create(), [['2026-03-05', ExpenseCategory::Transportation, 4_000_000]]);

    $response = $this->getJson("/api/finance/reports/monthly?year=2026&month=3&department_id={$department->id}")->assertOk();

    $response
        ->assertJsonPath('data.department.id', $department->id)
        ->assertJsonCount(1, 'data.by_department');
    expect($response->json('data.summary.spending.current'))->toEqual(1_000_000);
});

it('compares a month in progress with last month up to the same day', function () {
    $this->travelTo(Carbon::parse('2026-10-15 10:00'));
    Sanctum::actingAs(User::factory()->finance()->create());
    tripWithExpenses(Department::factory()->create(), [
        ['2026-09-10', ExpenseCategory::Transportation, 600_000],
        ['2026-09-25', ExpenseCategory::Accommodation, 400_000],
    ]);

    $response = $this->getJson('/api/finance/reports/monthly')->assertOk();

    $response
        ->assertJsonPath('data.period.label', 'October 2026')
        ->assertJsonPath('data.same_day_last_month.day', 15);
    expect($response->json('data.same_day_last_month.spending'))->toEqual(600_000)
        ->and($response->json('data.summary.spending.previous'))->toEqual(1_000_000);
});

it('downloads both months of expenses as an Excel workbook', function () {
    Sanctum::actingAs(User::factory()->finance()->create());
    $department = Department::factory()->create(['code' => 'OPS']);
    $trip = tripWithExpenses($department, [['2026-03-05', ExpenseCategory::Transportation, 1_000_000]]);
    Expense::factory()->for($trip->expenseReport)->approved()->create([
        'expense_date' => '2026-03-06', 'amount' => 250_000, 'description' => '=HYPERLINK("http://example.test","Open")',
    ]);
    tripWithExpenses($department, [['2026-02-10', ExpenseCategory::Meals, 300_000]]);

    $response = $this->get("/api/finance/reports/monthly?year=2026&month=3&department_id={$department->id}&format=xlsx");

    $response->assertOk()
        ->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        ->assertDownload('monthly-spending-2026-03-ops.xlsx');
    $this->assertDatabaseHas('audit_logs', ['action' => AuditAction::Exported->value]);

    $path = tempnam(sys_get_temp_dir(), 'xlsx');
    file_put_contents($path, $response->streamedContent());
    $workbook = IOFactory::load($path);
    unlink($path);

    expect($workbook->getSheetNames())->toBe(['Comparison', 'By category', 'By department', 'Expenses Mar 2026', 'Expenses Feb 2026']);

    $march = $workbook->getSheetByName('Expenses Mar 2026');
    expect($march->getCell('B2')->getValue())->toBe($trip->request_number)
        ->and($march->getCell('I4')->getValue())->toBe('=SUBTOTAL(109,I2:I3)')
        ->and($march->getCell('I4')->getCalculatedValue())->toEqual(1_250_000)
        // An employee's description is kept as text, never run as a formula.
        ->and($march->getCell('G3')->getDataType())->toBe(DataType::TYPE_STRING);
    expect($workbook->getSheetByName('Expenses Feb 2026')->getCell('I2')->getValue())->toEqual(300_000);
});

it('is only available to finance', function () {
    Sanctum::actingAs(User::factory()->employee()->create());

    $this->getJson('/api/finance/reports/monthly')->assertForbidden();
});

it('rejects a month that does not exist', function () {
    Sanctum::actingAs(User::factory()->finance()->create());

    $this->getJson('/api/finance/reports/monthly?month=13&format=pdf')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['month', 'format']);
});
