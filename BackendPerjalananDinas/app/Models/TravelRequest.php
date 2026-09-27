<?php

namespace App\Models;

use App\Enums\ApprovalStage;
use App\Enums\DisbursementStatus;
use App\Enums\DisbursementType;
use App\Enums\ExpenseReportStatus;
use App\Enums\Transportation;
use App\Enums\TravelRequestStatus;
use App\Enums\TripType;
use Carbon\CarbonInterface;
use Database\Factories\TravelRequestFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

#[Fillable([
    'request_number',
    'user_id',
    'department_id',
    'budget_id',
    'purpose',
    'description',
    'destination',
    'trip_type',
    'transportation',
    'departure_date',
    'return_date',
    'estimated_cost',
    'advance_requested',
    'advance_approved',
    'status',
    'notes',
    'submitted_at',
    'completed_at',
])]
class TravelRequest extends Model
{
    /** @use HasFactory<TravelRequestFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'trip_type' => TripType::class,
            'transportation' => Transportation::class,
            'status' => TravelRequestStatus::class,
            'departure_date' => 'date',
            'return_date' => 'date',
            'estimated_cost' => 'decimal:2',
            'advance_requested' => 'decimal:2',
            'advance_approved' => 'decimal:2',
            'submitted_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    /**
     * The employee who requested the trip.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    /**
     * The department charged for the trip, copied from the requester when the request is created
     * so the history stays correct if the employee later moves to another department.
     *
     * @return BelongsTo<Department, $this>
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * @return BelongsTo<Budget, $this>
     */
    public function budget(): BelongsTo
    {
        return $this->belongsTo(Budget::class);
    }

    /**
     * @return HasMany<CostEstimate, $this>
     */
    public function costEstimates(): HasMany
    {
        return $this->hasMany(CostEstimate::class);
    }

    /**
     * @return HasMany<SupportingDocument, $this>
     */
    public function documents(): HasMany
    {
        return $this->hasMany(SupportingDocument::class);
    }

    /**
     * @return HasMany<Approval, $this>
     */
    public function approvals(): HasMany
    {
        return $this->hasMany(Approval::class)->orderBy('id');
    }

    /**
     * @return HasOne<ExpenseReport, $this>
     */
    public function expenseReport(): HasOne
    {
        return $this->hasOne(ExpenseReport::class);
    }

    /**
     * @return HasManyThrough<Expense, ExpenseReport, $this>
     */
    public function expenses(): HasManyThrough
    {
        return $this->hasManyThrough(Expense::class, ExpenseReport::class);
    }

    /**
     * @return HasMany<Disbursement, $this>
     */
    public function disbursements(): HasMany
    {
        return $this->hasMany(Disbursement::class)->orderBy('id');
    }

    /**
     * @return Attribute<int, never>
     */
    protected function durationDays(): Attribute
    {
        return Attribute::get(fn (): int => (int) $this->departure_date->diffInDays($this->return_date) + 1);
    }

    /**
     * Load everything the detail pages show: cost lines, documents, the approval timeline,
     * the expense report, and disbursements.
     */
    public function loadDetails(): static
    {
        return $this->load([
            'user',
            'department',
            'budget',
            'costEstimates',
            'documents',
            'approvals.approver',
            'expenseReport.expenses',
            'expenseReport.verifier',
            'disbursements.processor',
        ]);
    }

    /**
     * The finance queue this request is waiting in, or null when finance has nothing to do.
     */
    public function financeStage(): ?ApprovalStage
    {
        return match (true) {
            $this->status === TravelRequestStatus::SupervisorApproved => ApprovalStage::Finance,
            $this->status === TravelRequestStatus::Approved
                && $this->expenseReport?->status === ExpenseReportStatus::Submitted => ApprovalStage::ExpenseReport,
            default => null,
        };
    }

