<?php

namespace App\Http\Requests\Employee;

use App\Enums\DocumentType;
use App\Enums\ExpenseCategory;
use App\Enums\Transportation;
use App\Enums\TripType;
use App\Http\Requests\Employee\Concerns\ValidatesSubmission;
use App\Models\TravelRequest;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Number;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreTravelRequestRequest extends FormRequest
{
    use ValidatesSubmission;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Accept "true"/"on"/"yes" as well as 1/0, because multipart forms send every value as text.
     */
    protected function prepareForValidation(): void
    {
        $this->merge(['submit' => $this->boolean('submit')]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'purpose' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:5000'],
            'destination' => ['required', 'string', 'max:150'],
            'trip_type' => ['required', Rule::enum(TripType::class)],
            'transportation' => ['required', Rule::enum(Transportation::class)],
            'departure_date' => ['required', 'date', 'after_or_equal:today'],
            'return_date' => ['required', 'date', 'after_or_equal:departure_date'],
            'advance_requested' => ['nullable', 'numeric', 'min:0', 'max:9999999999999'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'costs' => ['required', 'array', 'min:1', 'max:20'],
            'costs.*.category' => ['required', Rule::enum(ExpenseCategory::class)],
            'costs.*.description' => ['nullable', 'string', 'max:150'],
            'costs.*.quantity' => ['required', 'numeric', 'gt:0', 'max:999999'],
            'costs.*.unit_price' => ['required', 'numeric', 'min:0', 'max:9999999999999'],
            'documents' => ['nullable', 'array', 'max:10'],
            'documents.*.type' => ['required', Rule::enum(DocumentType::class)],
            'documents.*.file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,doc,docx', 'max:5120'],
            'submit' => ['boolean'],
        ];
    }

    /**
     * Rules that depend on several fields or on the employee's other requests.
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

                if ($this->user()->department_id === null) {
                    $validator->errors()->add('department', __('Your account has no department. Please contact the administrator.'));

                    return;
                }

                $estimatedCost = TravelRequest::totalOfCosts($this->input('costs'));

                if ((float) $this->input('advance_requested', 0) > $estimatedCost) {
                    $validator->errors()->add('advance_requested', __('The advance cannot exceed the estimated cost of :total.', [
                        'total' => Number::currency($estimatedCost, in: 'IDR', locale: 'id'),
                    ]));
                }

                if ($this->boolean('submit')) {
                    $this->validateSubmission($validator, $this->date('departure_date'), $this->date('return_date'));
                }
            },
        ];
    }
}
