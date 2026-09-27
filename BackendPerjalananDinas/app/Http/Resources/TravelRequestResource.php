<?php

namespace App\Http\Resources;

use App\Models\TravelRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin TravelRequest
 */
class TravelRequestResource extends JsonResource
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
            'request_number' => $this->request_number,
            'purpose' => $this->purpose,
            'description' => $this->description,
            'destination' => $this->destination,
            'trip_type' => $this->trip_type,
            'trip_type_label' => $this->trip_type->label(),
            'transportation' => $this->transportation,
            'transportation_label' => $this->transportation->label(),
            'departure_date' => $this->departure_date->toDateString(),
            'return_date' => $this->return_date->toDateString(),
            'duration_days' => $this->duration_days,
            'estimated_cost' => (float) $this->estimated_cost,
            'advance_requested' => (float) $this->advance_requested,
            'advance_approved' => $this->advance_approved === null ? null : (float) $this->advance_approved,
            'status' => $this->status,
            'status_label' => $this->status->label(),
            'is_editable' => $this->status->isEditable(),
            'is_cancellable' => $this->status->isCancellable(),
            // Not whenLoaded(): it skips the callback when the loaded report is null, which is
            // exactly the case of a request waiting for budget verification.
            'finance_stage' => $this->when(
                $this->resource->relationLoaded('expenseReport'),
                fn (): ?string => $this->financeStage()?->value,
            ),
            'notes' => $this->notes,
            'submitted_at' => $this->submitted_at,
            'completed_at' => $this->completed_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'requester' => UserResource::make($this->whenLoaded('user')),
            'department' => DepartmentResource::make($this->whenLoaded('department')),
            'budget' => BudgetResource::make($this->whenLoaded('budget')),
            'cost_estimates' => CostEstimateResource::collection($this->whenLoaded('costEstimates')),
            'documents' => SupportingDocumentResource::collection($this->whenLoaded('documents')),
            'approvals' => ApprovalResource::collection($this->whenLoaded('approvals')),
            'expense_report' => ExpenseReportResource::make($this->whenLoaded('expenseReport')),
            'disbursements' => DisbursementResource::collection($this->whenLoaded('disbursements')),
        ];
    }
}
