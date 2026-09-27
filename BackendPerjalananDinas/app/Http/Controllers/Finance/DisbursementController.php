<?php

namespace App\Http\Controllers\Finance;

use App\Enums\AuditAction;
use App\Enums\DisbursementStatus;
use App\Enums\DisbursementType;
use App\Enums\PaymentMethod;
use App\Enums\TravelRequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\DisbursementResource;
use App\Models\AuditLog;
use App\Models\Disbursement;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Number;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class DisbursementController extends Controller
{
    /**
     * Every disbursement, newest first: advances, reimbursements, and refunds.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::enum(DisbursementStatus::class)],
            'type' => ['nullable', Rule::enum(DisbursementType::class)],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $disbursements = Disbursement::query()
            ->with(['travelRequest.user', 'processor'])
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['type'] ?? null, fn (Builder $query, string $type) => $query->where('type', $type))
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->whereHas(
                'travelRequest',
                fn (Builder $query) => $query->where(fn (Builder $query) => $query
                    ->where('request_number', 'like', "%{$search}%")
                    ->orWhereHas('user', fn (Builder $query) => $query->where('name', 'like', "%{$search}%"))),
            ))
            ->latest('id')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return DisbursementResource::collection($disbursements)->additional([
            'filters' => [
                'statuses' => DisbursementStatus::options(),
                'types' => DisbursementType::options(),
                'methods' => PaymentMethod::options(),
            ],
        ]);
    }

    /**
     * Confirm that the money has moved. For a refund this confirms the employee paid it back.
     * Paying the last open disbursement of a verified trip completes the trip.
     */
    public function pay(Request $request, Disbursement $disbursement): DisbursementResource
    {
        $validated = $request->validate([
            'method' => ['required', Rule::enum(PaymentMethod::class)],
            'reference_number' => ['nullable', 'string', 'max:60'],
            'paid_at' => ['nullable', 'date', 'before_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($request, $disbursement, $validated): void {
            // Lock the trip first (the same order as every other workflow step) so that paying
            // two of its disbursements at once cannot leave it open after both are paid.
            $travelRequest = $disbursement->travelRequest;
            $travelRequest->lockInStatus(TravelRequestStatus::Approved);

            if (Disbursement::query()->lockForUpdate()->findOrFail($disbursement->id)->status !== DisbursementStatus::Pending) {
                throw ValidationException::withMessages([
                    'status' => __('This disbursement has already been paid.'),
                ]);
            }

            $disbursement->update([
                'status' => DisbursementStatus::Paid,
                'method' => $validated['method'],
                'reference_number' => $validated['reference_number'] ?? null,
                'paid_at' => isset($validated['paid_at']) ? Carbon::parse($validated['paid_at']) : now(),
                'processed_by' => $request->user()->id,
                'notes' => $validated['notes'] ?? null,
            ]);

            $travelRequest->completeIfSettled();

            AuditLog::record($request, AuditAction::Paid, $disbursement, __('Recorded the :type of :amount for travel request :number as paid.', [
                'type' => Str::lower($disbursement->type->label()),
                'amount' => Number::currency((float) $disbursement->amount, in: 'IDR', locale: 'id'),
                'number' => $travelRequest->request_number,
            ]));
        });

        return DisbursementResource::make($disbursement->load(['travelRequest.user', 'processor']))->additional([
            'message' => __('Disbursement recorded as paid.'),
        ]);
    }
}
