<?php

use App\Enums\AuditAction;
use App\Enums\TravelRequestStatus;
use App\Models\Approval;
use App\Models\SupportingDocument;
use App\Models\TravelRequest;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

describe('index', function () {
    it("lists only the employee's own requests, newest first", function () {
        $employee = User::factory()->employee()->create();
        $older = TravelRequest::factory()->for($employee, 'user')->create();
        $newer = TravelRequest::factory()->for($employee, 'user')->submitted()->create();
        TravelRequest::factory()->submitted()->create();
        Sanctum::actingAs($employee);

        $this->getJson('/api/employee/requests')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $newer->id)
            ->assertJsonPath('data.1.id', $older->id);
    });

    it('filters by status', function () {
        $employee = User::factory()->employee()->create();
        TravelRequest::factory()->for($employee, 'user')->create();
        $submitted = TravelRequest::factory()->for($employee, 'user')->submitted()->create();
        Sanctum::actingAs($employee);

        $this->getJson('/api/employee/requests?status=submitted')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $submitted->id)
            ->assertJsonPath('data.0.status_label', 'Waiting for supervisor');
    });
});

describe('create', function () {
    it('returns the form options and the supervisor who will approve', function () {
        $employee = User::factory()->employee()->create();
        Sanctum::actingAs($employee);

        $this->getJson('/api/employee/requests/create')
            ->assertOk()
            ->assertJsonCount(3, 'data.trip_types')
            ->assertJsonPath('data.expense_categories.2', ['value' => 'daily_allowance', 'label' => 'Daily allowance', 'requires_receipt' => false])
            ->assertJsonPath('data.approver.id', $employee->supervisor_id)
            ->assertJsonPath('data.department.id', $employee->department_id);
    });
});

