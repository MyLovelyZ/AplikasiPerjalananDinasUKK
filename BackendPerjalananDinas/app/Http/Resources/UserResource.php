<?php

namespace App\Http\Resources;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * Bank details are shown only to the account owner, super admins, and finance (who pay them).
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $viewer = $request->user();
        $showsBankDetails = $viewer !== null
            && ($viewer->is($this->resource) || $viewer->hasRole(Role::SuperAdmin, Role::Finance));

        return [
            'id' => $this->id,
            'employee_number' => $this->employee_number,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'role_label' => $this->role->label(),
            'position' => $this->position,
            'phone' => $this->phone,
            'profile_photo_url' => $this->profile_photo_url,
            'department_id' => $this->department_id,
            'department' => DepartmentResource::make($this->whenLoaded('department')),
            'supervisor_id' => $this->supervisor_id,
            'supervisor' => UserSummaryResource::make($this->whenLoaded('supervisor')),
            'bank_name' => $this->when($showsBankDetails, $this->bank_name),
            'bank_account_number' => $this->when($showsBankDetails, $this->bank_account_number),
            'bank_account_name' => $this->when($showsBankDetails, $this->bank_account_name),
            'is_active' => $this->is_active,
            'last_login_at' => $this->last_login_at,
            'subordinates_count' => $this->whenCounted('subordinates'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
