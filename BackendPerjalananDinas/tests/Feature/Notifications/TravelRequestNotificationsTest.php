<?php

use App\Enums\NotificationEvent;
use App\Models\Budget;
use App\Models\Disbursement;
use App\Models\Expense;
use App\Models\ExpenseReport;
use App\Models\TravelRequest;
use App\Models\User;
use App\Notifications\TravelRequestActivity;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    Notification::fake();
});

/**
 * @param  array<string, mixed>  $data
 */
function assertActivitySent(User $recipient, NotificationEvent $event, TravelRequest $travelRequest, array $data = []): void
{
    Notification::assertSentTo($recipient, TravelRequestActivity::class, function (TravelRequestActivity $notification) use ($recipient, $event, $travelRequest, $data): bool {
        $payload = $notification->toArray($recipient);

        return $notification->event === $event
            && $payload['travel_request_id'] === $travelRequest->id
            && array_intersect_assoc($data, $payload) == $data;
    });
}

describe('employee actions', function () {
    it('tells the supervisor when a request is submitted', function () {
        $employee = User::factory()->employee()->create();
        Sanctum::actingAs($employee);

        $this->postJson('/api/employee/requests', travelRequestPayload(['submit' => true]))->assertCreated();

        assertActivitySent($employee->supervisor, NotificationEvent::RequestSubmitted, TravelRequest::query()->sole(), [
            'actor_name' => $employee->name,
        ]);
        Notification::assertNotSentTo($employee, TravelRequestActivity::class);
    });

    it('tells nobody when a request is only saved as a draft', function () {
        Sanctum::actingAs(User::factory()->employee()->create());

        $this->postJson('/api/employee/requests', travelRequestPayload())->assertCreated();

        Notification::assertNothingSent();
    });

    it('tells the supervisor when a draft is submitted later', function () {
        $travelRequest = TravelRequest::factory()->withCostEstimates()->create();
        Sanctum::actingAs($travelRequest->user);

        $this->putJson("/api/employee/requests/{$travelRequest->id}", ['submit' => true])->assertOk();

        assertActivitySent($travelRequest->user->supervisor, NotificationEvent::RequestSubmitted, $travelRequest);
    });

    it('tells the supervisor when a submitted request is cancelled, but not a draft', function () {
        $submitted = TravelRequest::factory()->submitted()->create();
        $draft = TravelRequest::factory()->for($submitted->user, 'user')->create();
        Sanctum::actingAs($submitted->user);

        $this->deleteJson("/api/employee/requests/{$draft->id}")->assertOk();
        Notification::assertNothingSent();

        $this->deleteJson("/api/employee/requests/{$submitted->id}")->assertOk();
        assertActivitySent($submitted->user->supervisor, NotificationEvent::RequestCancelled, $submitted);
    });

    it('tells every active finance user when an expense report is submitted', function () {
        $finance = User::factory()->finance()->count(2)->create();
        $inactiveFinance = User::factory()->finance()->inactive()->create();
        $travelRequest = TravelRequest::factory()->approved()->departingOn(today()->subDays(3), 2)->create();
        Expense::factory()->for(ExpenseReport::factory()->for($travelRequest))->create(['amount' => 750_000]);
        Sanctum::actingAs($travelRequest->user);

        $this->postJson("/api/employee/requests/{$travelRequest->id}/expenses", [
            'summary' => 'Met the client and signed the contract.',
            'submit' => true,
        ])->assertOk();

        foreach ($finance as $user) {
            assertActivitySent($user, NotificationEvent::ExpenseReportSubmitted, $travelRequest, ['amount' => 750000.0]);
        }
        Notification::assertNotSentTo($inactiveFinance, TravelRequestActivity::class);
    });
});

describe('supervisor decisions', function () {
    it('tells the employee and finance when a request is approved', function () {
        $finance = User::factory()->finance()->create();
        $travelRequest = TravelRequest::factory()->submitted()->create();
        Sanctum::actingAs($travelRequest->user->supervisor);

        $this->postJson("/api/supervisor/approvals/{$travelRequest->id}/approve")->assertOk();

        assertActivitySent($travelRequest->user, NotificationEvent::RequestSupervisorApproved, $travelRequest, [
            'actor_name' => $travelRequest->user->supervisor->name,
        ]);
        assertActivitySent($finance, NotificationEvent::RequestAwaitingFinance, $travelRequest);
    });

    it('tells the employee why a request was rejected', function () {
        $travelRequest = TravelRequest::factory()->submitted()->create();
        Sanctum::actingAs($travelRequest->user->supervisor);

        $this->postJson("/api/supervisor/approvals/{$travelRequest->id}/reject", ['note' => 'Please combine it with the March trip.'])
            ->assertOk();

        assertActivitySent($travelRequest->user, NotificationEvent::RequestRejected, $travelRequest, [
            'stage' => 'supervisor',
            'note' => 'Please combine it with the March trip.',
        ]);
    });

    it('sends nothing when the decision fails validation', function () {
        $travelRequest = TravelRequest::factory()->submitted()->create();
        Sanctum::actingAs($travelRequest->user->supervisor);

        $this->postJson("/api/supervisor/approvals/{$travelRequest->id}/reject")->assertUnprocessable();

        Notification::assertNothingSent();
    });
});

