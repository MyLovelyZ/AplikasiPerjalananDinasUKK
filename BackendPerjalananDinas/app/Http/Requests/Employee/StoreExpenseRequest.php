<?php

namespace App\Http\Requests\Employee;

use App\Enums\ExpenseCategory;
use App\Enums\TravelRequestStatus;
use App\Models\TravelRequest;
use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreExpenseRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): Response
    {
        return Gate::inspect('update', $this->travelRequest());
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
            'summary' => ['nullable', 'string', 'max:5000'],
            'expenses' => ['nullable', 'array', 'max:30'],
            'expenses.*.category' => ['required', Rule::enum(ExpenseCategory::class)],
            'expenses.*.expense_date' => ['required', 'date', 'before_or_equal:today'],
            'expenses.*.description' => ['required', 'string', 'max:200'],
            'expenses.*.amount' => ['required', 'numeric', 'gt:0', 'max:9999999999999'],
            'expenses.*.receipt' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
            'submit' => ['boolean'],
        ];
    }

    /**
     * Rules that depend on the state of the trip and its expense report.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $travelRequest = $this->travelRequest();
                $expenseReport = $travelRequest->expenseReport;

                if ($travelRequest->status !== TravelRequestStatus::Approved) {
                    $validator->errors()->add('status', __('Expenses can only be filed for approved travel requests.'));

                    return;
                }

                if ($expenseReport && ! $expenseReport->status->isEditable()) {
                    $validator->errors()->add('status', __('The expense report is ":status" and can no longer be changed.', [
                        'status' => $expenseReport->status->label(),
                    ]));

                    return;
                }

                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                foreach ($this->input('expenses', []) as $index => $expense) {
                    $category = ExpenseCategory::from($expense['category']);

                    if ($category->requiresReceipt() && ! $this->hasFile("expenses.{$index}.receipt")) {
                        $validator->errors()->add("expenses.{$index}.receipt", __('A receipt is required for :category expenses.', [
                            'category' => Str::lower($category->label()),
                        ]));
                    }
                }

                if (! $this->boolean('submit')) {
                    return;
                }

                if ($travelRequest->departure_date->isFuture()) {
                    $validator->errors()->add('submit', __('The expense report can be submitted once the trip has started.'));
                }

                if (blank($this->input('summary')) && blank($expenseReport?->summary)) {
                    $validator->errors()->add('summary', __('Write a short summary of the trip before submitting the report.'));
                }

                $expenseCount = ($expenseReport?->expenses()->count() ?? 0) + count($this->input('expenses', []));

                if ($expenseCount === 0) {
                    $validator->errors()->add('expenses', __('Add at least one expense before submitting the report.'));
                }
            },
        ];
    }

    public function travelRequest(): TravelRequest
    {
        return $this->route('travelRequest');
    }
}
