<?php

namespace App\Http\Requests\Employee\Concerns;

use App\Enums\Role;
use App\Models\TravelRequest;
use Carbon\CarbonInterface;
use Illuminate\Validation\Validator;

/**
 * Checks shared by creating and updating a travel request that is (or becomes) submitted.
 */
trait ValidatesSubmission
{
    protected function validateSubmission(
        Validator $validator,
        CarbonInterface $departureDate,
        CarbonInterface $returnDate,
        ?int $ignoreTravelRequestId = null,
    ): void {
        $supervisor = $this->user()->supervisor;

        $hasActiveSupervisor = $supervisor !== null
            && ! $supervisor->trashed()
            && $supervisor->is_active
            && $supervisor->role === Role::Supervisor;

        if (! $hasActiveSupervisor) {
            $validator->errors()->add('submit', __('You have no active supervisor to approve this request. Please contact the administrator.'));
        }

        if (TravelRequest::overlapsForUser($this->user()->id, $departureDate, $returnDate, $ignoreTravelRequestId)) {
            $validator->errors()->add('departure_date', __('You already have another active travel request on these dates.'));
        }
    }
}
