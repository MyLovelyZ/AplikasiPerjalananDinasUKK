<?php

namespace App\Policies;

use App\Enums\ApprovalStage;
use App\Enums\Role;
use App\Models\TravelRequest;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * Who may see or act on a travel request. Denials answer 404 rather than 403,
 * so nobody can probe which request IDs exist outside their own scope.
 */
class TravelRequestPolicy
{
    /**
     * Determine whether the user can view the travel request.
     */
    public function view(User $user, TravelRequest $travelRequest): Response
    {
        $canView = match ($user->role) {
            Role::Employee => $travelRequest->user_id === $user->id,
            Role::Supervisor => $this->isOnTeamOf($user, $travelRequest) || $this->wasDecidedBy($user, $travelRequest),
            Role::Finance => $travelRequest->submitted_at !== null,
            Role::SuperAdmin => false,
        };

        return $canView ? Response::allow() : Response::denyAsNotFound();
    }

    /**
     * Determine whether the user can edit, cancel, or file expenses for the travel request.
     */
    public function update(User $user, TravelRequest $travelRequest): Response
    {
        return $travelRequest->user_id === $user->id
            ? Response::allow()
            : Response::denyAsNotFound();
    }

    /**
     * Determine whether the user can approve or reject the travel request as a supervisor.
     */
    public function review(User $user, TravelRequest $travelRequest): Response
    {
        return $travelRequest->user->supervisor_id === $user->id
            ? Response::allow()
            : Response::denyAsNotFound();
    }

    private function isOnTeamOf(User $supervisor, TravelRequest $travelRequest): bool
    {
        return $travelRequest->submitted_at !== null
            && $travelRequest->user->supervisor_id === $supervisor->id;
    }

    private function wasDecidedBy(User $supervisor, TravelRequest $travelRequest): bool
    {
        return $travelRequest->approvals()
            ->where('approver_id', $supervisor->id)
            ->where('stage', ApprovalStage::Supervisor)
            ->exists();
    }
}
