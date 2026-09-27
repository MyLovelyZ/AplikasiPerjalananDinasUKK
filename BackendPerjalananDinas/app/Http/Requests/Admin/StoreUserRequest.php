<?php

namespace App\Http\Requests\Admin;

use App\Enums\Role;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
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
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', Password::defaults()],
            'role' => ['required', Rule::enum(Role::class)],
            'employee_number' => ['nullable', 'string', 'max:30', Rule::unique('users', 'employee_number')],
            'position' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:20'],
            'department_id' => [
                Rule::requiredIf(fn (): bool => $this->input('role') !== Role::SuperAdmin->value),
                'nullable',
                'integer',
                Rule::exists('departments', 'id')->where('is_active', true),
            ],
            'supervisor_id' => [
                Rule::requiredIf(fn (): bool => $this->input('role') === Role::Employee->value),
                'nullable',
                'integer',
                Rule::exists('users', 'id')
                    ->where('role', Role::Supervisor->value)
                    ->where('is_active', true)
                    ->whereNull('deleted_at'),
            ],
            'bank_name' => ['nullable', 'string', 'max:50'],
            'bank_account_number' => ['nullable', 'string', 'max:40'],
            'bank_account_name' => ['nullable', 'string', 'max:120'],
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
            'department_id.required' => __('Every role except super admin needs a department.'),
            'supervisor_id.required' => __('Employees need a supervisor to approve their travel requests.'),
            'supervisor_id.exists' => __('The supervisor must be an active user with the supervisor role.'),
        ];
    }
}
