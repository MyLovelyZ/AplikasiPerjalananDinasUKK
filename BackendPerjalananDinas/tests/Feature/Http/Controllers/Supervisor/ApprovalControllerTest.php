<?php

use App\Enums\ApprovalDecision;
use App\Enums\ApprovalStage;
use App\Enums\AuditAction;
use App\Enums\TravelRequestStatus;
use App\Models\Approval;
use App\Models\TravelRequest;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

describe('index', function () {
    it("lists only the team's requests that are waiting for a decision, oldest first", function () {
        $supervisor = User::factory()->supervisor()->create();
        $employee = User::factory()->supervisedBy($supervisor)->create();
        $newer = TravelRequest::factory()->for($employee, 'user')->submitted()->create(['submitted_at' => now()->subHour()]);
        $older = TravelRequest::factory()->for($employee, 'user')->submitted()->create(['submitted_at' => now()->subDays(2)]);
        TravelRequest::factory()->for($employee, 'user')->create();
        TravelRequest::factory()->for($employee, 'user')->supervisorApproved()->create();
        TravelRequest::factory()->submitted()->create();
        Sanctum::actingAs($supervisor);

        $this->getJson('/api/supervisor/approvals')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $older->id)
            ->assertJsonPath('data.1.id', $newer->id)
            ->assertJsonPath('data.0.requester.id', $employee->id);
    });

    it('lists the requests this supervisor has already decided on', function () {
        $supervisor = User::factory()->supervisor()->create();
        $decided = TravelRequest::factory()->for(User::factory()->supervisedBy($supervisor), 'user')->supervisorApproved()->create();
        Approval::factory()->for($decided)->create(['approver_id' => $supervisor->id, 'stage' => ApprovalStage::Supervisor]);
        TravelRequest::factory()->for(User::factory()->supervisedBy($supervisor), 'user')->submitted()->create();
        Sanctum::actingAs($supervisor);

        $this->getJson('/api/supervisor/approvals?status=decided')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $decided->id);
    });
});

describe('show', function () {
    it("shows a team member's request and that it can be reviewed", function () {
        $travelRequest = TravelRequest::factory()->submitted()->withCostEstimates()->create();
        Sanctum::actingAs($travelRequest->user->supervisor);

        $this->getJson("/api/supervisor/approvals/{$travelRequest->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $travelRequest->id)
            ->assertJsonCount(2, 'data.cost_estimates')
            ->assertJsonPath('can_review', true);
    });

    it('returns 404 for a request from another team', function () {
        $travelRequest = TravelRequest::factory()->submitted()->create();
        Sanctum::actingAs(User::factory()->supervisor()->create());

        $this->getJson("/api/supervisor/approvals/{$travelRequest->id}")->assertNotFound();
    });

    it("returns 404 for a team member's draft", function () {
        $travelRequest = TravelRequest::factory()->create();
        Sanctum::actingAs($travelRequest->user->supervisor);

        $this->getJson("/api/supervisor/approvals/{$travelRequest->id}")->assertNotFound();
    });
});

describe('approve', function () {
    it('forwards the request to finance and records the decision', function () {
        $travelRequest = TravelRequest::factory()->submitted()->create();
        $supervisor = $travelRequest->user->supervisor;
        Sanctum::actingAs($supervisor);

        $this->postJson("/api/supervisor/approvals/{$travelRequest->id}/approve", ['note' => 'Good plan.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'supervisor_approved')
            ->assertJsonPath('data.approvals.0.decision', 'approved')
            ->assertJsonPath('message', 'Travel request approved and forwarded to finance.');

        expect($travelRequest->fresh()->status)->toBe(TravelRequestStatus::SupervisorApproved);
        $this->assertDatabaseHas('approvals', [
            'travel_request_id' => $travelRequest->id,
            'approver_id' => $supervisor->id,
            'stage' => ApprovalStage::Supervisor->value,
            'decision' => ApprovalDecision::Approved->value,
            'note' => 'Good plan.',
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => AuditAction::Approved->value, 'subject_id' => $travelRequest->id]);
    });

    it('returns 422 when the request is no longer waiting for a decision', function () {
        $travelRequest = TravelRequest::factory()->supervisorApproved()->create();
        Sanctum::actingAs($travelRequest->user->supervisor);

        $this->postJson("/api/supervisor/approvals/{$travelRequest->id}/approve")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'This action is not available while the travel request is "Waiting for finance".']);

        expect(Approval::query()->count())->toBe(0);
    });

    it('returns 404 for a request from another team', function () {
        $travelRequest = TravelRequest::factory()->submitted()->create();
        Sanctum::actingAs(User::factory()->supervisor()->create());

        $this->postJson("/api/supervisor/approvals/{$travelRequest->id}/approve")->assertNotFound();

        expect($travelRequest->fresh()->status)->toBe(TravelRequestStatus::Submitted);
    });
});

describe('reject', function () {
    it('rejects the request with the reason', function () {
        $travelRequest = TravelRequest::factory()->submitted()->create();
        Sanctum::actingAs($travelRequest->user->supervisor);

        $this->postJson("/api/supervisor/approvals/{$travelRequest->id}/reject", ['note' => 'Please combine it with the Surabaya trip.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.approvals.0.note', 'Please combine it with the Surabaya trip.');

        $this->assertDatabaseHas('approvals', [
            'travel_request_id' => $travelRequest->id,
            'decision' => ApprovalDecision::Rejected->value,
        ]);
    });

    it('requires a reason', function () {
        $travelRequest = TravelRequest::factory()->submitted()->create();
        Sanctum::actingAs($travelRequest->user->supervisor);

        $this->postJson("/api/supervisor/approvals/{$travelRequest->id}/reject")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['note' => 'Please give the reason for rejecting this request.']);

        expect($travelRequest->fresh()->status)->toBe(TravelRequestStatus::Submitted);
    });
});
