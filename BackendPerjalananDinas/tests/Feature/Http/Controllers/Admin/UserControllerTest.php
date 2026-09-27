<?php

use App\Enums\AuditAction;
use App\Enums\Role;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

describe('index', function () {
    it('lists every user, filtered by role and search', function () {
        Sanctum::actingAs(User::factory()->superAdmin()->create(['name' => 'Admin']));
        $supervisor = User::factory()->supervisor()->create(['name' => 'Budi Santoso']);
        User::factory()->supervisedBy($supervisor)->create(['name' => 'Andi Pratama']);
        User::factory()->supervisedBy($supervisor)->create(['name' => 'Rina Wijaya']);

        $this->getJson('/api/admin/users?role=employee&search=Andi')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Andi Pratama')
            ->assertJsonPath('data.0.supervisor.name', 'Budi Santoso')
            ->assertJsonPath('meta.total', 1);
    });

    it('filters by account status', function () {
        Sanctum::actingAs(User::factory()->superAdmin()->create());
        $inactive = User::factory()->inactive()->create();

        $this->getJson('/api/admin/users?status=inactive')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $inactive->id);
    });
});

describe('create', function () {
    it('returns the roles, active departments, and active supervisors for the form', function () {
        Sanctum::actingAs(User::factory()->superAdmin()->create());
        $department = Department::factory()->create();
        Department::factory()->inactive()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        User::factory()->supervisor()->inactive()->create(['department_id' => $department->id]);

        $this->getJson('/api/admin/users/create')
            ->assertOk()
            ->assertJsonCount(4, 'data.roles')
            ->assertJsonCount(1, 'data.departments')
            ->assertJsonPath('data.departments.0.id', $department->id)
            ->assertJsonCount(1, 'data.supervisors')
            ->assertJsonPath('data.supervisors.0.id', $supervisor->id);
    });
});

