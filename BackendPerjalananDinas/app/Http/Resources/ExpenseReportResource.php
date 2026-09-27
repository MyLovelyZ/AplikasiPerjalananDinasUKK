<?php

namespace App\Http\Resources;

use App\Models\Expense;
use App\Models\ExpenseReport;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ExpenseReport
 */
class ExpenseReportResource extends JsonResource
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
            'travel_request_id' => $this->travel_request_id,
            'status' => $this->status,
            'status_label' => $this->status->label(),
            'is_editable' => $this->status->isEditable(),
            'summary' => $this->summary,
            'total_claimed' => $this->whenLoaded('expenses', fn (): float => round(
                $this->expenses->sum(fn (Expense $expense): float => (float) $expense->amount),
                2,
            )),
            'total_approved' => $this->total_approved === null ? null : (float) $this->total_approved,
            'advance_amount' => $this->advance_amount === null ? null : (float) $this->advance_amount,
            'difference' => $this->difference === null ? null : (float) $this->difference,
            'settlement_type' => $this->settlement_type,
            'settlement_type_label' => $this->settlement_type?->label(),
            'submitted_at' => $this->submitted_at,
            'verified_at' => $this->verified_at,
            'verification_note' => $this->verification_note,
            'verifier' => UserSummaryResource::make($this->whenLoaded('verifier')),
            'expenses' => ExpenseResource::collection($this->whenLoaded('expenses')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
