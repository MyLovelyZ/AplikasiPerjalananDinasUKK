<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Employee;
use App\Http\Controllers\Finance;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Supervisor;
use Illuminate\Support\Facades\Route;

// Authentication & profile (all roles; the mobile app is for employees only)
Route::get('/login', [AuthController::class, 'loginForm'])->name('login');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login')->name('login.store');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');
    Route::put('/profile', [ProfileController::class, 'update'])->name('profile.update');

    // Super admin: manages every account in the application
    Route::middleware('role:super_admin')->prefix('admin')->name('admin.')->group(function () {
        Route::get('/dashboard', Admin\DashboardController::class)->name('dashboard');
        Route::resource('users', Admin\UserController::class);
        Route::apiResource('departments', Admin\DepartmentController::class)->except('show');
        Route::get('/audit-logs', [Admin\AuditLogController::class, 'index'])->name('audit-logs.index');
    });

    // Employee: requests business trips and files the expense report afterwards (web and mobile)
    Route::middleware('role:employee')->prefix('employee')->name('employee.')->group(function () {
        Route::get('/dashboard', Employee\DashboardController::class)->name('dashboard');
        Route::resource('requests', Employee\TravelRequestController::class)
            ->parameters(['requests' => 'travelRequest']);
        Route::get('/requests/{travelRequest}/expenses', [Employee\ExpenseController::class, 'index'])
            ->name('requests.expenses.index');
        Route::post('/requests/{travelRequest}/expenses', [Employee\ExpenseController::class, 'store'])
            ->name('requests.expenses.store');
        Route::delete('/requests/{travelRequest}/expenses/{expense}', [Employee\ExpenseController::class, 'destroy'])
            ->scopeBindings()
            ->name('requests.expenses.destroy');
    });

    // Supervisor: approves or rejects the team's requests
    Route::middleware('role:supervisor')->prefix('supervisor')->name('supervisor.')->group(function () {
        Route::get('/dashboard', Supervisor\DashboardController::class)->name('dashboard');
        Route::get('/approvals', [Supervisor\ApprovalController::class, 'index'])->name('approvals.index');
        Route::get('/approvals/{travelRequest}', [Supervisor\ApprovalController::class, 'show'])->name('approvals.show');
        Route::post('/approvals/{travelRequest}/approve', [Supervisor\ApprovalController::class, 'approve'])->name('approvals.approve');
        Route::post('/approvals/{travelRequest}/reject', [Supervisor\ApprovalController::class, 'reject'])->name('approvals.reject');
    });

    // Finance: budgets, verification, payments, and reports
    Route::middleware('role:finance')->prefix('finance')->name('finance.')->group(function () {
        Route::get('/dashboard', Finance\DashboardController::class)->name('dashboard');
        Route::resource('budgets', Finance\BudgetController::class)->only(['index', 'create', 'store']);
        Route::get('/approvals', [Finance\ApprovalController::class, 'index'])->name('approvals.index');
        Route::get('/approvals/{travelRequest}', [Finance\ApprovalController::class, 'show'])->name('approvals.show');
        Route::post('/approvals/{travelRequest}/verify', [Finance\ApprovalController::class, 'verify'])->name('approvals.verify');
        Route::post('/approvals/{travelRequest}/reject', [Finance\ApprovalController::class, 'reject'])->name('approvals.reject');
        Route::get('/disbursements', [Finance\DisbursementController::class, 'index'])->name('disbursements.index');
        Route::post('/disbursements/{disbursement}/pay', [Finance\DisbursementController::class, 'pay'])->name('disbursements.pay');
        Route::get('/reports', [Finance\ReportController::class, 'index'])->name('reports.index');
    });
});
