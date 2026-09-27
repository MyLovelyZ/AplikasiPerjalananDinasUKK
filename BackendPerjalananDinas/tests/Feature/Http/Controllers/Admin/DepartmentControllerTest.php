<?php

use App\Enums\AuditAction;
use App\Models\Budget;
use App\Models\Department;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

describe('index', function () {
    it('lists every department with its number of users', function () {
        Sanctum::actingAs(User::factory()->superAdmin()->create());
        $finance = Department::factory()->create(['name' => 'Finance']);
        Department::factory()->inactive()->create(['name' => 'Archive']);
        User::factory()->count(2)->create(['department_id' => $finance->id]);

        $this->getJson('/api/admin/departments')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Archive')
            ->assertJsonPath('data.0.is_active', false)
            ->assertJsonPath('data.1.users_count', 2);
    });
});

describe('store', function () {
    it('creates a department and upper-cases its code', function () {
        Sanctum::actingAs(User::factory()->superAdmin()->create());

        $this->postJson('/api/admin/departments', ['code' => 'legal', 'name' => 'Legal'])
            ->assertCreated()
            ->assertJsonPath('data.code', 'LEGAL');

        $this->assertDatabaseHas('departments', ['code' => 'LEGAL', 'name' => 'Legal', 'is_active' => true]);
        $this->assertDatabaseHas('audit_logs', ['action' => AuditAction::Created->value, 'subject_type' => 'department']);
    });

    it('rejects a code that is already used', function () {
        Sanctum::actingAs(User::factory()->superAdmin()->create());
        Department::factory()->create(['code' => 'LEGAL']);

        $this->postJson('/api/admin/departments', ['code' => 'legal', 'name' => 'Legal'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code' => 'The code has already been taken.']);
    });
});

describe('update', function () {
    it('renames and deactivates a department', function () {
        Sanctum::actingAs(User::factory()->superAdmin()->create());
        $department = Department::factory()->create(['name' => 'Ops']);

        $this->putJson("/api/admin/departments/{$department->id}", ['name' => 'Operations', 'is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.name', 'Operations')
            ->assertJsonPath('data.is_active', false);

        expect($department->fresh())->name->toBe('Operations')->is_active->toBeFalse();
    });
});

describe('destroy', function () {
    it('deletes a department nothing refers to', function () {
        Sanctum::actingAs(User::factory()->superAdmin()->create());
        $department = Department::factory()->create();

        $this->deleteJson("/api/admin/departments/{$department->id}")->assertOk();

        $this->assertModelMissing($department);
    });

    it('refuses to delete a department that is still in use', function (Closure $useDepartment) {
        Sanctum::actingAs(User::factory()->superAdmin()->create());
        $department = Department::factory()->create();
        $useDepartment($department);

        $this->deleteJson("/api/admin/departments/{$department->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['department' => 'This department still has users, budgets, or travel requests. Deactivate it instead.']);

        $this->assertModelExists($department);
    })->with([
        'by a user' => fn (Department $department) => User::factory()->create(['department_id' => $department->id]),
        'by a deleted user' => fn (Department $department) => User::factory()->create(['department_id' => $department->id])->delete(),
        'by a budget' => fn (Department $department) => Budget::factory()->for($department)->create(),
    ]);
});
