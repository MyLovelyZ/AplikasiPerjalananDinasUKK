<?php

namespace App\Http\Requests\Employee;

use App\Enums\DocumentType;
use App\Enums\ExpenseCategory;
use App\Enums\Transportation;
use App\Enums\TravelRequestStatus;
use App\Enums\TripType;
use App\Http\Requests\Employee\Concerns\ValidatesSubmission;
use App\Models\TravelRequest;
use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Number;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateTravelRequestRequest extends FormRequest
{
    use ValidatesSubmission;

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
            'purpose' => ['sometimes', 'required', 'string', 'max:200'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'destination' => ['sometimes', 'required', 'string', 'max:150'],
            'trip_type' => ['sometimes', 'required', Rule::enum(TripType::class)],
            'transportation' => ['sometimes', 'required', Rule::enum(Transportation::class)],
            'departure_date' => ['sometimes', 'required', 'date', 'after_or_equal:today'],
            'return_date' => ['sometimes', 'required', 'date'],
            'advance_requested' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999999'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'costs' => ['sometimes', 'required', 'array', 'min:1', 'max:20'],
            'costs.*.category' => ['required', Rule::enum(ExpenseCategory::class)],
            'costs.*.description' => ['nullable', 'string', 'max:150'],
            'costs.*.quantity' => ['required', 'numeric', 'gt:0', 'max:999999'],
            'costs.*.unit_price' => ['required', 'numeric', 'min:0', 'max:9999999999999'],
            'documents' => ['sometimes', 'array', 'max:10'],
            'documents.*.type' => ['required', Rule::enum(DocumentType::class)],
            'documents.*.file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,doc,docx', 'max:5120'],
            'remove_document_ids' => ['sometimes', 'array'],
            'remove_document_ids.*' => [
                'integer',
                Rule::exists('supporting_documents', 'id')->where('travel_request_id', $this->travelRequest()->id),
            ],
            'submit' => ['boolean'],
        ];
    }

    /**
     * Rules that compare the submitted fields with the request's current values.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $travelRequest = $this->travelRequest();

                if (! $travelRequest->status->isEditable()) {
                    $validator->errors()->add('status', __('This travel request can no longer be edited because it is ":status".', [
                        'status' => $travelRequest->status->label(),
                    ]));

                    return;
                }

                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $departureDate = $this->date('departure_date') ?? $travelRequest->departure_date;
                $returnDate = $this->date('return_date') ?? $travelRequest->return_date;

                if ($returnDate->lt($departureDate)) {
                    $validator->errors()->add('return_date', __('The return date must be on or after the departure date.'));

                    return;
                }

                $estimatedCost = $this->has('costs')
                    ? TravelRequest::totalOfCosts($this->input('costs'))
                    : (float) $travelRequest->estimated_cost;
                $advanceRequested = $this->has('advance_requested')
                    ? (float) $this->input('advance_requested')
                    : (float) $travelRequest->advance_requested;

                if ($advanceRequested > $estimatedCost) {
                    $validator->errors()->add('advance_requested', __('The advance cannot exceed the estimated cost of :total.', [
                        'total' => Number::currency($estimatedCost, in: 'IDR', locale: 'id'),
                    ]));
                }

                if ($this->boolean('submit') || $travelRequest->status === TravelRequestStatus::Submitted) {
                    $this->validateSubmission($validator, $departureDate, $returnDate, $travelRequest->id);
                }
            },
        ];
    }

    public function travelRequest(): TravelRequest
    {
        return $this->route('travelRequest');
    }
}
