<?php

namespace App\Models;

use App\Enums\ExpenseCategory;
use App\Enums\ExpenseReportStatus;
use App\Enums\ExpenseStatus;
use Database\Factories\ExpenseFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

#[Fillable([
    'expense_report_id',
    'category',
    'expense_date',
    'description',
    'amount',
    'approved_amount',
    'status',
    'receipt_path',
    'receipt_name',
    'receipt_mime_type',
    'receipt_size',
    'verification_note',
])]
class Expense extends Model
{
    /** @use HasFactory<ExpenseFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'category' => ExpenseCategory::class,
            'status' => ExpenseStatus::class,
            'expense_date' => 'date',
            'amount' => 'decimal:2',
            'approved_amount' => 'decimal:2',
            'receipt_size' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<ExpenseReport, $this>
     */
    public function expenseReport(): BelongsTo
    {
        return $this->belongsTo(ExpenseReport::class);
    }

    /**
     * A short-lived signed link to the private receipt file.
     */
    public function receiptUrl(): ?string
    {
        return $this->receipt_path
            ? Storage::disk('local')->temporaryUrl($this->receipt_path, now()->addMinutes(30))
            : null;
    }

    /**
     * Expenses that finance has verified, i.e. money the company has really spent.
     * Sum `approved_amount` over this scope for spending figures.
     *
     * @param  Builder<Expense>  $query
     */
    #[Scope]
    protected function realized(Builder $query): void
    {
        $query->whereHas('expenseReport', fn (Builder $query) => $query
            ->where('status', ExpenseReportStatus::Verified));
    }
}
