<?php

use App\Enums\AuditAction;
use App\Enums\DisbursementStatus;
use App\Enums\PaymentMethod;
use App\Enums\TravelRequestStatus;
use App\Models\Disbursement;
use App\Models\ExpenseReport;
use App\Models\TravelRequest;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

describe('index', function () {
    it('lists disbursements newest first, filtered by status', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $older = Disbursement::factory()->create();
        $newer = Disbursement::factory()->reimbursement()->create();
        Disbursement::factory()->paid()->create();

        $this->getJson('/api/finance/disbursements?status=pending')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $newer->id)
            ->assertJsonPath('data.1.id', $older->id)
            ->assertJsonPath('data.0.travel_request.requester.id', $newer->travelRequest->user_id)
            ->assertJsonCount(3, 'filters.methods');
    });
});

describe('pay', function () {
    it('records the payment and who made it', function () {
        $finance = User::factory()->finance()->create();
        Sanctum::actingAs($finance);
        $disbursement = Disbursement::factory()->create();

        $this->postJson("/api/finance/disbursements/{$disbursement->id}/pay", [
            'method' => 'transfer',
            'reference_number' => 'TRF-20260615-001',
            'paid_at' => today()->toDateString(),
        ])->assertOk()
            ->assertJsonPath('data.status', 'paid')
            ->assertJsonPath('data.processor.id', $finance->id)
            ->assertJsonPath('message', 'Disbursement recorded as paid.');

        expect($disbursement->fresh())
            ->status->toBe(DisbursementStatus::Paid)
            ->method->toBe(PaymentMethod::Transfer)
            ->reference_number->toBe('TRF-20260615-001')
            ->paid_at->not->toBeNull();
        $this->assertDatabaseHas('audit_logs', ['action' => AuditAction::Paid->value, 'subject_type' => 'disbursement']);
    });

    it('keeps the trip open after paying only the advance', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $disbursement = Disbursement::factory()->create();

        $this->postJson("/api/finance/disbursements/{$disbursement->id}/pay", ['method' => 'cash'])->assertOk();

        expect($disbursement->travelRequest->fresh()->status)->toBe(TravelRequestStatus::Approved);
    });

    it('completes the trip when its last settlement is paid', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $travelRequest = TravelRequest::factory()->approved()->create();
        ExpenseReport::factory()->for($travelRequest)->verified()->create();
        Disbursement::factory()->for($travelRequest)->paid()->create();
        $reimbursement = Disbursement::factory()->for($travelRequest)->reimbursement()->create();

        $this->postJson("/api/finance/disbursements/{$reimbursement->id}/pay", ['method' => 'transfer'])->assertOk();

        expect($travelRequest->fresh())
            ->status->toBe(TravelRequestStatus::Completed)
            ->completed_at->not->toBeNull();
    });

    it('returns 422 when the disbursement has already been paid', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $disbursement = Disbursement::factory()->paid()->create(['reference_number' => 'TRF-ORIGINAL']);

        $this->postJson("/api/finance/disbursements/{$disbursement->id}/pay", ['method' => 'transfer', 'reference_number' => 'TRF-AGAIN'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'This disbursement has already been paid.']);

        expect($disbursement->fresh()->reference_number)->toBe('TRF-ORIGINAL');
    });

    it('requires a payment method', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $disbursement = Disbursement::factory()->create();

        $this->postJson("/api/finance/disbursements/{$disbursement->id}/pay", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['method']);

        expect($disbursement->fresh()->status)->toBe(DisbursementStatus::Pending);
    });
});
