<?php

namespace App\Http\Controllers\Supervisor;

use App\Enums\ApprovalDecision;
use App\Enums\ApprovalStage;
use App\Enums\TravelRequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\TravelRequestResource;
use App\Models\Approval;
use App\Models\TravelRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * The approval queue and the team's travel statistics for the signed-in supervisor.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $supervisor = $request->user();
        $today = today();

        $teamRequestsByStatus = $this->teamRequests($supervisor)->toBase()
            ->whereNotNull('submitted_at')
            ->whereYear('departure_date', $today->year)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $decisionsThisMonth = Approval::query()->toBase()
            ->where('approver_id', $supervisor->id)
            ->where('stage', ApprovalStage::Supervisor)
            ->where('created_at', '>=', $today->copy()->startOfMonth())
            ->selectRaw('decision, count(*) as total')
            ->groupBy('decision')
            ->pluck('total', 'decision');

        return response()->json([
            'data' => [
                'pending_approvals' => TravelRequest::query()->awaitingSupervisor($supervisor)->count(),
                'my_decisions_this_month' => [
                    'approved' => (int) ($decisionsThisMonth[ApprovalDecision::Approved->value] ?? 0),
                    'rejected' => (int) ($decisionsThisMonth[ApprovalDecision::Rejected->value] ?? 0),
                ],
                'team' => [
                    'members' => $supervisor->subordinates()->active()->count(),
                    'committed_cost_this_year' => (float) $this->teamRequests($supervisor)
                        ->whereIn('status', TravelRequestStatus::committed())
                        ->whereYear('departure_date', $today->year)
                        ->sum('estimated_cost'),
                    'requests_by_status_this_year' => array_map(fn (TravelRequestStatus $status): array => [
                        'status' => $status->value,
                        'label' => $status->label(),
                        'total' => (int) ($teamRequestsByStatus[$status->value] ?? 0),
                    ], TravelRequestStatus::cases()),
                    'on_trip_today' => TravelRequestResource::collection($this->teamRequests($supervisor)
                        ->with('user')
                        ->where('status', TravelRequestStatus::Approved)
                        ->where('departure_date', '<=', $today)
                        ->where('return_date', '>=', $today)
                        ->orderBy('return_date')
                        ->get()),
                ],
                'oldest_pending' => TravelRequestResource::collection(TravelRequest::query()
                    ->awaitingSupervisor($supervisor)
                    ->with('user')
                    ->oldest('submitted_at')
                    ->limit(5)
                    ->get()),
            ],
        ]);
    }

    /**
     * @return Builder<TravelRequest>
     */
    private function teamRequests(User $supervisor): Builder
    {
        return TravelRequest::query()->whereHas('user', fn (Builder $query) => $query->where('supervisor_id', $supervisor->id));
    }
}
