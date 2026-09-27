<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AuditAction;
use App\Enums\Role;
use App\Enums\TravelRequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\TravelRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    /**
     * System-wide statistics for the super admin.
     */
    public function __invoke(): JsonResponse
    {
        $userCounts = User::query()->toBase()
            ->selectRaw('count(*) as total')
            ->selectRaw('sum(case when is_active = 1 then 1 else 0 end) as active')
            ->first();

        $usersByRole = User::query()->toBase()
            ->selectRaw('role, count(*) as total')
            ->groupBy('role')
            ->pluck('total', 'role');

        $requestsByStatus = TravelRequest::query()->toBase()
            ->whereYear('created_at', now()->year)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return response()->json([
            'data' => [
                'users' => [
                    'total' => (int) $userCounts->total,
                    'active' => (int) $userCounts->active,
                    'inactive' => (int) $userCounts->total - (int) $userCounts->active,
                    'by_role' => array_map(fn (Role $role): array => [
                        'role' => $role->value,
                        'label' => $role->label(),
                        'total' => (int) ($usersByRole[$role->value] ?? 0),
                    ], Role::cases()),
                ],
                'departments' => [
                    'total' => Department::query()->count(),
                    'active' => Department::query()->active()->count(),
                ],
                'travel_requests_this_year' => [
                    'total' => (int) $requestsByStatus->sum(),
                    'by_status' => array_map(fn (TravelRequestStatus $status): array => [
                        'status' => $status->value,
                        'label' => $status->label(),
                        'total' => (int) ($requestsByStatus[$status->value] ?? 0),
                    ], TravelRequestStatus::cases()),
                ],
                'logins_today' => AuditLog::query()
                    ->where('action', AuditAction::Login)
                    ->where('created_at', '>=', today())
                    ->count(),
                'recent_activities' => AuditLogResource::collection(
                    AuditLog::query()->with('user')->latest('id')->limit(10)->get(),
                ),
            ],
        ]);
    }
}
