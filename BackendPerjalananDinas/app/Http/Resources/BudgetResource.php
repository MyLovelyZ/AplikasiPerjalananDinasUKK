<?php

namespace App\Http\Resources;

use App\Models\Budget;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Budget
 */
class BudgetResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * The usage figures appear only when the budget was loaded with the `withUsage` scope.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $hasUsage = array_key_exists('committed_amount', $this->resource->getAttributes());
        $amount = (float) $this->amount;
        $committedAmount = (float) ($this->committed_amount ?? 0);

        return [
            'id' => $this->id,
            'department_id' => $this->department_id,
            'department' => DepartmentResource::make($this->whenLoaded('department')),
            'year' => $this->year,
            'month' => $this->month,
            'period_label' => $this->period_label,
            'amount' => $amount,
            'committed_amount' => $this->when($hasUsage, $committedAmount),
            'spent_amount' => $this->when($hasUsage, fn (): float => (float) ($this->spent_amount ?? 0)),
            'remaining_amount' => $this->when($hasUsage, round($amount - $committedAmount, 2)),
            'utilization_percentage' => $this->when($hasUsage, $amount > 0 ? round($committedAmount / $amount * 100, 1) : 0.0),
            'notes' => $this->notes,
            'creator' => UserSummaryResource::make($this->whenLoaded('creator')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
