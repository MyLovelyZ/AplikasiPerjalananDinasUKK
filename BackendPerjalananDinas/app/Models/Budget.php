<?php

namespace App\Models;

use App\Enums\ExpenseReportStatus;
use App\Enums\TravelRequestStatus;
use Carbon\CarbonInterface;
use Database\Factories\BudgetFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Support\Carbon;

#[Fillable(['department_id', 'year', 'month', 'amount', 'notes', 'created_by'])]
class Budget extends Model
{
    /** @use HasFactory<BudgetFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'month' => 'integer',
            'amount' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<Department, $this>
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by')->withTrashed();
    }

    /**
     * @return HasMany<TravelRequest, $this>
     */
    public function travelRequests(): HasMany
    {
        return $this->hasMany(TravelRequest::class);
    }

    /**
     * @return HasManyThrough<ExpenseReport, TravelRequest, $this>
     */
    public function expenseReports(): HasManyThrough
    {
        return $this->hasManyThrough(ExpenseReport::class, TravelRequest::class);
    }

    /**
     * Sum of the estimated costs of approved trips charged to this budget.
     */
    public function committedAmount(): float
    {
        return (float) $this->travelRequests()
            ->whereIn('status', TravelRequestStatus::committed())
            ->sum('estimated_cost');
    }

    /**
     * Load `committed_amount` (approved trips' estimates) and `spent_amount` (verified real costs).
     *
     * @param  Builder<Budget>  $query
     */
    #[Scope]
    protected function withUsage(Builder $query): void
    {
        $query
            ->withSum(['travelRequests as committed_amount' => fn (Builder $query) => $query
                ->whereIn('status', TravelRequestStatus::committed()),
            ], 'estimated_cost')
            ->withSum(['expenseReports as spent_amount' => fn (Builder $query) => $query
                ->where('expense_reports.status', ExpenseReportStatus::Verified),
            ], 'total_approved')
            ->withCasts(['committed_amount' => 'float', 'spent_amount' => 'float']);
    }

    /**
     * Budgets that cover a department on a given date, the monthly budget ahead of the annual one.
     *
     * @param  Builder<Budget>  $query
     */
    #[Scope]
    protected function applicableTo(Builder $query, int $departmentId, CarbonInterface $date): void
    {
        $query
            ->where('department_id', $departmentId)
            ->where('year', $date->year)
            ->where(fn (Builder $query) => $query->where('month', $date->month)->orWhereNull('month'))
            ->orderByRaw('month is null');
    }

    /**
     * @return Attribute<string, never>
     */
    protected function periodLabel(): Attribute
    {
        return Attribute::get(fn (): string => $this->month
            ? Carbon::create($this->year, $this->month)->format('F Y')
            : __('Year :year', ['year' => $this->year]));
    }
}