    /**
     * Generate the next number in the `PD-<year>-<sequence>` series.
     *
     * Call this inside a database transaction: the row lock makes concurrent requests wait
     * for each other instead of both taking the same number.
     */
    public static function nextRequestNumber(): string
    {
        $prefix = 'PD-'.now()->year.'-';

        $lastNumber = static::query()
            ->where('request_number', 'like', $prefix.'%')
            ->orderByRaw('LENGTH(request_number) DESC')
            ->orderByDesc('request_number')
            ->lockForUpdate()
            ->value('request_number');

        $sequence = $lastNumber ? ((int) Str::afterLast($lastNumber, '-')) + 1 : 1;

        return $prefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * @param  iterable<array{quantity: numeric, unit_price: numeric}>  $costs
     */
    public static function totalOfCosts(iterable $costs): float
    {
        $total = 0.0;

        foreach ($costs as $cost) {
            $total += round((float) $cost['quantity'] * (float) $cost['unit_price'], 2);
        }

        return round($total, 2);
    }

    /**
     * Whether the employee already has another active trip that overlaps the given dates.
     */
    public static function overlapsForUser(int $userId, CarbonInterface $departureDate, CarbonInterface $returnDate, ?int $ignoreId = null): bool
    {
        return static::query()
            ->where('user_id', $userId)
            ->whereIn('status', TravelRequestStatus::active())
            ->when($ignoreId, fn (Builder $query, int $ignoreId) => $query->whereKeyNot($ignoreId))
            ->where('departure_date', '<=', $returnDate->copy()->endOfDay())
            ->where('return_date', '>=', $departureDate->copy()->startOfDay())
            ->exists();
    }

    /**
     * Replace the cost breakdown and recalculate the estimated cost from it.
     *
     * @param  list<array{category: string, description?: string|null, quantity: numeric, unit_price: numeric}>  $costs
     */
    public function syncCostEstimates(array $costs): void
    {
        $this->costEstimates()->delete();

        $this->costEstimates()->createMany(array_map(fn (array $cost): array => [
            'category' => $cost['category'],
            'description' => $cost['description'] ?? null,
            'quantity' => $cost['quantity'],
            'unit_price' => $cost['unit_price'],
            'subtotal' => round((float) $cost['quantity'] * (float) $cost['unit_price'], 2),
        ], $costs));

        $this->update(['estimated_cost' => static::totalOfCosts($costs)]);
    }

    /**
     * Store uploaded supporting documents on the private disk.
     *
     * @param  list<array{type: string, file: UploadedFile}>  $documents
     */
    public function attachDocuments(array $documents): void
    {
        foreach ($documents as $document) {
            $file = $document['file'];

            $this->documents()->create([
                'type' => $document['type'],
                'original_name' => Str::limit($file->getClientOriginalName(), 150, ''),
                'path' => $file->store("travel-requests/{$this->id}", 'local'),
                'mime_type' => $file->getMimeType() ?? 'application/octet-stream',
                'size' => $file->getSize(),
            ]);
        }
    }

    /**
     * Create a pending disbursement, copying the requester's bank account at this moment.
     */
    public function createDisbursement(DisbursementType $type, float $amount): Disbursement
    {
        return $this->disbursements()->create([
            'type' => $type,
            'amount' => $amount,
            'status' => DisbursementStatus::Pending,
            'bank_name' => $this->user->bank_name,
            'bank_account_number' => $this->user->bank_account_number,
            'bank_account_name' => $this->user->bank_account_name,
        ]);
    }

    /**
     * Close the trip once its expense report is verified and every disbursement has been paid.
     */
    public function completeIfSettled(): void
    {
        $isSettled = $this->status === TravelRequestStatus::Approved
            && $this->expenseReport()->where('status', ExpenseReportStatus::Verified)->exists()
            && $this->disbursements()->where('status', DisbursementStatus::Pending)->doesntExist();

        if ($isSettled) {
            $this->update([
                'status' => TravelRequestStatus::Completed,
                'completed_at' => now(),
            ]);
        }
    }

    /**
     * Lock this request for the rest of the transaction and make sure it is still in an expected status.
     *
     * Two people can act on the same request at once (a double-clicked button, or an edit racing an
     * approval). Re-reading the row under a lock makes the second action fail instead of applying twice.
     *
     * @throws ValidationException
     */
    public function lockInStatus(TravelRequestStatus ...$allowedStatuses): void
    {
        $current = static::query()->lockForUpdate()->findOrFail($this->getKey());

        if (! in_array($current->status, $allowedStatuses, true)) {
            throw ValidationException::withMessages([
                'status' => __('This action is not available while the travel request is ":status".', [
                    'status' => $current->status->label(),
                ]),
            ]);
        }

        $this->setRawAttributes($current->getAttributes(), sync: true);
    }

    /**
     * Requests a supervisor may open: submitted requests from their team, plus any request they decided on.
     *
     * @param  Builder<TravelRequest>  $query
     */
    #[Scope]
    protected function visibleToSupervisor(Builder $query, User $supervisor): void
    {
        $query->where(fn (Builder $query) => $query
            ->where(fn (Builder $query) => $query
                ->whereNotNull('submitted_at')
                ->whereHas('user', fn (Builder $query) => $query->where('supervisor_id', $supervisor->id)))
            ->orWhereHas('approvals', fn (Builder $query) => $query
                ->where('approver_id', $supervisor->id)
                ->where('stage', ApprovalStage::Supervisor)));
    }

    /**
     * Submitted requests from the supervisor's team that still need their decision.
     *
     * @param  Builder<TravelRequest>  $query
     */
    #[Scope]
    protected function awaitingSupervisor(Builder $query, User $supervisor): void
    {
        $query
            ->where('status', TravelRequestStatus::Submitted)
            ->whereHas('user', fn (Builder $query) => $query->where('supervisor_id', $supervisor->id));
    }

    /**
     * Requests waiting in a finance queue. Without a stage, both queues are included.
     *
     * @param  Builder<TravelRequest>  $query
     */
    #[Scope]
    protected function awaitingFinance(Builder $query, ?ApprovalStage $stage = null): void
    {
        $query->where(function (Builder $query) use ($stage) {
            if ($stage !== ApprovalStage::ExpenseReport) {
                $query->orWhere('status', TravelRequestStatus::SupervisorApproved);
            }

            if ($stage !== ApprovalStage::Finance) {
                $query->orWhere(fn (Builder $query) => $query
                    ->where('status', TravelRequestStatus::Approved)
                    ->whereHas('expenseReport', fn (Builder $query) => $query
                        ->where('status', ExpenseReportStatus::Submitted)));
            }
        });
    }
}
