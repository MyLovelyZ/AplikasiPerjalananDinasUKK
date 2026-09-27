<?php

namespace App\Models;

use App\Enums\DisbursementStatus;
use App\Enums\DisbursementType;
use App\Enums\PaymentMethod;
use Database\Factories\DisbursementFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A movement of money for a trip: the advance before it, and the reimbursement or refund after it.
 */
#[Fillable([
    'travel_request_id',
    'type',
    'amount',
    'status',
    'method',
    'bank_name',
    'bank_account_number',
    'bank_account_name',
    'reference_number',
    'paid_at',
    'processed_by',
    'notes',
])]
class Disbursement extends Model
{
    /** @use HasFactory<DisbursementFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => DisbursementType::class,
            'status' => DisbursementStatus::class,
            'method' => PaymentMethod::class,
            'amount' => 'decimal:2',
            'paid_at' => 'datetime',
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
     * @return BelongsTo<User, $this>
     */
    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by')->withTrashed();
    }
}
