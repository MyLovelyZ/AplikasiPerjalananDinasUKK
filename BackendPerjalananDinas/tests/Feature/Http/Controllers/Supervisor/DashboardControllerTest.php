<?php

use App\Enums\ApprovalDecision;
use App\Enums\ApprovalStage;
use App\Models\Approval;
use App\Models\TravelRequest;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it("shows the approval queue, the supervisor's decisions, and the team's trips", function () {
    $this->travelTo(now()->setDate(2026, 6, 15)->setTime(10, 0));
    $supervisor = User::factory()->supervisor()->create();
    $employee = User::factory()->supervisedBy($supervisor)->create();
    User::factory()->supervisedBy($supervisor)->inactive()->create();
    $pending = TravelRequest::factory()->for($employee, 'user')->submitted()->create();
    $travelling = TravelRequest::factory()->for($employee, 'user')->approved()
        ->departingOn(today()->subDay(), 3)
        ->create(['estimated_cost' => 2_000_000]);
    Approval::factory()->for($travelling)->create(['approver_id' => $supervisor->id, 'stage' => ApprovalStage::Supervisor]);
    Approval::factory()->for(TravelRequest::factory()->for($employee, 'user')->rejected())
        ->create(['approver_id' => $supervisor->id, 'stage' => ApprovalStage::Supervisor, 'decision' => ApprovalDecision::Rejected]);
    TravelRequest::factory()->submitted()->create();
    Sanctum::actingAs($supervisor);

    $this->getJson('/api/supervisor/dashboard')
        ->assertOk()
        ->assertJsonPath('data.pending_approvals', 1)
        ->assertJsonPath('data.oldest_pending.0.id', $pending->id)
        ->assertJsonPath('data.my_decisions_this_month', ['approved' => 1, 'rejected' => 1])
        ->assertJsonPath('data.team.members', 1)
        ->assertJsonPath('data.team.committed_cost_this_year', 2000000)
        ->assertJsonPath('data.team.on_trip_today.0.id', $travelling->id);
});