describe('finance decisions', function () {
    it('tells the employee the trip is approved and the advance amount', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $travelRequest = TravelRequest::factory()->supervisorApproved()->create([
            'estimated_cost' => 3_000_000,
            'advance_requested' => 1_000_000,
        ]);
        Budget::factory()->create([
            'department_id' => $travelRequest->department_id,
            'year' => $travelRequest->departure_date->year,
            'amount' => 10_000_000,
        ]);

        $this->postJson("/api/finance/approvals/{$travelRequest->id}/verify")->assertOk();

        assertActivitySent($travelRequest->user, NotificationEvent::RequestApproved, $travelRequest, ['amount' => 1000000.0]);
    });

    it('sends nothing when the budget is too small', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $travelRequest = TravelRequest::factory()->supervisorApproved()->create();

        $this->postJson("/api/finance/approvals/{$travelRequest->id}/verify")->assertUnprocessable();

        Notification::assertNothingSent();
    });

    it('tells the employee when the request is rejected at budget verification', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $travelRequest = TravelRequest::factory()->supervisorApproved()->create();

        $this->postJson("/api/finance/approvals/{$travelRequest->id}/reject", ['note' => 'Budget is reserved for Q4 events.'])
            ->assertOk();

        assertActivitySent($travelRequest->user, NotificationEvent::RequestRejected, $travelRequest, ['stage' => 'finance']);
    });

    it('tells the employee when the expense report is returned or verified', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $travelRequest = TravelRequest::factory()->approved()->departingOn(today()->subDays(6), 2)->create([
            'estimated_cost' => 5_000_000,
            'advance_requested' => 1_000_000,
            'advance_approved' => 1_000_000,
        ]);
        Disbursement::factory()->for($travelRequest)->paid()->create(['amount' => 1_000_000]);
        $expenseReport = ExpenseReport::factory()->for($travelRequest)->submitted()->create();
        Expense::factory()->for($expenseReport)->create(['amount' => 1_400_000]);

        $this->postJson("/api/finance/approvals/{$travelRequest->id}/reject", ['note' => 'The hotel receipt is unreadable.'])
            ->assertOk();
        assertActivitySent($travelRequest->user, NotificationEvent::ExpenseReportReturned, $travelRequest, [
            'note' => 'The hotel receipt is unreadable.',
        ]);

        $expenseReport->fresh()->update(['status' => 'submitted']);
        $this->postJson("/api/finance/approvals/{$travelRequest->id}/verify")->assertOk();
        assertActivitySent($travelRequest->user, NotificationEvent::ExpenseReportVerified, $travelRequest, [
            'settlement_type' => 'reimbursement',
            'amount' => 400000.0,
        ]);
    });

    it('tells the employee when a disbursement is paid', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $disbursement = Disbursement::factory()->create(['amount' => 1_250_000]);

        $this->postJson("/api/finance/disbursements/{$disbursement->id}/pay", ['method' => 'transfer'])->assertOk();

        assertActivitySent($disbursement->travelRequest->user, NotificationEvent::DisbursementPaid, $disbursement->travelRequest, [
            'disbursement_type' => 'advance',
            'amount' => 1250000.0,
            'completed' => false,
        ]);
    });
});

describe('payload', function () {
    it('stores the event, the request, and an English summary', function () {
        $travelRequest = TravelRequest::factory()->create(['request_number' => 'PD-2026-0042']);
        $actor = User::factory()->finance()->create(['name' => 'Rina Finance']);

        $data = (new TravelRequestActivity(NotificationEvent::RequestApproved, $travelRequest, $actor, ['amount' => 1_500_000]))
            ->toArray($travelRequest->user);

        expect($data)
            ->event->toBe('request_approved')
            ->travel_request_id->toBe($travelRequest->id)
            ->request_number->toBe('PD-2026-0042')
            ->actor_name->toBe('Rina Finance')
            ->message->toContain('PD-2026-0042')
            ->message->toContain('1.500.000');
    });
});
