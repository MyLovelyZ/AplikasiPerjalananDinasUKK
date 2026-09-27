<?php

namespace App\Http\Resources;

use App\Models\Disbursement;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Disbursement
 */
class DisbursementResource extends JsonResource
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
            'type' => $this->type,
            'type_label' => $this->type->label(),
            'amount' => (float) $this->amount,
            'status' => $this->status,
            'status_label' => $this->status->label(),
            'method' => $this->method,
            'method_label' => $this->method?->label(),
            'bank_name' => $this->bank_name,
            'bank_account_number' => $this->bank_account_number,
            'bank_account_name' => $this->bank_account_name,
            'reference_number' => $this->reference_number,
            'paid_at' => $this->paid_at,
            'notes' => $this->notes,
            'processor' => UserSummaryResource::make($this->whenLoaded('processor')),
            'travel_request' => TravelRequestResource::make($this->whenLoaded('travelRequest')),
            'created_at' => $this->created_at,
        ];
    }
}