describe('store', function () {
    it('creates an employee account under a supervisor', function () {
        Sanctum::actingAs(User::factory()->superAdmin()->create());
        $supervisor = User::factory()->supervisor()->create();

        $response = $this->postJson('/api/admin/users', [
            'name' => 'Rina Wijaya',
            'email' => 'rina@example.com',
            'password' => 'initial-password',
            'role' => 'employee',
            'employee_number' => 'EMP-77777',
            'department_id' => $supervisor->department_id,
            'supervisor_id' => $supervisor->id,
            'bank_name' => 'BCA',
            'bank_account_number' => '1234567890',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.email', 'rina@example.com')
            ->assertJsonPath('data.supervisor.id', $supervisor->id)
            ->assertJsonPath('message', 'User created successfully.');
        $user = User::query()->where('email', 'rina@example.com')->sole();
        expect($user->role)->toBe(Role::Employee)
            ->and(Hash::check('initial-password', $user->password))->toBeTrue();
        $log = AuditLog::query()->where('action', AuditAction::Created)->sole();
        expect($log->subject_id)->toBe($user->id)
            ->and($log->new_values)->toHaveKey('email')->not->toHaveKey('password');
    });

    it('creates a super admin without a department or supervisor', function () {
        Sanctum::actingAs(User::factory()->superAdmin()->create());

        $this->postJson('/api/admin/users', [
            'name' => 'Second Admin',
            'email' => 'admin2@example.com',
            'password' => 'initial-password',
            'role' => 'super_admin',
        ])->assertCreated();

        $this->assertDatabaseHas('users', ['email' => 'admin2@example.com', 'department_id' => null]);
    });

    it('requires a supervisor for an employee', function () {
        Sanctum::actingAs(User::factory()->superAdmin()->create());

        $this->postJson('/api/admin/users', [
            'name' => 'Rina Wijaya',
            'email' => 'rina@example.com',
            'password' => 'initial-password',
            'role' => 'employee',
            'department_id' => Department::factory()->create()->id,
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'supervisor_id' => 'Employees need a supervisor to approve their travel requests.',
        ]);

        $this->assertDatabaseMissing('users', ['email' => 'rina@example.com']);
    });

    it('rejects a supervisor who does not have the supervisor role', function () {
        Sanctum::actingAs(User::factory()->superAdmin()->create());
        $notASupervisor = User::factory()->finance()->create();

        $this->postJson('/api/admin/users', [
            'name' => 'Rina Wijaya',
            'email' => 'rina@example.com',
            'password' => 'initial-password',
            'role' => 'employee',
            'department_id' => $notASupervisor->department_id,
            'supervisor_id' => $notASupervisor->id,
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'supervisor_id' => 'The supervisor must be an active user with the supervisor role.',
        ]);
    });

    it('rejects an email that is already taken', function () {
        Sanctum::actingAs(User::factory()->superAdmin()->create());
        User::factory()->create(['email' => 'taken@example.com']);

        $this->postJson('/api/admin/users', [
            'name' => 'Someone',
            'email' => 'taken@example.com',
            'password' => 'initial-password',
            'role' => 'finance',
            'department_id' => Department::factory()->create()->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['email' => 'The email has already been taken.']);
    });
});

describe('show', function () {
    it('returns the user with their bank details and number of subordinates', function () {
        Sanctum::actingAs(User::factory()->superAdmin()->create());
        $supervisor = User::factory()->supervisor()->create(['bank_account_number' => '9876543210']);
        User::factory()->count(2)->supervisedBy($supervisor)->create();

        $this->getJson("/api/admin/users/{$supervisor->id}")
            ->assertOk()
            ->assertJsonPath('data.bank_account_number', '9876543210')
            ->assertJsonPath('data.subordinates_count', 2);
    });

    it('returns 404 for a deleted user', function () {
        Sanctum::actingAs(User::factory()->superAdmin()->create());
        $user = User::factory()->create();
        $user->delete();

        $this->getJson("/api/admin/users/{$user->id}")->assertNotFound();
    });
});

describe('edit', function () {
    it('returns the user together with the form options', function () {
        Sanctum::actingAs(User::factory()->superAdmin()->create());
        $user = User::factory()->employee()->create();

        $this->getJson("/api/admin/users/{$user->id}/edit")
            ->assertOk()
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonCount(4, 'data.options.roles');
    });
});

describe('update', function () {
    it('updates the account and keeps the password when none is sent', function () {
        Sanctum::actingAs(User::factory()->superAdmin()->create());
        $user = User::factory()->finance()->create(['position' => 'Staff']);

        $this->putJson("/api/admin/users/{$user->id}", ['position' => 'Finance Manager', 'password' => null])
            ->assertOk()
            ->assertJsonPath('data.position', 'Finance Manager');

        expect(Hash::check('password', $user->fresh()->password))->toBeTrue();
        $log = AuditLog::query()->where('action', AuditAction::Updated)->sole();
        expect($log->old_values)->toBe(['position' => 'Staff'])
            ->and($log->new_values)->toBe(['position' => 'Finance Manager']);
    });

    it('signs a deactivated user out everywhere', function () {
        Sanctum::actingAs(User::factory()->superAdmin()->create());
        $user = User::factory()->finance()->create();
        $user->createToken('web');

        $this->putJson("/api/admin/users/{$user->id}", ['is_active' => false])->assertOk();

        expect($user->fresh()->is_active)->toBeFalse()
            ->and($user->tokens()->count())->toBe(0);
    });

    it('requires a supervisor when a user becomes an employee', function () {
        Sanctum::actingAs(User::factory()->superAdmin()->create());
        $user = User::factory()->finance()->create();

        $this->putJson("/api/admin/users/{$user->id}", ['role' => 'employee'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['supervisor_id' => 'Employees need a supervisor to approve their travel requests.']);

        expect($user->fresh()->role)->toBe(Role::Finance);
    });

    it('refuses to let an admin deactivate or demote themselves', function () {
        $admin = User::factory()->superAdmin()->create();
        Sanctum::actingAs($admin);

        $this->putJson("/api/admin/users/{$admin->id}", ['is_active' => false, 'role' => 'finance', 'department_id' => Department::factory()->create()->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'is_active' => 'You cannot deactivate your own account.',
                'role' => 'You cannot change your own role.',
            ]);

        expect($admin->fresh())->is_active->toBeTrue()->role->toBe(Role::SuperAdmin);
    });

    it('refuses to change the role of a supervisor who still has subordinates', function () {
        Sanctum::actingAs(User::factory()->superAdmin()->create());
        $supervisor = User::factory()->supervisor()->create();
        User::factory()->count(2)->supervisedBy($supervisor)->create();

        $this->putJson("/api/admin/users/{$supervisor->id}", ['role' => 'finance'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['role' => 'This user still supervises 2 employees. Assign them to another supervisor first.']);
    });
});

describe('destroy', function () {
    it('soft deletes and deactivates the user and revokes their tokens', function () {
        Sanctum::actingAs(User::factory()->superAdmin()->create());
        $user = User::factory()->employee()->create();
        $user->createToken('phone');

        $this->deleteJson("/api/admin/users/{$user->id}")
            ->assertOk()
            ->assertJsonPath('message', 'User deleted successfully.');

        $this->assertSoftDeleted($user);
        expect(User::withTrashed()->find($user->id)->is_active)->toBeFalse()
            ->and($user->tokens()->count())->toBe(0);
        $this->assertDatabaseHas('audit_logs', ['action' => AuditAction::Deleted->value, 'subject_id' => $user->id]);
    });

    it('refuses to delete the signed-in admin', function () {
        $admin = User::factory()->superAdmin()->create();
        Sanctum::actingAs($admin);

        $this->deleteJson("/api/admin/users/{$admin->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['user' => 'You cannot delete your own account.']);

        $this->assertNotSoftDeleted($admin);
    });

    it('refuses to delete a supervisor who still has subordinates', function () {
        Sanctum::actingAs(User::factory()->superAdmin()->create());
        $supervisor = User::factory()->supervisor()->create();
        User::factory()->supervisedBy($supervisor)->create();

        $this->deleteJson("/api/admin/users/{$supervisor->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['user' => 'This user still supervises 1 employee. Assign them to another supervisor first.']);

        $this->assertNotSoftDeleted($supervisor);
    });
});
