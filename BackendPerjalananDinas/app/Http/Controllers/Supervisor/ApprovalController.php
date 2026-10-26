<?php

namespace App\Http\Controllers\Supervisor;

use App\Enums\ApprovalDecision;
use App\Enums\ApprovalStage;
use App\Enums\AuditAction;
use App\Enums\NotificationEvent;
use App\Enums\TravelRequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\TravelRequestResource;
use App\Models\AuditLog;
use App\Models\TravelRequest;
use App\Models\User;
use App\Notifications\TravelRequestActivity;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class ApprovalController extends Controller
{
    /**
     * The team's requests: `pending` (default, oldest first), `decided` by this supervisor, or `all`.
     * `decided` can be narrowed to the requests this supervisor approved or rejected with `decision`.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(['pending', 'decided', 'all'])],
            'decision' => ['nullable', Rule::enum(ApprovalDecision::class)],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $supervisor = $request->user();

        $query = match ($filters['status'] ?? 'pending') {
            'pending' => TravelRequest::query()->awaitingSupervisor($supervisor)->oldest('submitted_at'),
            'decided' => TravelRequest::query()
                ->whereHas('approvals', fn (Builder $query) => $query
                    ->where('approver_id', $supervisor->id)
                    ->where('stage', ApprovalStage::Supervisor)
                    ->when($filters['decision'] ?? null, fn (Builder $query, string $decision) => $query
                        ->where('decision', $decision)))
                ->latest('submitted_at'),
            'all' => TravelRequest::query()->visibleToSupervisor($supervisor)->latest('submitted_at'),
        };

        $travelRequests = $query
            ->with(['user', 'department'])
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where(
                fn (Builder $query) => $query
                    ->where('purpose', 'like', "%{$search}%")
                    ->orWhere('destination', 'like', "%{$search}%")
                    ->orWhere('request_number', 'like', "%{$search}%")
                    ->orWhereHas('user', fn (Builder $query) => $query->where('name', 'like', "%{$search}%")),
            ))
            ->orderBy('id')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return TravelRequestResource::collection($travelRequests);
    }

    /**
     * The full details of a team member's request.
     */
    public function show(TravelRequest $travelRequest): TravelRequestResource
    {
        Gate::authorize('view', $travelRequest);

        return TravelRequestResource::make($travelRequest->loadDetails())->additional([
            'can_review' => $travelRequest->status === TravelRequestStatus::Submitted
                && Gate::allows('review', $travelRequest),
        ]);
    }

    /**
     * Approve the request and forward it to finance.
     */
    public function approve(Request $request, TravelRequest $travelRequest): TravelRequestResource
    {
        Gate::authorize('review', $travelRequest);

        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($request, $travelRequest, $validated): void {
            $travelRequest->lockInStatus(TravelRequestStatus::Submitted);

            $travelRequest->approvals()->create([
                'approver_id' => $request->user()->id,
                'stage' => ApprovalStage::Supervisor,
                'decision' => ApprovalDecision::Approved,
                'note' => $validated['note'] ?? null,
            ]);

            $travelRequest->update(['status' => TravelRequestStatus::SupervisorApproved]);

            AuditLog::record($request, AuditAction::Approved, $travelRequest, __('Approved travel request :number from :name.', [
                'number' => $travelRequest->request_number,
                'name' => $travelRequest->user->name,
            ]));
        });

        $extra = ['stage' => ApprovalStage::Supervisor->value, 'note' => $validated['note'] ?? null];
        TravelRequestActivity::send($travelRequest->user, NotificationEvent::RequestSupervisorApproved, $travelRequest, $request->user(), $extra);
        TravelRequestActivity::send(User::financeTeam(), NotificationEvent::RequestAwaitingFinance, $travelRequest, $request->user(), [
            'stage' => ApprovalStage::Finance->value,
        ]);

        return TravelRequestResource::make($travelRequest->loadDetails())->additional([
            'message' => __('Travel request approved and forwarded to finance.'),
        ]);
    }

    /**
     * Reject the request. A reason is required so the employee knows what to change.
     */
    public function reject(Request $request, TravelRequest $travelRequest): TravelRequestResource
    {
        Gate::authorize('review', $travelRequest);

        $validated = $request->validate([
            'note' => ['required', 'string', 'min:5', 'max:1000'],
        ], [
            'note.required' => __('Please give the reason for rejecting this request.'),
        ]);

        DB::transaction(function () use ($request, $travelRequest, $validated): void {
            $travelRequest->lockInStatus(TravelRequestStatus::Submitted);

            $travelRequest->approvals()->create([
                'approver_id' => $request->user()->id,
                'stage' => ApprovalStage::Supervisor,
                'decision' => ApprovalDecision::Rejected,
                'note' => $validated['note'],
            ]);

            $travelRequest->update(['status' => TravelRequestStatus::Rejected]);

            AuditLog::record($request, AuditAction::Rejected, $travelRequest, __('Rejected travel request :number from :name.', [
                'number' => $travelRequest->request_number,
                'name' => $travelRequest->user->name,
            ]));
        });

        TravelRequestActivity::send($travelRequest->user, NotificationEvent::RequestRejected, $travelRequest, $request->user(), [
            'stage' => ApprovalStage::Supervisor->value,
            'note' => $validated['note'],
        ]);

        return TravelRequestResource::make($travelRequest->loadDetails())->additional([
            'message' => __('Travel request rejected.'),
        ]);
    }
}
