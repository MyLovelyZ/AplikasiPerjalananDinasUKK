<?php

namespace App\Http\Controllers\Employee;

use App\Enums\AuditAction;
use App\Enums\DocumentType;
use App\Enums\ExpenseCategory;
use App\Enums\Transportation;
use App\Enums\TravelRequestStatus;
use App\Enums\TripType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\StoreTravelRequestRequest;
use App\Http\Requests\Employee\UpdateTravelRequestRequest;
use App\Http\Resources\DepartmentResource;
use App\Http\Resources\TravelRequestResource;
use App\Http\Resources\UserSummaryResource;
use App\Models\AuditLog;
use App\Models\TravelRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TravelRequestController extends Controller
{
    /**
     * The fields an employee may set directly on their travel request.
     *
     * @var list<string>
     */
    private const EDITABLE_FIELDS = [
        'purpose',
        'description',
        'destination',
        'trip_type',
        'transportation',
        'departure_date',
        'return_date',
        'notes',
    ];

    /**
     * The employee's own travel requests, newest first.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::enum(TravelRequestStatus::class)],
            'search' => ['nullable', 'string', 'max:100'],
            'year' => ['nullable', 'integer', 'between:2000,2100'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $travelRequests = $request->user()->travelRequests()
            ->with('expenseReport')
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where(
                fn (Builder $query) => $query
                    ->where('purpose', 'like', "%{$search}%")
                    ->orWhere('destination', 'like', "%{$search}%")
                    ->orWhere('request_number', 'like', "%{$search}%"),
            ))
            ->when($filters['year'] ?? null, fn (Builder $query, int $year) => $query->whereYear('departure_date', $year))
            ->latest('id')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return TravelRequestResource::collection($travelRequests);
    }

    /**
     * The options needed to render the "new travel request" form.
     */
    public function create(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->formOptions($request->user())]);
    }

    /**
     * Save a travel request as a draft, or submit it straight to the supervisor with `submit: true`.
     */
    public function store(StoreTravelRequestRequest $request): TravelRequestResource
    {
        $employee = $request->user();
        $submits = $request->boolean('submit');

        $travelRequest = DB::transaction(function () use ($request, $employee, $submits): TravelRequest {
            $travelRequest = TravelRequest::create([
                ...$request->safe()->only(self::EDITABLE_FIELDS),
                'advance_requested' => $request->validated('advance_requested') ?? 0,
                'request_number' => TravelRequest::nextRequestNumber(),
                'user_id' => $employee->id,
                'department_id' => $employee->department_id,
                'status' => $submits ? TravelRequestStatus::Submitted : TravelRequestStatus::Draft,
                'submitted_at' => $submits ? now() : null,
            ]);

            $travelRequest->syncCostEstimates($request->validated('costs'));
            $travelRequest->attachDocuments($request->validated('documents') ?? []);

            AuditLog::record(
                $request,
                $submits ? AuditAction::Submitted : AuditAction::Created,
                $travelRequest,
                $submits
                    ? __('Submitted travel request :number.', ['number' => $travelRequest->request_number])
                    : __('Saved travel request :number as a draft.', ['number' => $travelRequest->request_number]),
            );

            return $travelRequest;
        });

        return TravelRequestResource::make($travelRequest->loadDetails())->additional([
            'message' => $submits
                ? __('Travel request submitted to your supervisor.')
                : __('Travel request saved as a draft.'),
        ]);
    }

    /**
     * Show one of the employee's travel requests with its full history.
     */
    public function show(TravelRequest $travelRequest): TravelRequestResource
    {
        Gate::authorize('view', $travelRequest);

        return TravelRequestResource::make($travelRequest->loadDetails());
    }

    /**
     * The request plus the form options, while it can still be edited.
     */
    public function edit(Request $request, TravelRequest $travelRequest): JsonResponse
    {
        Gate::authorize('update', $travelRequest);

        if (! $travelRequest->status->isEditable()) {
            throw ValidationException::withMessages([
                'status' => __('This travel request can no longer be edited because it is ":status".', [
                    'status' => $travelRequest->status->label(),
                ]),
            ]);
        }

        return response()->json([
            'data' => [
                'travel_request' => TravelRequestResource::make($travelRequest->loadDetails()),
                'options' => $this->formOptions($request->user()),
            ],
        ]);
    }

    /**
     * Update a draft or a submitted request that the supervisor has not decided on yet.
     * Sending `costs` replaces the whole cost breakdown; `documents` are added to the existing ones.
     */
    public function update(UpdateTravelRequestRequest $request, TravelRequest $travelRequest): TravelRequestResource
    {
        [$submits, $removedDocumentPaths] = DB::transaction(function () use ($request, $travelRequest): array {
            $travelRequest->lockInStatus(...TravelRequestStatus::editable());

            $submits = $request->boolean('submit') && $travelRequest->status === TravelRequestStatus::Draft;

            $travelRequest->fill($request->safe()->only(self::EDITABLE_FIELDS));

            if ($request->has('advance_requested')) {
                $travelRequest->advance_requested = $request->validated('advance_requested') ?? 0;
            }

            if ($submits) {
                $travelRequest->status = TravelRequestStatus::Submitted;
                $travelRequest->submitted_at = now();
            }

            [$oldValues, $newValues] = AuditLog::changesOf($travelRequest);
            $travelRequest->save();

            if ($request->has('costs')) {
                $travelRequest->syncCostEstimates($request->validated('costs'));
            }

            $removedDocuments = $travelRequest->documents()
                ->whereKey($request->validated('remove_document_ids') ?? [])
                ->get();
            $removedDocuments->each->delete();

            $travelRequest->attachDocuments($request->validated('documents') ?? []);

            AuditLog::record(
                $request,
                $submits ? AuditAction::Submitted : AuditAction::Updated,
                $travelRequest,
                $submits
                    ? __('Submitted travel request :number.', ['number' => $travelRequest->request_number])
                    : __('Updated travel request :number.', ['number' => $travelRequest->request_number]),
                oldValues: $oldValues,
                newValues: $newValues,
            );

            return [$submits, $removedDocuments->pluck('path')->all()];
        });

        Storage::disk('local')->delete($removedDocumentPaths);

        return TravelRequestResource::make($travelRequest->loadDetails())->additional([
            'message' => $submits
                ? __('Travel request submitted to your supervisor.')
                : __('Travel request updated.'),
        ]);
    }

    /**
     * Cancel the request. Allowed until finance has approved it and committed the budget.
     */
    public function destroy(Request $request, TravelRequest $travelRequest): TravelRequestResource
    {
        Gate::authorize('update', $travelRequest);

        DB::transaction(function () use ($request, $travelRequest): void {
            $travelRequest->lockInStatus(...TravelRequestStatus::cancellable());

            $travelRequest->update(['status' => TravelRequestStatus::Cancelled]);

            AuditLog::record($request, AuditAction::Cancelled, $travelRequest, __('Cancelled travel request :number.', [
                'number' => $travelRequest->request_number,
            ]));
        });

        return TravelRequestResource::make($travelRequest->loadDetails())->additional([
            'message' => __('Travel request cancelled.'),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formOptions(User $employee): array
    {
        $employee->loadMissing(['department', 'supervisor']);

        return [
            'trip_types' => TripType::options(),
            'transportations' => Transportation::options(),
            'expense_categories' => ExpenseCategory::options(),
            'document_types' => DocumentType::options(),
            'department' => $employee->department === null ? null : DepartmentResource::make($employee->department),
            'approver' => $employee->supervisor === null ? null : UserSummaryResource::make($employee->supervisor),
            'max_document_size_kb' => 5120,
        ];
    }
}
