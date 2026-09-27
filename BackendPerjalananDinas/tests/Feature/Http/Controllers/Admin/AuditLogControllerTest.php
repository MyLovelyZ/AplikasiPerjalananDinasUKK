<?php

use App\Enums\AuditAction;
use App\Models\AuditLog;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('lists activity newest first with the user who acted', function () {
    Sanctum::actingAs(User::factory()->superAdmin()->create());
    $employee = User::factory()->create(['name' => 'Andi Pratama']);
    $older = AuditLog::factory()->for($employee)->create(['description' => 'Andi signed in.']);
    $newer = AuditLog::factory()->for($employee)->create(['action' => AuditAction::Logout, 'description' => 'Andi signed out.']);

    $this->getJson('/api/admin/audit-logs')
        ->assertOk()
        ->assertJsonPath('data.0.id', $newer->id)
        ->assertJsonPath('data.0.action', 'logout')
        ->assertJsonPath('data.0.user.name', 'Andi Pratama')
        ->assertJsonPath('data.1.id', $older->id)
        ->assertJsonCount(count(AuditAction::cases()), 'filters.actions');
});

it('filters by user, action, and date range', function () {
    Sanctum::actingAs(User::factory()->superAdmin()->create());
    $employee = User::factory()->create();
    $match = AuditLog::factory()->for($employee)->create(['action' => AuditAction::Login, 'created_at' => now()->subDays(2)]);
    AuditLog::factory()->for($employee)->create(['action' => AuditAction::Login, 'created_at' => now()->subDays(10)]);
    AuditLog::factory()->for($employee)->create(['action' => AuditAction::Logout, 'created_at' => now()->subDays(2)]);
    AuditLog::factory()->create(['action' => AuditAction::Login, 'created_at' => now()->subDays(2)]);

    $query = http_build_query([
        'user_id' => $employee->id,
        'action' => 'login',
        'date_from' => now()->subDays(3)->toDateString(),
        'date_to' => now()->toDateString(),
    ]);

    $this->getJson("/api/admin/audit-logs?{$query}")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $match->id);
});

it('rejects an unknown action filter', function () {
    Sanctum::actingAs(User::factory()->superAdmin()->create());

    $this->getJson('/api/admin/audit-logs?action=hacked')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['action']);
});
