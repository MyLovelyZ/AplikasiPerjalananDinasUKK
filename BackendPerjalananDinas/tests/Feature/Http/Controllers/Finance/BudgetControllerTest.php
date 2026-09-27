<?php

use App\Enums\AuditAction;
use App\Models\Budget;
use App\Models\Department;
use App\Models\ExpenseReport;
use App\Models\TravelRequest;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

describe('index', function () {
    it("lists the year's budgets with how much is committed and spent", function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $budget = Budget::factory()->create(['year' => 2026, 'amount' => 10_000_000]);
        $trip = TravelRequest::factory()->completed()->create([
            'department_id' => $budget->department_id,
            'budget_id' => $budget->id,
            'estimated_cost' => 3_000_000,
        ]);
        ExpenseReport::factory()->for($trip)->verified()->create(['total_approved' => 2_750_000]);
        TravelRequest::factory()->submitted()->create([
            'department_id' => $budget->department_id,
            'budget_id' => $budget->id,
            'estimated_cost' => 9_000_000,
        ]);
        Budget::factory()->create(['year' => 2025]);

        $this->getJson('/api/finance/budgets?year=2026')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.committed_amount', 3000000)
            ->assertJsonPath('data.0.spent_amount', 2750000)
            ->assertJsonPath('data.0.remaining_amount', 7000000)
            ->assertJsonPath('data.0.utilization_percentage', 30)
            ->assertJsonPath('summary.amount', 10000000)
            ->assertJsonPath('summary.remaining_amount', 7000000);
    });
});

describe('create', function () {
    it('returns the active departments, years, and months for the form', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $active = Department::factory()->create();
        $inactive = Department::factory()->inactive()->create();

        $response = $this->getJson('/api/finance/budgets/create')
            ->assertOk()
            ->assertJsonCount(3, 'data.years')
            ->assertJsonCount(12, 'data.months')
            ->assertJsonPath('data.months.0', ['value' => 1, 'label' => 'January']);

        expect(collect($response->json('data.departments'))->pluck('id'))
            ->toContain($active->id)
            ->not->toContain($inactive->id);
    });
});

describe('store', function () {
    it('allocates an annual budget', function () {
        $finance = User::factory()->finance()->create();
        Sanctum::actingAs($finance);
        $department = Department::factory()->create();

        $this->postJson('/api/finance/budgets', ['department_id' => $department->id, 'year' => 2026, 'amount' => 150_000_000])
            ->assertCreated()
            ->assertJsonPath('data.period_label', 'Year 2026')
            ->assertJsonPath('data.amount', 150000000)
            ->assertJsonPath('data.creator.id', $finance->id);

        $this->assertDatabaseHas('budgets', ['department_id' => $department->id, 'year' => 2026, 'month' => null, 'created_by' => $finance->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => AuditAction::Created->value, 'subject_type' => 'budget']);
    });

    it('allocates a monthly budget next to the annual one', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $annual = Budget::factory()->create(['year' => 2026]);

        $this->postJson('/api/finance/budgets', ['department_id' => $annual->department_id, 'year' => 2026, 'month' => 3, 'amount' => 20_000_000])
            ->assertCreated()
            ->assertJsonPath('data.period_label', 'March 2026');
    });

    it('rejects a second budget for the same department and period', function (?int $month) {
        Sanctum::actingAs(User::factory()->finance()->create());
        $existing = Budget::factory()->create(['year' => 2026, 'month' => $month]);

        $this->postJson('/api/finance/budgets', ['department_id' => $existing->department_id, 'year' => 2026, 'month' => $month, 'amount' => 1_000_000])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['month' => 'This department already has a budget for that period.']);

        expect(Budget::query()->count())->toBe(1);
    })->with([
        'annual' => [null],
        'monthly' => [4],
    ]);

    it('rejects an inactive department', function () {
        Sanctum::actingAs(User::factory()->finance()->create());

        $this->postJson('/api/finance/budgets', ['department_id' => Department::factory()->inactive()->create()->id, 'year' => 2026, 'amount' => 1_000_000])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['department_id']);
    });
});
