<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Employee;
use App\Http\Controllers\Finance;
use App\Http\Controllers\NotificationController;
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

    // In-app notifications (all roles)
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unread-count');
    Route::post('/notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'read'])->name('notifications.read');

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

    // ── SPPD & Portal Compatibility Routes (Sesuai Proposal PDF PT Citra Mandiri) ──
    Route::controller(\App\Http\Controllers\SppdCompatibilityController::class)->group(function () {
        // Dashboard
        Route::get('/dashboard/ringkasan', 'dashboardRingkasan');
        Route::get('/dashboard/anggaran', 'dashboardAnggaran');

        // SPPD & Pengajuan
        Route::get('/sppd', 'daftarSppd');
        Route::post('/sppd', 'buatSppd');
        Route::get('/sppd/meta/opsi', 'opsiSppd');
        Route::get('/sppd/{id}', 'detailSppd');

        // Master Data & Aliases
        Route::get('/kategori-biaya', 'kategoriBiaya');
        Route::get('/master/kategori-biaya', 'kategoriBiaya');
        Route::get('/lokasi', 'lokasi');
        Route::get('/master/lokasi', 'lokasi');
        Route::get('/departemen', 'daftarDepartemen');
        Route::get('/master/departemen', 'daftarDepartemen');
        Route::get('/master/jabatan', 'masterJabatan');

        // Persetujuan (Approval Workflow)
        Route::get('/persetujuan/antrean', 'antreanPersetujuan');
        Route::get('/persetujuan/riwayat', 'daftarSppd'); // Riwayat persetujuan
        Route::post('/persetujuan/{id}/setujui', 'setujuiPersetujuan');
        Route::post('/persetujuan/{id}/tolak', 'tolakPersetujuan');

        // Laporan Biaya & LPJ
        Route::get('/laporan', 'daftarLaporan');
        Route::get('/laporan/{id}', 'detailLaporan');
        Route::post('/sppd/{sppdId}/laporan', 'buatLaporan');
        Route::post('/laporan/{id}/klaim', 'tambahKlaim');
        Route::delete('/laporan/{id}/klaim/{klaimId}', 'hapusKlaim');
        Route::post('/laporan/{id}/ajukan', 'ajukanLaporan');
        Route::post('/laporan/{id}/verifikasi', 'verifikasiLaporan');
        Route::post('/laporan/{id}/pencairan', 'pencairanDariLaporan');

        // Pencairan Dana (Disbursements)
        Route::get('/pencairan', 'daftarPencairan');
        Route::post('/pencairan/{id}/proses', 'prosesPencairan');
        Route::post('/sppd/{sppdId}/uang-muka', 'cairkanUangMuka');

        // Karyawan & Departemen
        Route::get('/karyawan', 'daftarKaryawan');

        // Notifikasi
        Route::get('/notifikasi', 'notifikasi');
        Route::get('/notifikasi/jumlah-belum-dibaca', 'jumlahNotifikasi');
        Route::post('/notifikasi/{id}/baca', function ($id) {
            return response()->json(['sukses' => true, 'pesan' => 'Notifikasi dibaca']);
        });
        Route::post('/notifikasi/baca-semua', function () {
            return response()->json(['sukses' => true, 'pesan' => 'Semua notifikasi dibaca']);
        });
    });
});
