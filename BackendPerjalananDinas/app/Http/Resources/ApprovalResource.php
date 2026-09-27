<?php

namespace App\Http\Resources;

use App\Models\Approval;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Approval
 */
class ApprovalResource extends JsonResource
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
            'stage' => $this->stage,
            'stage_label' => $this->stage->label(),
            'decision' => $this->decision,
            'decision_label' => $this->decision->label(),
            'note' => $this->note,
            'approver' => UserSummaryResource::make($this->whenLoaded('approver')),
            'decided_at' => $this->created_at,
        ];
    }
}
