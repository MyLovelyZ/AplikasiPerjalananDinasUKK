<?php

use App\Models\AuditLog;
use App\Models\TravelRequest;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('summarizes users, departments, travel requests, and recent activity', function () {
    Sanctum::actingAs(User::factory()->superAdmin()->create());
    $supervisor = User::factory()->supervisor()->create();
    User::factory()->supervisedBy($supervisor)->create();
    User::factory()->supervisedBy($supervisor)->inactive()->create();
    TravelRequest::factory()->for($supervisor->subordinates()->first(), 'user')->submitted()->create();
    AuditLog::factory()->for($supervisor)->create(['description' => 'Latest activity']);

    $response = $this->getJson('/api/admin/dashboard')->assertOk();

    $response
        ->assertJsonPath('data.users.total', 4)
        ->assertJsonPath('data.users.active', 3)
        ->assertJsonPath('data.users.inactive', 1)
        ->assertJsonPath('data.travel_requests_this_year.total', 1)
        ->assertJsonPath('data.recent_activities.0.description', 'Latest activity');
    expect(collect($response->json('data.users.by_role'))->pluck('total', 'role')->all())->toBe([
        'super_admin' => 1,
        'supervisor' => 1,
        'finance' => 0,
        'employee' => 2,
    ]);
    expect(collect($response->json('data.travel_requests_this_year.by_status'))->firstWhere('status', 'submitted')['total'])->toBe(1);
});