describe('store', function () {
    it('saves a draft and calculates the estimated cost from the cost lines', function () {
        $employee = User::factory()->employee()->create();
        Sanctum::actingAs($employee);

        $response = $this->postJson('/api/employee/requests', travelRequestPayload());

        $response->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.estimated_cost', 3350000)
            ->assertJsonPath('data.duration_days', 3)
            ->assertJsonPath('data.request_number', 'PD-'.now()->year.'-0001')
            ->assertJsonPath('message', 'Travel request saved as a draft.');
        $travelRequest = TravelRequest::query()->sole();
        expect($travelRequest)
            ->user_id->toBe($employee->id)
            ->department_id->toBe($employee->department_id)
            ->submitted_at->toBeNull()
            ->and($travelRequest->costEstimates()->pluck('subtotal')->map(fn ($subtotal) => (float) $subtotal)->all())
            ->toBe([2000000.0, 1350000.0]);
        $this->assertDatabaseHas('audit_logs', ['action' => AuditAction::Created->value, 'subject_id' => $travelRequest->id]);
    });

    it('submits the request to the supervisor when submit is true', function () {
        Sanctum::actingAs(User::factory()->employee()->create());

        $this->postJson('/api/employee/requests', travelRequestPayload(['submit' => true]))
            ->assertCreated()
            ->assertJsonPath('data.status', 'submitted')
            ->assertJsonPath('message', 'Travel request submitted to your supervisor.');

        expect(TravelRequest::query()->sole()->submitted_at)->not->toBeNull();
        $this->assertDatabaseHas('audit_logs', ['action' => AuditAction::Submitted->value]);
    });

    it('continues the numbering after the highest number of the year', function () {
        TravelRequest::factory()->create(['request_number' => 'PD-'.now()->year.'-0041']);
        Sanctum::actingAs(User::factory()->employee()->create());

        $this->postJson('/api/employee/requests', travelRequestPayload())
            ->assertCreated()
            ->assertJsonPath('data.request_number', 'PD-'.now()->year.'-0042');
    });

    it('stores supporting documents on the private disk', function () {
        Storage::fake('local');
        Sanctum::actingAs(User::factory()->employee()->create());

        $response = $this->post('/api/employee/requests', travelRequestPayload([
            'documents' => [
                ['type' => 'invitation', 'file' => UploadedFile::fake()->create('invitation.pdf', 200, 'application/pdf')],
            ],
        ]), ['Accept' => 'application/json']);

        $response->assertCreated()->assertJsonPath('data.documents.0.original_name', 'invitation.pdf');
        $document = SupportingDocument::query()->sole();
        expect($document->type->value)->toBe('invitation');
        Storage::disk('local')->assertExists($document->path);
        expect($response->json('data.documents.0.url'))->toBeString();
    });

    it('requires the trip details and at least one cost line', function () {
        Sanctum::actingAs(User::factory()->employee()->create());

        $this->postJson('/api/employee/requests', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['purpose', 'destination', 'trip_type', 'transportation', 'departure_date', 'return_date', 'costs']);

        expect(TravelRequest::query()->count())->toBe(0);
    });

    it('rejects a return date before the departure date', function () {
        Sanctum::actingAs(User::factory()->employee()->create());

        $this->postJson('/api/employee/requests', travelRequestPayload([
            'departure_date' => today()->addDays(9)->toDateString(),
            'return_date' => today()->addDays(7)->toDateString(),
        ]))->assertUnprocessable()->assertJsonValidationErrors([
            'return_date' => 'The return date field must be a date after or equal to departure date.',
        ]);
    });

    it('rejects a departure date in the past', function () {
        Sanctum::actingAs(User::factory()->employee()->create());

        $this->postJson('/api/employee/requests', travelRequestPayload([
            'departure_date' => today()->subDay()->toDateString(),
        ]))->assertUnprocessable()->assertJsonValidationErrors(['departure_date']);
    });

    it('rejects an advance larger than the estimated cost', function () {
        Sanctum::actingAs(User::factory()->employee()->create());

        $response = $this->postJson('/api/employee/requests', travelRequestPayload(['advance_requested' => 5_000_000]));

        $response->assertUnprocessable()->assertJsonValidationErrorFor('advance_requested');
        expect($response->json('errors.advance_requested.0'))->toStartWith('The advance cannot exceed the estimated cost of');
    });

    it('saves a draft but refuses to submit without an active supervisor', function () {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/employee/requests', travelRequestPayload())->assertCreated();

        $this->postJson('/api/employee/requests', travelRequestPayload(['submit' => true]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['submit' => 'You have no active supervisor to approve this request. Please contact the administrator.']);
    });

    it('refuses to submit a trip that overlaps another active trip', function () {
        $employee = User::factory()->employee()->create();
        TravelRequest::factory()->for($employee, 'user')->approved()->departingOn(today()->addDays(8), 3)->create();
        Sanctum::actingAs($employee);

        $this->postJson('/api/employee/requests', travelRequestPayload(['submit' => true]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['departure_date' => 'You already have another active travel request on these dates.']);
    });

    it('ignores overlapping trips that were cancelled or rejected', function () {
        $employee = User::factory()->employee()->create();
        TravelRequest::factory()->for($employee, 'user')->cancelled()->departingOn(today()->addDays(8), 3)->create();
        TravelRequest::factory()->for($employee, 'user')->rejected()->departingOn(today()->addDays(8), 3)->create();
        Sanctum::actingAs($employee);

        $this->postJson('/api/employee/requests', travelRequestPayload(['submit' => true]))->assertCreated();
    });
});

describe('show', function () {
    it('shows the request with its cost lines and approval timeline', function () {
        $travelRequest = TravelRequest::factory()->approved()->withCostEstimates()->create();
        Approval::factory()->for($travelRequest)->create(['approver_id' => $travelRequest->user->supervisor_id]);
        Sanctum::actingAs($travelRequest->user);

        $this->getJson("/api/employee/requests/{$travelRequest->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $travelRequest->id)
            ->assertJsonCount(2, 'data.cost_estimates')
            ->assertJsonPath('data.approvals.0.stage', 'supervisor')
            ->assertJsonPath('data.approvals.0.approver.id', $travelRequest->user->supervisor_id)
            ->assertJsonPath('data.is_editable', false);
    });

    it("returns 404 for another employee's request", function () {
        $travelRequest = TravelRequest::factory()->submitted()->create();
        Sanctum::actingAs(User::factory()->employee()->create());

        $this->getJson("/api/employee/requests/{$travelRequest->id}")
            ->assertNotFound()
            ->assertExactJson(['message' => 'Resource not found.']);
    });

    it('returns the same 404 for an ID that does not exist', function () {
        Sanctum::actingAs(User::factory()->employee()->create());

        $this->getJson('/api/employee/requests/999999')
            ->assertNotFound()
            ->assertExactJson(['message' => 'Resource not found.']);
    });
});

describe('edit', function () {
    it('returns the request together with the form options', function () {
        $travelRequest = TravelRequest::factory()->submitted()->create();
        Sanctum::actingAs($travelRequest->user);

        $this->getJson("/api/employee/requests/{$travelRequest->id}/edit")
            ->assertOk()
            ->assertJsonPath('data.travel_request.id', $travelRequest->id)
            ->assertJsonCount(7, 'data.options.transportations');
    });

    it('returns 422 once the supervisor has approved the request', function () {
        $travelRequest = TravelRequest::factory()->supervisorApproved()->create();
        Sanctum::actingAs($travelRequest->user);

        $this->getJson("/api/employee/requests/{$travelRequest->id}/edit")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'This travel request can no longer be edited because it is "Waiting for finance".']);
    });
});

describe('update', function () {
    it('replaces the cost lines and recalculates the estimated cost', function () {
        $travelRequest = TravelRequest::factory()->withCostEstimates()->create(['advance_requested' => 0]);
        Sanctum::actingAs($travelRequest->user);

        $this->putJson("/api/employee/requests/{$travelRequest->id}", [
            'destination' => 'Balikpapan',
            'costs' => [['category' => 'transportation', 'quantity' => 2, 'unit_price' => 1_250_000]],
        ])->assertOk()
            ->assertJsonPath('data.destination', 'Balikpapan')
            ->assertJsonPath('data.estimated_cost', 2500000)
            ->assertJsonCount(1, 'data.cost_estimates')
            ->assertJsonPath('message', 'Travel request updated.');

        expect($travelRequest->fresh())->destination->toBe('Balikpapan')->estimated_cost->toBe('2500000.00');
    });

    it('submits a draft', function () {
        $travelRequest = TravelRequest::factory()->withCostEstimates()->create();
        Sanctum::actingAs($travelRequest->user);

        $this->putJson("/api/employee/requests/{$travelRequest->id}", ['submit' => true])
            ->assertOk()
            ->assertJsonPath('data.status', 'submitted')
            ->assertJsonPath('message', 'Travel request submitted to your supervisor.');

        expect($travelRequest->fresh()->submitted_at)->not->toBeNull();
    });

    it('removes and adds supporting documents', function () {
        Storage::fake('local');
        $travelRequest = TravelRequest::factory()->create();
        Storage::disk('local')->put('travel-requests/old.pdf', 'old');
        $oldDocument = SupportingDocument::factory()->for($travelRequest)->create(['path' => 'travel-requests/old.pdf']);
        Sanctum::actingAs($travelRequest->user);

        $this->post("/api/employee/requests/{$travelRequest->id}", [
            '_method' => 'PUT',
            'remove_document_ids' => [$oldDocument->id],
            'documents' => [['type' => 'terms_of_reference', 'file' => UploadedFile::fake()->create('tor.pdf', 50, 'application/pdf')]],
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonCount(1, 'data.documents')
            ->assertJsonPath('data.documents.0.type', 'terms_of_reference');

        $this->assertModelMissing($oldDocument);
        Storage::disk('local')->assertMissing('travel-requests/old.pdf');
    });

    it('refuses to remove a document that belongs to another request', function () {
        $travelRequest = TravelRequest::factory()->create();
        $foreignDocument = SupportingDocument::factory()->create();
        Sanctum::actingAs($travelRequest->user);

        $this->putJson("/api/employee/requests/{$travelRequest->id}", ['remove_document_ids' => [$foreignDocument->id]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['remove_document_ids.0']);

        $this->assertModelExists($foreignDocument);
    });

    it('returns 422 once the supervisor has approved the request', function () {
        $travelRequest = TravelRequest::factory()->supervisorApproved()->create(['destination' => 'Medan']);
        Sanctum::actingAs($travelRequest->user);

        $this->putJson("/api/employee/requests/{$travelRequest->id}", ['destination' => 'Jakarta'])
            ->assertUnprocessable()
            ->assertJsonValidationErrorFor('status');

        expect($travelRequest->fresh()->destination)->toBe('Medan');
    });

    it("returns 404 for another employee's request", function () {
        $travelRequest = TravelRequest::factory()->create();
        Sanctum::actingAs(User::factory()->employee()->create());

        $this->putJson("/api/employee/requests/{$travelRequest->id}", ['destination' => 'Jakarta'])->assertNotFound();
    });
});

describe('destroy', function () {
    it('cancels a request that is waiting for approval', function () {
        $travelRequest = TravelRequest::factory()->submitted()->create();
        Sanctum::actingAs($travelRequest->user);

        $this->deleteJson("/api/employee/requests/{$travelRequest->id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('message', 'Travel request cancelled.');

        expect($travelRequest->fresh()->status)->toBe(TravelRequestStatus::Cancelled);
        $this->assertDatabaseHas('audit_logs', ['action' => AuditAction::Cancelled->value, 'subject_id' => $travelRequest->id]);
    });

    it('returns 422 once finance has approved the request', function () {
        $travelRequest = TravelRequest::factory()->approved()->create();
        Sanctum::actingAs($travelRequest->user);

        $this->deleteJson("/api/employee/requests/{$travelRequest->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'This action is not available while the travel request is "Approved".']);

        expect($travelRequest->fresh()->status)->toBe(TravelRequestStatus::Approved);
    });
});
