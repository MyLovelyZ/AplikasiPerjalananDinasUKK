<?php

use App\Enums\ApprovalStage;
use App\Models\Approval;
use App\Models\TravelRequest;
use App\Models\User;
use Illuminate\Support\Facades\Gate;

describe('view', function () {
    test('the requester can view their own request', function () {
        $travelRequest = TravelRequest::factory()->create();

        expect($travelRequest->user->can('view', $travelRequest))->toBeTrue();
    });

    test('another employee cannot view it, and the denial is a 404', function () {
        $travelRequest = TravelRequest::factory()->submitted()->create();
        $otherEmployee = User::factory()->employee()->create();

        $response = Gate::forUser($otherEmployee)->inspect('view', $travelRequest);

        expect($response->denied())->toBeTrue()->and($response->status())->toBe(404);
    });

    test("the requester's supervisor can view a submitted request", function () {
        $travelRequest = TravelRequest::factory()->submitted()->create();

        expect($travelRequest->user->supervisor->can('view', $travelRequest))->toBeTrue();
    });

    test("the requester's supervisor cannot view a draft", function () {
        $travelRequest = TravelRequest::factory()->create();

        expect($travelRequest->user->supervisor->can('view', $travelRequest))->toBeFalse();
    });

    test('another supervisor cannot view it', function () {
        $travelRequest = TravelRequest::factory()->submitted()->create();

        expect(User::factory()->supervisor()->create()->can('view', $travelRequest))->toBeFalse();
    });

    test('a supervisor who decided on the request keeps access after the employee moves team', function () {
        $travelRequest = TravelRequest::factory()->approved()->create();
        $formerSupervisor = $travelRequest->user->supervisor;
        Approval::factory()->for($travelRequest)->create([
            'approver_id' => $formerSupervisor->id,
            'stage' => ApprovalStage::Supervisor,
        ]);
        $travelRequest->user->update(['supervisor_id' => User::factory()->supervisor()->create()->id]);

        expect($formerSupervisor->can('view', $travelRequest->fresh()))->toBeTrue();
    });

    test('finance can view any submitted request but not a draft', function () {
        $finance = User::factory()->finance()->create();

        expect($finance->can('view', TravelRequest::factory()->submitted()->create()))->toBeTrue()
            ->and($finance->can('view', TravelRequest::factory()->create()))->toBeFalse();
    });

    test('a super admin cannot view travel requests', function () {
        expect(User::factory()->superAdmin()->create()->can('view', TravelRequest::factory()->submitted()->create()))->toBeFalse();
    });
});

describe('update', function () {
    test('only the requester can edit, cancel, or file expenses', function () {
        $travelRequest = TravelRequest::factory()->create();

        expect($travelRequest->user->can('update', $travelRequest))->toBeTrue()
            ->and(User::factory()->employee()->create()->can('update', $travelRequest))->toBeFalse()
            ->and($travelRequest->user->supervisor->can('update', $travelRequest))->toBeFalse();
    });
});

describe('review', function () {
    test("only the requester's current supervisor can approve or reject", function () {
        $travelRequest = TravelRequest::factory()->submitted()->create();

        expect($travelRequest->user->supervisor->can('review', $travelRequest))->toBeTrue()
            ->and(User::factory()->supervisor()->create()->can('review', $travelRequest))->toBeFalse()
            ->and($travelRequest->user->can('review', $travelRequest))->toBeFalse();
    });
});
