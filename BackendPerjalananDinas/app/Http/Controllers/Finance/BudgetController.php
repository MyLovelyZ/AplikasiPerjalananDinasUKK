<?php

namespace App\Http\Controllers\Finance;

use App\Enums\AuditAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StoreBudgetRequest;
use App\Http\Resources\BudgetResource;
use App\Models\AuditLog;
use App\Models\Budget;
use App\Models\Department;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Number;

class BudgetController extends Controller
{
    /**
     * Budget allocations per department for a year, with how much of each is committed and spent.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'year' => ['nullable', 'integer', 'between:2000,2100'],
            'month' => ['nullable', 'integer', 'between:1,12'],
            'department_id' => ['nullable', 'integer'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $year = $filters['year'] ?? now()->year;

        $query = Budget::query()
            ->withUsage()
            ->where('year', $year)
            ->when($filters['month'] ?? null, fn (Builder $query, int $month) => $query->where('month', $month))
            ->when($filters['department_id'] ?? null, fn (Builder $query, int $departmentId) => $query->where('department_id', $departmentId));

        $allMatching = (clone $query)->get();
        $amount = round($allMatching->sum(fn (Budget $budget): float => (float) $budget->amount), 2);
        $committed = round($allMatching->sum(fn (Budget $budget): float => (float) $budget->committed_amount), 2);

        $budgets = $query
            ->with(['department', 'creator'])
            ->orderBy(Department::select('name')->whereColumn('departments.id', 'budgets.department_id'))
            ->orderByRaw('month is null desc')
            ->orderBy('month')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return BudgetResource::collection($budgets)->additional([
            'summary' => [
                'year' => $year,
                'amount' => $amount,
                'committed_amount' => $committed,
                'spent_amount' => round($allMatching->sum(fn (Budget $budget): float => (float) $budget->spent_amount), 2),
                'remaining_amount' => round($amount - $committed, 2),
            ],
        ]);
    }

    /**
     * The options needed to render the "allocate budget" form.
     */
    public function create(): JsonResponse
    {
        $year = now()->year;

        return response()->json([
            'data' => [
                'departments' => Department::query()->active()->orderBy('name')->get(['id', 'code', 'name']),
                'years' => [$year - 1, $year, $year + 1],
                'months' => array_map(fn (int $month): array => [
                    'value' => $month,
                    'label' => Carbon::create($year, $month)->format('F'),
                ], range(1, 12)),
            ],
        ]);
    }

    /**
     * Allocate a budget to a department for a year (no month) or for a single month.
     */
    public function store(StoreBudgetRequest $request): BudgetResource
    {
        $budget = DB::transaction(function () use ($request): Budget {
            $budget = Budget::create([
                ...$request->validated(),
                'created_by' => $request->user()->id,
            ]);

            AuditLog::record($request, AuditAction::Created, $budget, __('Allocated :amount to :department for :period.', [
                'amount' => Number::currency((float) $budget->amount, in: 'IDR', locale: 'id'),
                'department' => $budget->department->name,
                'period' => $budget->period_label,
            ]), newValues: $request->validated());

            return $budget;
        });

        return BudgetResource::make($budget->load(['department', 'creator']))->additional([
            'message' => __('Budget allocated successfully.'),
        ]);
    }
}
