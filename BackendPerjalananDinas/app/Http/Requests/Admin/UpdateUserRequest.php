<?php

namespace App\Http\Requests\Admin;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Validator;

class UpdateUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $user = $this->editedUser();

        return [
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user)],
            'password' => ['sometimes', 'nullable', 'string', Password::defaults()],
            'role' => ['sometimes', 'required', Rule::enum(Role::class)],
            'employee_number' => ['sometimes', 'nullable', 'string', 'max:30', Rule::unique('users', 'employee_number')->ignore($user)],
            'position' => ['sometimes', 'nullable', 'string', 'max:100'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'department_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('departments', 'id')->where('is_active', true),
            ],
            'supervisor_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::notIn([$user->id]),
                Rule::exists('users', 'id')
                    ->where('role', Role::Supervisor->value)
                    ->where('is_active', true)
                    ->whereNull('deleted_at'),
            ],
            'bank_name' => ['sometimes', 'nullable', 'string', 'max:50'],
            'bank_account_number' => ['sometimes', 'nullable', 'string', 'max:40'],
            'bank_account_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'supervisor_id.not_in' => __('A user cannot supervise themselves.'),
            'supervisor_id.exists' => __('The supervisor must be an active user with the supervisor role.'),
        ];
    }

    /**
     * Rules that compare the submitted fields with the user's current values.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $user = $this->editedUser();
                $role = $this->filled('role') ? Role::from($this->input('role')) : $user->role;
                $departmentId = $this->has('department_id') ? $this->input('department_id') : $user->department_id;
                $supervisorId = $this->has('supervisor_id') ? $this->input('supervisor_id') : $user->supervisor_id;
                $isDeactivating = $this->has('is_active') && ! $this->boolean('is_active');

                if ($role !== Role::SuperAdmin && blank($departmentId)) {
                    $validator->errors()->add('department_id', __('Every role except super admin needs a department.'));
                }

                if ($role === Role::Employee && blank($supervisorId)) {
                    $validator->errors()->add('supervisor_id', __('Employees need a supervisor to approve their travel requests.'));
                }

                if ($user->is($this->user()) && $role !== $user->role) {
                    $validator->errors()->add('role', __('You cannot change your own role.'));
                }

                if ($user->is($this->user()) && $isDeactivating) {
                    $validator->errors()->add('is_active', __('You cannot deactivate your own account.'));
                }

                $stopsSupervising = $user->role === Role::Supervisor && ($role !== Role::Supervisor || $isDeactivating);
                $subordinateCount = $stopsSupervising ? $user->subordinates()->count() : 0;

                if ($subordinateCount > 0) {
                    $validator->errors()->add('role', trans_choice(
                        'This user still supervises :count employee. Assign them to another supervisor first.|This user still supervises :count employees. Assign them to another supervisor first.',
                        $subordinateCount,
                    ));
                }
            },
        ];
    }

    private function editedUser(): User
    {
        return $this->route('user');
    }
}
