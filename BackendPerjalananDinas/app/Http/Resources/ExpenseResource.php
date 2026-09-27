<?php

namespace App\Http\Resources;

use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Expense
 */
class ExpenseResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'category' => $this->category,
            'category_label' => $this->category->label(),
            'expense_date' => $this->expense_date->toDateString(),
            'description' => $this->description,
            'amount' => (float) $this->amount,
            'approved_amount' => $this->approved_amount === null ? null : (float) $this->approved_amount,
            'status' => $this->status,
            'status_label' => $this->status->label(),
            'verification_note' => $this->verification_note,
            'receipt' => $this->receipt_path === null ? null : [
                'name' => $this->receipt_name,
                'mime_type' => $this->receipt_mime_type,
                'size' => $this->receipt_size,
                'url' => $this->receiptUrl(),
            ],
            'created_at' => $this->created_at,
        ];
    }
}
