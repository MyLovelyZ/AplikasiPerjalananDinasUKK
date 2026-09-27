<?php

namespace App\Http\Controllers\Employee;

use App\Enums\DisbursementStatus;
use App\Enums\ExpenseReportStatus;
use App\Enums\TravelRequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\DisbursementResource;
use App\Http\Resources\TravelRequestResource;
use App\Models\Disbursement;
use App\Models\ExpenseReport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * A summary of the signed-in employee's own travel requests.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $employee = $request->user();
        $today = today();

        $requestsByStatus = $employee->travelRequests()->toBase()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $currentTrip = $employee->travelRequests()
            ->where('status', TravelRequestStatus::Approved)
            ->where('departure_date', '<=', $today)
            ->where('return_date', '>=', $today)
            ->first();

        return response()->json([
            'data' => [
                'requests_by_status' => array_map(fn (TravelRequestStatus $status): array => [
                    'status' => $status->value,
                    'label' => $status->label(),
                    'total' => (int) ($requestsByStatus[$status->value] ?? 0),
                ], TravelRequestStatus::cases()),
                'this_year' => [
                    'requests' => $employee->travelRequests()->whereYear('created_at', $today->year)->count(),
                    'approved_estimated_cost' => (float) $employee->travelRequests()
                        ->whereIn('status', TravelRequestStatus::committed())
                        ->whereYear('departure_date', $today->year)
                        ->sum('estimated_cost'),
                    'verified_expenses' => (float) ExpenseReport::query()
                        ->where('status', ExpenseReportStatus::Verified)
                        ->whereHas('travelRequest', fn (Builder $query) => $query
                            ->whereBelongsTo($employee, 'user')
                            ->whereYear('departure_date', $today->year))
                        ->sum('total_approved'),
                ],
                'current_trip' => $currentTrip === null ? null : TravelRequestResource::make($currentTrip),
                'upcoming_trips' => TravelRequestResource::collection($employee->travelRequests()
                    ->where('status', TravelRequestStatus::Approved)
                    ->where('departure_date', '>', $today)
                    ->orderBy('departure_date')
                    ->limit(5)
                    ->get()),
                'expense_reports_due' => TravelRequestResource::collection($employee->travelRequests()
                    ->with('expenseReport')
                    ->where('status', TravelRequestStatus::Approved)
                    ->where('return_date', '<', $today)
                    ->whereDoesntHave('expenseReport', fn (Builder $query) => $query
                        ->whereIn('status', [ExpenseReportStatus::Submitted, ExpenseReportStatus::Verified]))
                    ->orderBy('return_date')
                    ->limit(5)
                    ->get()),
                'pending_disbursements' => DisbursementResource::collection(Disbursement::query()
                    ->with('travelRequest')
                    ->where('status', DisbursementStatus::Pending)
                    ->whereHas('travelRequest', fn (Builder $query) => $query->whereBelongsTo($employee, 'user'))
                    ->oldest('id')
                    ->get()),
                'recent_requests' => TravelRequestResource::collection($employee->travelRequests()
                    ->latest('id')
                    ->limit(5)
                    ->get()),
            ],
        ]);
    }
}
