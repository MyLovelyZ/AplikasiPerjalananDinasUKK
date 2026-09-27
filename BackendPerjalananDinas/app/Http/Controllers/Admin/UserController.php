<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AuditAction;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    /**
     * List every user, with optional search and filters.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', Rule::enum(Role::class)],
            'department_id' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $users = User::query()
            ->with(['department', 'supervisor'])
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where(
                fn (Builder $query) => $query
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('employee_number', 'like', "%{$search}%"),
            ))
            ->when($filters['role'] ?? null, fn (Builder $query, string $role) => $query->where('role', $role))
            ->when($filters['department_id'] ?? null, fn (Builder $query, int $departmentId) => $query->where('department_id', $departmentId))
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('is_active', $status === 'active'))
            ->orderBy('name')
            ->orderBy('id')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return UserResource::collection($users);
    }

    /**
     * The options needed to render the "create user" form.
     */
    public function create(): JsonResponse
    {
        return response()->json(['data' => $this->formOptions()]);
    }

    /**
     * Create a user account.
     */
    public function store(StoreUserRequest $request): UserResource
    {
        $user = DB::transaction(function () use ($request): User {
            $user = User::create($request->validated());

            AuditLog::record(
                $request,
                AuditAction::Created,
                $user,
                __('Created the :role account for :name.', ['role' => $user->role->label(), 'name' => $user->name]),
                newValues: Arr::except($request->validated(), ['password']),
            );

            return $user;
        });

        return UserResource::make($user->load(['department', 'supervisor']))
            ->additional(['message' => __('User created successfully.')]);
    }

    /**
     * Show one user.
     */
    public function show(User $user): UserResource
    {
        return UserResource::make($user->load(['department', 'supervisor'])->loadCount('subordinates'));
    }

    /**
     * The user plus the options needed to render the "edit user" form.
     */
    public function edit(User $user): JsonResponse
    {
        return response()->json([
            'data' => [
                'user' => UserResource::make($user->load(['department', 'supervisor'])),
                'options' => $this->formOptions(),
            ],
        ]);
    }

    /**
     * Update a user account. Deactivating an account signs it out everywhere.
     */
    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        $attributes = $request->validated();

        if (blank($attributes['password'] ?? null)) {
            unset($attributes['password']);
        }

        $user->fill($attributes);
        $isBeingDeactivated = $user->isDirty('is_active') && ! $user->is_active;
        [$oldValues, $newValues] = AuditLog::changesOf($user);

        DB::transaction(function () use ($request, $user, $isBeingDeactivated, $oldValues, $newValues): void {
            $user->save();

            if ($isBeingDeactivated) {
                $user->tokens()->delete();
            }

            AuditLog::record(
                $request,
                AuditAction::Updated,
                $user,
                __('Updated the account of :name.', ['name' => $user->name]),
                oldValues: $oldValues,
                newValues: $request->filled('password') ? [...$newValues, 'password' => '(changed)'] : $newValues,
            );
        });

        return UserResource::make($user->load(['department', 'supervisor']))
            ->additional(['message' => __('User updated successfully.')]);
    }

    /**
     * Delete (soft delete) and deactivate a user. Their history stays intact.
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->is($request->user())) {
            throw ValidationException::withMessages(['user' => __('You cannot delete your own account.')]);
        }

        $subordinateCount = $user->subordinates()->count();

        if ($subordinateCount > 0) {
            throw ValidationException::withMessages(['user' => trans_choice(
                'This user still supervises :count employee. Assign them to another supervisor first.|This user still supervises :count employees. Assign them to another supervisor first.',
                $subordinateCount,
            )]);
        }

        DB::transaction(function () use ($request, $user): void {
            $user->tokens()->delete();
            $user->forceFill(['is_active' => false])->save();
            $user->delete();

            AuditLog::record($request, AuditAction::Deleted, $user, __('Deleted the account of :name.', ['name' => $user->name]));
        });

        return response()->json(['message' => __('User deleted successfully.')]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formOptions(): array
    {
        return [
            'roles' => Role::options(),
            'departments' => Department::query()->active()->orderBy('name')->get(['id', 'code', 'name']),
            'supervisors' => User::query()
                ->active()
                ->where('role', Role::Supervisor)
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'department_id'])
                ->map(fn (User $supervisor): array => $supervisor->only(['id', 'name', 'email', 'department_id'])),
        ];
    }
}
