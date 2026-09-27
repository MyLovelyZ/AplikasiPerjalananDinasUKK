<?php

namespace App\Http\Requests\Finance;

use App\Models\Budget;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreBudgetRequest extends FormRequest
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
            'department_id' => ['required', 'integer', Rule::exists('departments', 'id')->where('is_active', true)],
            'year' => ['required', 'integer', 'between:2000,2100'],
            'month' => ['nullable', 'integer', 'between:1,12'],
            'amount' => ['required', 'numeric', 'gt:0', 'max:9999999999999'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * The unique index cannot catch a second annual budget (its month is NULL), so check it here.
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

                $alreadyExists = Budget::query()
                    ->where('department_id', $this->integer('department_id'))
                    ->where('year', $this->integer('year'))
                    ->when(
                        $this->filled('month'),
                        fn (Builder $query) => $query->where('month', $this->integer('month')),
                        fn (Builder $query) => $query->whereNull('month'),
                    )
                    ->exists();

                if ($alreadyExists) {
                    $validator->errors()->add('month', __('This department already has a budget for that period.'));
                }
            },
        ];
    }
}
