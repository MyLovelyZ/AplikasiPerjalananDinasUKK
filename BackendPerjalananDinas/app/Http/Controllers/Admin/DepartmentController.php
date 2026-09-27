<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AuditAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreDepartmentRequest;
use App\Http\Requests\Admin\UpdateDepartmentRequest;
use App\Http\Resources\DepartmentResource;
use App\Models\AuditLog;
use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DepartmentController extends Controller
{
    /**
     * List every department with its number of users.
     */
    public function index(): AnonymousResourceCollection
    {
        return DepartmentResource::collection(
            Department::query()->withCount('users')->orderBy('name')->get(),
        );
    }

    /**
     * Create a department.
     */
    public function store(StoreDepartmentRequest $request): DepartmentResource
    {
        $department = DB::transaction(function () use ($request): Department {
            $department = Department::create($request->validated());

            AuditLog::record($request, AuditAction::Created, $department, __('Created the :name department.', [
                'name' => $department->name,
            ]), newValues: $request->validated());

            return $department;
        });

        return DepartmentResource::make($department->loadCount('users'))
            ->additional(['message' => __('Department created successfully.')]);
    }

    /**
     * Rename, recode, or (de)activate a department.
     */
    public function update(UpdateDepartmentRequest $request, Department $department): DepartmentResource
    {
        $department->fill($request->validated());
        [$oldValues, $newValues] = AuditLog::changesOf($department);

        DB::transaction(function () use ($request, $department, $oldValues, $newValues): void {
            $department->save();

            AuditLog::record($request, AuditAction::Updated, $department, __('Updated the :name department.', [
                'name' => $department->name,
            ]), oldValues: $oldValues, newValues: $newValues);
        });

        return DepartmentResource::make($department->loadCount('users'))
            ->additional(['message' => __('Department updated successfully.')]);
    }

    /**
     * Delete a department that nothing refers to. Departments in use can only be deactivated.
     */
    public function destroy(Request $request, Department $department): JsonResponse
    {
        if ($department->isInUse()) {
            throw ValidationException::withMessages([
                'department' => __('This department still has users, budgets, or travel requests. Deactivate it instead.'),
            ]);
        }

        DB::transaction(function () use ($request, $department): void {
            $department->delete();

            AuditLog::record($request, AuditAction::Deleted, $department, __('Deleted the :name department.', [
                'name' => $department->name,
            ]));
        });

        return response()->json(['message' => __('Department deleted successfully.')]);
    }
}
