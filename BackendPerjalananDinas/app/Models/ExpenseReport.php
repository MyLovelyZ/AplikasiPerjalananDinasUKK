<?php

namespace App\Models;

use App\Enums\ExpenseReportStatus;
use App\Enums\SettlementType;
use Database\Factories\ExpenseReportFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * The post-trip accountability report (LPJ): the receipts an employee submits for reimbursement.
 */
#[Fillable([
    'travel_request_id',
    'summary',
    'status',
    'total_approved',
    'advance_amount',
    'difference',
    'settlement_type',
    'submitted_at',
    'verified_by',
    'verified_at',
    'verification_note',
])]
class ExpenseReport extends Model
{
    /** @use HasFactory<ExpenseReportFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ExpenseReportStatus::class,
            'settlement_type' => SettlementType::class,
            'total_approved' => 'decimal:2',
            'advance_amount' => 'decimal:2',
            'difference' => 'decimal:2',
            'submitted_at' => 'datetime',
            'verified_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<TravelRequest, $this>
     */
    public function travelRequest(): BelongsTo
    {
        return $this->belongsTo(TravelRequest::class);
    }

    /**
     * @return HasMany<Expense, $this>
     */
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class)->orderBy('expense_date')->orderBy('id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by')->withTrashed();
    }
}
