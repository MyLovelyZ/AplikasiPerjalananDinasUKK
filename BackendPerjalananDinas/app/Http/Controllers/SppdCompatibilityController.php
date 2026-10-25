<?php

namespace App\Http\Controllers;

use App\Enums\ApprovalDecision;
use App\Enums\ApprovalStage;
use App\Enums\DisbursementStatus;
use App\Enums\DisbursementType;
use App\Enums\PaymentMethod;
use App\Enums\Role;
use App\Enums\Transportation;
use App\Enums\TravelRequestStatus;
use App\Enums\TripType;
use App\Models\Approval;
use App\Models\AuditLog;
use App\Models\Budget;
use App\Models\CostEstimate;
use App\Models\Department;
use App\Models\Disbursement;
use App\Models\Expense;
use App\Models\ExpenseReport;
use App\Models\TravelRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SppdCompatibilityController extends Controller
{
    /**
     * Map internal TravelRequest status to frontend StatusSppd.
     */
    private function mapStatus(TravelRequestStatus $status): string
    {
        return match ($status) {
            TravelRequestStatus::Draft => 'DRAFT',
            TravelRequestStatus::Submitted => 'MENUNGGU_PERSETUJUAN',
            TravelRequestStatus::SupervisorApproved => 'MENUNGGU_PERSETUJUAN',
            TravelRequestStatus::Approved => 'DISETUJUI',
            TravelRequestStatus::Rejected => 'DITOLAK',
            TravelRequestStatus::Cancelled => 'DIBATALKAN',
            TravelRequestStatus::Completed => 'SELESAI',
        };
    }

    /**
     * Format a TravelRequest model into the Sppd object shape expected by frontend.
     */
    private function formatSppd(TravelRequest $tr): array
    {
        $tr->loadMissing(['user', 'department', 'costEstimates', 'approvals.approver', 'expenseReport.expenses', 'disbursements']);
        $user = $tr->user;
        $dept = $tr->department;
        $days = $tr->departure_date && $tr->return_date
            ? max(1, $tr->departure_date->diffInDays($tr->return_date) + 1)
            : 1;

        $rincian = $tr->costEstimates->map(function ($ce, $idx) {
            return [
                'id' => $ce->id,
                'kategori_biaya_id' => $idx + 1,
                'deskripsi' => $ce->description,
                'kuantitas' => '1',
                'satuan' => 'paket',
                'harga_satuan' => (string) $ce->amount,
                'subtotal' => (string) $ce->amount,
                'melebihi_plafon' => false,
                'kategoriBiaya' => [
                    'id' => $idx + 1,
                    'kode' => 'KAT-' . ($idx + 1),
                    'nama' => $ce->category?->label() ?? 'Biaya',
                    'satuan' => 'paket',
                    'wajib_bukti' => true,
                    'status' => 'AKTIF',
                ],
            ];
        })->values()->all();

        $persetujuan = $tr->approvals->map(function ($appr, $idx) {
            return [
                'id' => $appr->id,
                'urutan' => $idx + 1,
                'penyetuju_id' => $appr->approver_id,
                'status' => match ($appr->decision) {
                    ApprovalDecision::Approved => 'DISETUJUI',
                    ApprovalDecision::Rejected => 'DITOLAK',
                    default => 'MENUNGGU',
                },
                'catatan' => $appr->note,
                'tanggal_ditugaskan' => $appr->created_at?->toIso8601String() ?? now()->toIso8601String(),
                'tanggal_aksi' => $appr->updated_at?->toIso8601String(),
                'penyetuju' => $appr->approver ? [
                    'id' => $appr->approver->id,
                    'nama_lengkap' => $appr->approver->name,
                ] : null,
                'tahap' => [
                    'id' => $idx + 1,
                    'nama_tahap' => $appr->stage?->label() ?? 'Persetujuan',
                    'tipe_penyetuju' => $appr->stage?->value ?? 'supervisor',
                ],
            ];
        })->values()->all();

        $laporan = null;
        if ($tr->expenseReport) {
            $er = $tr->expenseReport;
            $klaim = $er->expenses->map(function ($exp) {
                return [
                    'id' => $exp->id,
                    'kategori_biaya_id' => 1,
                    'tanggal_transaksi' => $exp->expense_date?->toDateString() ?? now()->toDateString(),
                    'deskripsi' => $exp->description,
                    'jumlah_diajukan' => (string) $exp->amount,
                    'jumlah_disetujui' => (string) ($exp->approved_amount ?? $exp->amount),
                    'status' => $exp->approved_amount !== null ? 'DISETUJUI' : 'DIAJUKAN',
                    'melebihi_plafon' => false,
                    'catatan_verifikasi' => $exp->notes,
                    'kategoriBiaya' => [
                        'id' => 1,
                        'kode' => 'EXP',
                        'nama' => $exp->category?->label() ?? 'Pengeluaran',
                        'satuan' => 'item',
                        'wajib_bukti' => true,
                        'status' => 'AKTIF',
                    ],
                    'bukti' => $exp->receipt_path ? [
                        [
                            'id' => $exp->id,
                            'nama_file' => basename($exp->receipt_path),
                            'path_file' => $exp->receipt_path,
                            'tipe_mime' => 'image/png',
                            'ukuran_byte' => 1024,
                            'status_verifikasi' => 'VALID',
                        ],
                    ] : [],
                ];
            })->values()->all();

            $laporan = [
                'id' => $er->id,
                'perjalanan_id' => $tr->id,
                'nomor_laporan' => 'LPJ-' . $tr->request_number,
                'tanggal_lapor' => $er->submitted_at?->toDateString() ?? now()->toDateString(),
                'ringkasan_kegiatan' => $er->summary ?? 'Laporan kegiatan perjalanan dinas',
                'hasil_capaian' => 'Selesai dilaksanakan sesuai agenda',
                'total_realisasi' => (string) ($er->total_approved ?? $tr->estimated_cost),
                'total_uang_muka' => (string) ($er->advance_amount ?? $tr->advance_approved ?? 0),
                'selisih' => (string) ($er->difference ?? 0),
                'status' => match ($er->status) {
                    \App\Enums\ExpenseReportStatus::Verified => 'DIVERIFIKASI',
                    \App\Enums\ExpenseReportStatus::Returned => 'REVISI',
                    \App\Enums\ExpenseReportStatus::Draft => 'DRAFT',
                    default => 'DIAJUKAN',
                },
                'klaimBiaya' => $klaim,
            ];
        }

        $pencairan = $tr->disbursements->map(function ($disb) {
            return [
                'id' => $disb->id,
                'nomor_pencairan' => 'DISB-' . str_pad($disb->id, 5, '0', STR_PAD_LEFT),
                'perjalanan_id' => $disb->travel_request_id,
                'jenis' => $disb->type === DisbursementType::Advance ? 'UANG_MUKA' : 'REIMBURSEMENT',
                'tahap' => 'PENCAIRAN',
                'nominal' => (string) $disb->amount,
                'metode_pembayaran' => $disb->method?->value ?? 'TRANSFER_BANK',
                'nomor_referensi' => $disb->reference_number ?? '-',
                'tanggal_bayar' => $disb->paid_at?->toIso8601String(),
                'status' => $disb->status === DisbursementStatus::Paid ? 'DICAIRKAN' : 'MENUNGGU_PEMBAYARAN',
                'catatan' => $disb->notes,
            ];
        })->values()->all();

        return [
            'id' => $tr->id,
            'nomor_sppd' => $tr->request_number,
            'karyawan_id' => $tr->user_id,
            'departemen_id' => $tr->department_id,
            'lokasi_tujuan_id' => null,
            'tujuan_lainnya' => $tr->destination,
            'jenis_perjalanan' => match ($tr->trip_type) {
                TripType::Domestic => 'LUAR_KOTA',
                TripType::International => 'LUAR_NEGERI',
                default => 'DALAM_KOTA',
            },
            'keperluan' => $tr->purpose,
            'agenda' => $tr->description,
            'tanggal_berangkat' => $tr->departure_date?->toDateString() ?? now()->toDateString(),
            'tanggal_kembali' => $tr->return_date?->toDateString() ?? now()->toDateString(),
            'jumlah_hari' => $days,
            'moda_transportasi' => $tr->transportation?->label() ?? 'Pesawat',
            'estimasi_biaya' => (string) $tr->estimated_cost,
            'uang_muka_diminta' => (string) $tr->advance_requested,
            'uang_muka_disetujui' => (string) ($tr->advance_approved ?? $tr->advance_requested),
            'status' => $this->mapStatus($tr->status),
            'tahap_saat_ini' => 1,
            'catatan_pemohon' => $tr->notes,
            'tanggal_pengajuan' => $tr->submitted_at?->toIso8601String() ?? $tr->created_at?->toIso8601String(),
            'dibuat_pada' => $tr->created_at?->toIso8601String() ?? now()->toIso8601String(),
            'pemohon' => [
                'id' => $user?->id ?? 1,
                'nip' => $user?->employee_number ?? 'EMP-001',
                'nama_lengkap' => $user?->name ?? 'Pegawai',
                'email' => $user?->email ?? '',
            ],
            'karyawan' => [
                'id' => $user?->id ?? 1,
                'nip' => $user?->employee_number ?? 'EMP-001',
                'nama_lengkap' => $user?->name ?? 'Pegawai',
                'email' => $user?->email ?? '',
            ],
            'departemen' => [
                'id' => $dept?->id ?? 1,
                'kode' => $dept?->code ?? 'GEN',
                'nama' => $dept?->name ?? 'Umum',
                'status' => 'AKTIF',
            ],
            'lokasiTujuan' => [
                'id' => 1,
                'nama_kota' => $tr->destination,
                'provinsi' => null,
                'negara' => 'Indonesia',
                'zona' => 'LUAR_KOTA',
                'status' => 'AKTIF',
            ],
            'rincianBiaya' => $rincian,
            'persetujuan' => $persetujuan,
            'laporan' => $laporan,
            'pencairan' => $pencairan,
        ];
    }

    /**
     * GET /api/dashboard/ringkasan
     */
    public function dashboardRingkasan(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = TravelRequest::with(['user', 'department', 'costEstimates', 'approvals.approver', 'expenseReport.expenses', 'disbursements'])
            ->latest('id');

        if ($user && $user->role === Role::Employee) {
            $query->where('user_id', $user->id);
        } elseif ($user && $user->role === Role::Supervisor) {
            $query->where(function ($q) use ($user) {
                $q->where('department_id', $user->department_id)
                  ->orWhereHas('user', fn ($uq) => $uq->where('supervisor_id', $user->id));
            });
        }

        $allTrips = $query->get();

        $menunggu = $allTrips->whereIn('status', [TravelRequestStatus::Submitted, TravelRequestStatus::SupervisorApproved])->count();
        $disetujui = $allTrips->where('status', TravelRequestStatus::Approved)->count();
        $selesai = $allTrips->where('status', TravelRequestStatus::Completed)->count();
        $ditolak = $allTrips->where('status', TravelRequestStatus::Rejected)->count();
        $diproses = $allTrips->whereIn('status', [TravelRequestStatus::Approved, TravelRequestStatus::Submitted])->count();

        $tugasPersetujuan = 0;
        if ($user && in_array($user->role, [Role::Supervisor, Role::SuperAdmin])) {
            $tugasPersetujuan = TravelRequest::whereIn('status', [TravelRequestStatus::Submitted, TravelRequestStatus::SupervisorApproved])
                ->when($user->role === Role::Supervisor, function ($q) use ($user) {
                    $q->where(function ($sq) use ($user) {
                        $sq->where('department_id', $user->department_id)
                           ->orWhereHas('user', fn ($uq) => $uq->where('supervisor_id', $user->id));
                    });
                })
                ->count();
        }

        $perjalananTerkini = $allTrips->take(6)->map(fn ($tr) => $this->formatSppd($tr))->values()->all();

        $totalBiaya = (float) $allTrips->sum('estimated_cost');
        $totalBudget = (float) Budget::sum('amount');
        $persentase = $totalBudget > 0 ? min(100, round(($totalBiaya / $totalBudget) * 100)) : 45;

        return response()->json([
            'sukses' => true,
            'pesan' => 'Ringkasan dashboard berhasil dimuat',
            'data' => [
                'kartu' => [
                    'menunggu' => $menunggu,
                    'disetujui' => $disetujui,
                    'diproses' => $diproses,
                    'selesai' => $selesai,
                    'ditolak' => $ditolak,
                ],
                'tugas_persetujuan_saya' => $tugasPersetujuan,
                'perjalanan_terkini' => $perjalananTerkini,
                'persentase_anggaran' => $persentase,
                'total_biaya_tahun_ini' => $totalBiaya,
            ],
        ]);
    }

    /**
     * GET /api/dashboard/anggaran
     */
    public function dashboardAnggaran(): JsonResponse
    {
        $depts = Department::with('budgets', 'travelRequests')->get();

        $data = $depts->map(function ($dept) {
            $pagu = (float) $dept->budgets->sum('amount');
            $realisasi = (float) $dept->travelRequests->sum('estimated_cost');
            if ($pagu <= 0) $pagu = max(50000000, $realisasi * 1.5);
            $persentase = $pagu > 0 ? round(($realisasi / $pagu) * 100, 1) : 0;

            return [
                'id' => $dept->id,
                'departemen_id' => $dept->id,
                'nama_departemen' => $dept->name,
                'kode_departemen' => $dept->code,
                'pagu_anggaran' => (string) $pagu,
                'terpakai' => (string) $realisasi,
                'sisa' => (string) max(0, $pagu - $realisasi),
                'persentase' => $persentase,
            ];
        })->values()->all();

        return response()->json([
            'sukses' => true,
            'pesan' => 'Data serapan anggaran berhasil dimuat',
            'data' => $data,
        ]);
    }

    /**
     * GET /api/sppd
     */
    public function daftarSppd(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = TravelRequest::with(['user', 'department', 'costEstimates', 'approvals.approver', 'expenseReport.expenses', 'disbursements'])
            ->latest('id');

        if ($user && $user->role === Role::Employee) {
            $query->where('user_id', $user->id);
        } elseif ($user && $user->role === Role::Supervisor) {
            $query->where(function ($q) use ($user) {
                $q->where('department_id', $user->department_id)
                  ->orWhereHas('user', fn ($uq) => $uq->where('supervisor_id', $user->id));
            });
        }

        if ($request->has('cari') && $request->cari) {
            $cari = $request->cari;
            $query->where(function ($q) use ($cari) {
                $q->where('purpose', 'like', "%{$cari}%")
                  ->orWhere('destination', 'like', "%{$cari}%")
                  ->orWhere('request_number', 'like', "%{$cari}%");
            });
        }

        $items = $query->paginate($request->input('per_halaman', 15));
        $formatted = collect($items->items())->map(fn ($tr) => $this->formatSppd($tr))->values()->all();

        return response()->json([
            'sukses' => true,
            'pesan' => 'Daftar SPPD berhasil dimuat',
            'data' => $formatted,
            'halaman' => [
                'halaman_saat_ini' => $items->currentPage(),
                'per_halaman' => $items->perPage(),
                'total_data' => $items->total(),
                'total_halaman' => $items->lastPage(),
            ],
        ]);
    }

    /**
     * GET /api/sppd/{id}
     */
    public function detailSppd($id): JsonResponse
    {
        $tr = TravelRequest::with(['user', 'department', 'costEstimates', 'approvals.approver', 'expenseReport.expenses', 'disbursements'])
            ->findOrFail($id);

        return response()->json([
            'sukses' => true,
            'pesan' => 'Detail SPPD berhasil dimuat',
            'data' => $this->formatSppd($tr),
        ]);
    }

    /**
     * POST /api/sppd
     */
    public function buatSppd(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'keperluan' => 'required|string',
            'tanggal_berangkat' => 'required|date',
            'tanggal_kembali' => 'required|date|after_or_equal:tanggal_berangkat',
            'tujuan_lainnya' => 'nullable|string',
            'moda_transportasi' => 'nullable|string',
            'uang_muka_diminta' => 'nullable|numeric',
            'catatan_pemohon' => 'nullable|string',
            'rincian_biaya' => 'nullable|array',
        ]);

        $destination = $request->input('tujuan_lainnya') ?: 'Jakarta';
        $totalCost = 0;
        if (!empty($validated['rincian_biaya'])) {
            foreach ($validated['rincian_biaya'] as $item) {
                $qty = (float) ($item['kuantitas'] ?? 1);
                $price = (float) ($item['harga_satuan'] ?? 0);
                $totalCost += ($qty * $price);
            }
        }
        if ($totalCost <= 0) {
            $totalCost = (float) ($request->input('uang_muka_diminta') ?: 1500000);
        }

        $trans = match (strtolower($request->input('moda_transportasi', ''))) {
            'kereta', 'kereta api' => Transportation::Train,
            'mobil', 'darat' => Transportation::Car,
            default => Transportation::Flight,
        };

        $tr = DB::transaction(function () use ($user, $validated, $destination, $totalCost, $trans, $request) {
            $count = TravelRequest::count() + 1;
            $reqNum = 'SPPD-' . date('Y') . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

            $tr = TravelRequest::create([
                'request_number' => $reqNum,
                'user_id' => $user->id,
                'department_id' => $user->department_id ?? Department::first()?->id ?? 1,
                'purpose' => $validated['keperluan'],
                'description' => $request->input('agenda') ?: $validated['keperluan'],
                'destination' => $destination,
                'trip_type' => TripType::Domestic,
                'transportation' => $trans,
                'departure_date' => $validated['tanggal_berangkat'],
                'return_date' => $validated['tanggal_kembali'],
                'estimated_cost' => $totalCost,
                'advance_requested' => $request->input('uang_muka_diminta') ?: 0,
                'status' => TravelRequestStatus::Submitted,
                'submitted_at' => now(),
                'notes' => $validated['catatan_pemohon'] ?? null,
            ]);

            // Create initial supervisor approval assignment
            Approval::create([
                'travel_request_id' => $tr->id,
                'approver_id' => $user->supervisor_id ?? User::where('role', Role::Supervisor)->first()?->id ?? $user->id,
                'stage' => ApprovalStage::Supervisor,
                'decision' => ApprovalDecision::Pending,
                'note' => null,
            ]);

            AuditLog::record($request, \App\Enums\AuditAction::Create, $tr, "SPPD {$reqNum} diajukan oleh {$user->name}.");

            return $tr;
        });

        return response()->json([
            'sukses' => true,
            'pesan' => 'SPPD berhasil diajukan',
            'data' => $this->formatSppd($tr->fresh(['user', 'department', 'costEstimates', 'approvals'])),
        ], 201);
    }

    /**
     * GET /api/sppd/meta/opsi
     */
    public function opsiSppd(): JsonResponse
    {
        return response()->json([
            'sukses' => true,
            'pesan' => 'Opsi berhasil dimuat',
            'data' => [
                'jenis_perjalanan' => ['DALAM_KOTA', 'LUAR_KOTA', 'LUAR_NEGERI'],
                'moda_transportasi' => ['Pesawat', 'Kereta Api', 'Mobil Dinas / Rental', 'Bus / Travel'],
                'kategori_biaya' => $this->listKategoriBiaya(),
                'lokasi' => $this->listLokasi(),
            ],
        ]);
    }

    /**
     * GET /api/kategori-biaya
     */
    public function kategoriBiaya(): JsonResponse
    {
        return response()->json([
            'sukses' => true,
            'pesan' => 'Daftar kategori biaya berhasil dimuat',
            'data' => $this->listKategoriBiaya(),
        ]);
    }

    private function listKategoriBiaya(): array
    {
        return [
            ['id' => 1, 'kode' => 'TRANS', 'nama' => 'Tiket Transportasi', 'satuan' => 'tiket', 'wajib_bukti' => true, 'status' => 'AKTIF'],
            ['id' => 2, 'kode' => 'HOTEL', 'nama' => 'Akomodasi / Penginapan', 'satuan' => 'malam', 'wajib_bukti' => true, 'status' => 'AKTIF'],
            ['id' => 3, 'kode' => 'HARIAN', 'nama' => 'Uang Saku & Harian', 'satuan' => 'hari', 'wajib_bukti' => false, 'status' => 'AKTIF'],
            ['id' => 4, 'kode' => 'KONSUM', 'nama' => 'Konsumsi & Jamuan', 'satuan' => 'hari', 'wajib_bukti' => true, 'status' => 'AKTIF'],
            ['id' => 5, 'kode' => 'LOKAL', 'nama' => 'Transportasi Lokal (Taksi/Grab)', 'satuan' => 'trip', 'wajib_bukti' => true, 'status' => 'AKTIF'],
            ['id' => 6, 'kode' => 'LAIN', 'nama' => 'Biaya Lain-lain / Tol / Parkir', 'satuan' => 'paket', 'wajib_bukti' => true, 'status' => 'AKTIF'],
        ];
    }

    /**
     * GET /api/lokasi
     */
    public function lokasi(): JsonResponse
    {
        return response()->json([
            'sukses' => true,
            'pesan' => 'Daftar lokasi tujuan berhasil dimuat',
            'data' => $this->listLokasi(),
        ]);
    }

    private function listLokasi(): array
    {
        return [
            ['id' => 1, 'nama_kota' => 'Jakarta', 'provinsi' => 'DKI Jakarta', 'negara' => 'Indonesia', 'zona' => 'LUAR_KOTA', 'status' => 'AKTIF'],
            ['id' => 2, 'nama_kota' => 'Surabaya', 'provinsi' => 'Jawa Timur', 'negara' => 'Indonesia', 'zona' => 'LUAR_KOTA', 'status' => 'AKTIF'],
            ['id' => 3, 'nama_kota' => 'Bandung', 'provinsi' => 'Jawa Barat', 'negara' => 'Indonesia', 'zona' => 'LUAR_KOTA', 'status' => 'AKTIF'],
            ['id' => 4, 'nama_kota' => 'Medan', 'provinsi' => 'Sumatera Utara', 'negara' => 'Indonesia', 'zona' => 'LUAR_KOTA', 'status' => 'AKTIF'],
            ['id' => 5, 'nama_kota' => 'Denpasar (Bali)', 'provinsi' => 'Bali', 'negara' => 'Indonesia', 'zona' => 'LUAR_KOTA', 'status' => 'AKTIF'],
            ['id' => 6, 'nama_kota' => 'Yogyakarta', 'provinsi' => 'DI Yogyakarta', 'negara' => 'Indonesia', 'zona' => 'LUAR_KOTA', 'status' => 'AKTIF'],
            ['id' => 7, 'nama_kota' => 'Semarang', 'provinsi' => 'Jawa Tengah', 'negara' => 'Indonesia', 'zona' => 'LUAR_KOTA', 'status' => 'AKTIF'],
            ['id' => 8, 'nama_kota' => 'Makassar', 'provinsi' => 'Sulawesi Selatan', 'negara' => 'Indonesia', 'zona' => 'LUAR_KOTA', 'status' => 'AKTIF'],
            ['id' => 9, 'nama_kota' => 'Singapura', 'provinsi' => null, 'negara' => 'Singapura', 'zona' => 'LUAR_NEGERI', 'status' => 'AKTIF'],
        ];
    }

    /**
     * GET /api/persetujuan/antrean
     */
    public function antreanPersetujuan(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = TravelRequest::with(['user', 'department', 'costEstimates', 'approvals.approver', 'expenseReport.expenses', 'disbursements'])
            ->whereIn('status', [TravelRequestStatus::Submitted, TravelRequestStatus::SupervisorApproved])
            ->latest('id');

        if ($user && $user->role === Role::Supervisor) {
            $query->where(function ($q) use ($user) {
                $q->where('department_id', $user->department_id)
                  ->orWhereHas('user', fn ($uq) => $uq->where('supervisor_id', $user->id));
            });
        }

        $requests = $query->get();

        $tugas = $requests->map(function ($tr, $idx) {
            $formatted = $this->formatSppd($tr);
            return [
                'id' => $tr->id,
                'urutan' => 1,
                'penyetuju_id' => $tr->user->supervisor_id ?? 1,
                'status' => 'MENUNGGU',
                'catatan' => null,
                'tanggal_ditugaskan' => $tr->submitted_at?->toIso8601String() ?? now()->toIso8601String(),
                'tanggal_aksi' => null,
                'perjalanan' => $formatted,
                'ada_pelanggaran_plafon' => false,
                'tahap' => [
                    'id' => 1,
                    'nama_tahap' => 'Persetujuan Atasan Langsung',
                    'tipe_penyetuju' => 'supervisor',
                ],
            ];
        })->values()->all();

        return response()->json([
            'sukses' => true,
            'pesan' => 'Antrean persetujuan berhasil dimuat',
            'data' => $tugas,
            'halaman' => [
                'halaman_saat_ini' => 1,
                'per_halaman' => 50,
                'total_data' => count($tugas),
                'total_halaman' => 1,
            ],
        ]);
    }

    /**
     * POST /api/persetujuan/{id}/setujui
     */
    public function setujuiPersetujuan(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $tr = TravelRequest::findOrFail($id);

        DB::transaction(function () use ($tr, $user, $request) {
            $tr->update([
                'status' => TravelRequestStatus::Approved,
                'advance_approved' => $tr->advance_requested,
            ]);

            Approval::updateOrCreate(
                ['travel_request_id' => $tr->id, 'stage' => ApprovalStage::Supervisor],
                [
                    'approver_id' => $user->id,
                    'decision' => ApprovalDecision::Approved,
                    'note' => $request->input('catatan') ?: 'Disetujui',
                ]
            );

            // If advance was requested, create a pending disbursement automatically!
            if ($tr->advance_requested > 0) {
                Disbursement::firstOrCreate(
                    [
                        'travel_request_id' => $tr->id,
                        'type' => DisbursementType::Advance,
                    ],
                    [
                        'amount' => $tr->advance_requested,
                        'status' => DisbursementStatus::Pending,
                        'method' => PaymentMethod::BankTransfer,
                        'bank_name' => $tr->user?->bank_name ?? 'BCA',
                        'bank_account_number' => $tr->user?->bank_account_number ?? '1234567890',
                        'bank_account_name' => $tr->user?->name ?? 'Pegawai',
                    ]
                );
            }

            AuditLog::record($request, \App\Enums\AuditAction::Approve, $tr, "SPPD {$tr->request_number} disetujui oleh {$user->name}.");
        });

        return response()->json([
            'sukses' => true,
            'pesan' => 'Pengajuan SPPD berhasil disetujui',
            'data' => $this->formatSppd($tr->fresh(['user', 'department', 'approvals', 'disbursements'])),
        ]);
    }

    /**
     * POST /api/persetujuan/{id}/tolak
     */
    public function tolakPersetujuan(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $tr = TravelRequest::findOrFail($id);

        DB::transaction(function () use ($tr, $user, $request) {
            $tr->update(['status' => TravelRequestStatus::Rejected]);

            Approval::updateOrCreate(
                ['travel_request_id' => $tr->id, 'stage' => ApprovalStage::Supervisor],
                [
                    'approver_id' => $user->id,
                    'decision' => ApprovalDecision::Rejected,
                    'note' => $request->input('alasan') ?: $request->input('catatan') ?: 'Ditolak',
                ]
            );

            AuditLog::record($request, \App\Enums\AuditAction::Reject, $tr, "SPPD {$tr->request_number} ditolak oleh {$user->name}.");
        });

        return response()->json([
            'sukses' => true,
            'pesan' => 'Pengajuan SPPD telah ditolak',
            'data' => $this->formatSppd($tr->fresh(['user', 'department', 'approvals'])),
        ]);
    }

    /**
     * GET /api/laporan
     */
    public function daftarLaporan(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = ExpenseReport::with(['travelRequest.user', 'expenses'])->latest('id');

        if ($user && $user->role === Role::Employee) {
            $query->whereHas('travelRequest', fn ($q) => $q->where('user_id', $user->id));
        } elseif ($user && $user->role === Role::Supervisor) {
            $query->whereHas('travelRequest', function ($q) use ($user) {
                $q->where('department_id', $user->department_id)
                  ->orWhereHas('user', fn ($uq) => $uq->where('supervisor_id', $user->id));
            });
        }

        $reports = $query->get();

        $data = $reports->map(function ($er) {
            $tr = $er->travelRequest;
            $diff = (float) ($er->difference ?? 0);
            $jenisSelisih = 'NIHIL';
            if ($diff > 0) {
                $jenisSelisih = 'KURANG_BAYAR';
            } elseif ($diff < 0) {
                $jenisSelisih = 'LEBIH_BAYAR';
            }

            return [
                'id' => $er->id,
                'perjalanan_id' => $er->travel_request_id,
                'nomor_laporan' => 'LPJ-' . ($tr?->request_number ?? $er->id),
                'tanggal_lapor' => $er->submitted_at?->toDateString() ?? now()->toDateString(),
                'ringkasan_kegiatan' => $er->summary ?? 'Laporan kegiatan',
                'hasil_capaian' => 'Selesai dilaksanakan',
                'total_realisasi' => (string) ($er->total_approved ?? 0),
                'total_uang_muka' => (string) ($er->advance_amount ?? 0),
                'selisih' => (string) abs($diff),
                'jenis_selisih' => $jenisSelisih,
                'status' => 'DIVERIFIKASI',
                'perjalanan' => $tr ? $this->formatSppd($tr) : null,
            ];
        })->values()->all();

        return response()->json([
            'sukses' => true,
            'pesan' => 'Daftar laporan berhasil dimuat',
            'data' => $data,
            'halaman' => [
                'halaman_saat_ini' => 1,
                'per_halaman' => 50,
                'total_data' => count($data),
                'total_halaman' => 1,
            ],
        ]);
    }

    /**
     * GET /api/pencairan
     */
    public function daftarPencairan(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Disbursement::with(['travelRequest.user', 'travelRequest.department'])->latest('id');

        if ($user && $user->role === Role::Employee) {
            $query->whereHas('travelRequest', fn ($q) => $q->where('user_id', $user->id));
        }

        $disbs = $query->get();

        $data = $disbs->map(function ($d) {
            $tr = $d->travelRequest;
            $isPaid = $d->status === DisbursementStatus::Paid;
            return [
                'id' => $d->id,
                'nomor_pencairan' => 'DISB-' . str_pad($d->id, 5, '0', STR_PAD_LEFT),
                'perjalanan_id' => $d->travel_request_id,
                'laporan_id' => null,
                'jenis' => $d->type === DisbursementType::Advance ? 'UANG_MUKA' : 'REIMBURSEMENT',
                'tahap' => 'PENCAIRAN',
                'nominal' => (string) $d->amount,
                'jumlah' => (string) $d->amount,
                'metode' => $d->method?->value ?? 'TRANSFER_BANK',
                'metode_pembayaran' => $d->method?->value ?? 'TRANSFER_BANK',
                'nama_bank' => $d->bank_name ?? $tr?->user?->bank_name ?? 'BCA',
                'no_rekening' => $d->bank_account_number ?? $tr?->user?->bank_account_number ?? '1234567890',
                'nomor_referensi' => $d->reference_number ?? ('REF-' . rand(100000, 999999)),
                'referensi_payroll' => $d->reference_number,
                'tanggal_bayar' => $d->paid_at?->toIso8601String(),
                'tanggal_pencairan' => $d->paid_at?->toIso8601String(),
                'status' => $isPaid ? 'SELESAI' : 'MENUNGGU',
                'catatan' => $d->notes,
                'perjalanan' => $tr ? $this->formatSppd($tr) : null,
            ];
        })->values()->all();

        return response()->json([
            'sukses' => true,
            'pesan' => 'Daftar pencairan dana berhasil dimuat',
            'data' => $data,
            'halaman' => [
                'halaman_saat_ini' => 1,
                'per_halaman' => 50,
                'total_data' => count($data),
                'total_halaman' => 1,
            ],
        ]);
    }

    /**
     * POST /api/pencairan/{id}/proses
     */
    public function prosesPencairan(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $disb = Disbursement::findOrFail($id);

        $ref = $request->input('referensi_payroll') ?: $request->input('nomor_referensi') ?: ('REF-' . rand(100000, 999999));
        $disb->update([
            'status' => DisbursementStatus::Paid,
            'paid_at' => now(),
            'processed_by' => $user?->id ?? 1,
            'reference_number' => $ref,
            'notes' => $request->input('catatan'),
        ]);

        return response()->json([
            'sukses' => true,
            'pesan' => 'Pencairan dana berhasil diproses dan diselesaikan',
            'data' => $disb,
        ]);
    }

    /**
     * GET /api/karyawan
     */
    public function daftarKaryawan(): JsonResponse
    {
        $users = User::with('department')->get();

        $data = $users->map(function ($u) {
            return [
                'id' => $u->id,
                'nip' => $u->employee_number ?? ('EMP-' . $u->id),
                'nama_lengkap' => $u->name,
                'email' => $u->email,
                'telepon' => $u->phone,
                'departemen_id' => $u->department_id,
                'departemen' => $u->department ? [
                    'id' => $u->department->id,
                    'kode' => $u->department->code,
                    'nama' => $u->department->name,
                ] : null,
                'jabatan' => [
                    'id' => 1,
                    'kode' => 'STAFF',
                    'nama' => $u->position ?? 'Staff',
                ],
                'status' => $u->is_active ? 'AKTIF' : 'NONAKTIF',
            ];
        })->values()->all();

        return response()->json([
            'sukses' => true,
            'pesan' => 'Daftar karyawan berhasil dimuat',
            'data' => $data,
        ]);
    }

    /**
     * GET /api/departemen
     */
    public function daftarDepartemen(): JsonResponse
    {
        $depts = Department::all()->map(function ($d) {
            return [
                'id' => $d->id,
                'kode' => $d->code,
                'nama' => $d->name,
                'status' => $d->is_active ? 'AKTIF' : 'NONAKTIF',
            ];
        })->values()->all();

        return response()->json([
            'sukses' => true,
            'pesan' => 'Daftar departemen berhasil dimuat',
            'data' => $depts,
        ]);
    }

    /**
     * GET /api/notifikasi
     */
    public function notifikasi(Request $request): JsonResponse
    {
        $user = $request->user();
        $notifs = $user ? $user->notifications()->latest()->take(20)->get() : collect();

        $formatted = $notifs->map(function ($n) {
            return [
                'id' => $n->id,
                'judul' => $n->data['title'] ?? 'Notifikasi Sistem',
                'pesan' => $n->data['message'] ?? 'Pemberitahuan aktivitas perjalanan dinas',
                'tipe' => 'INFO',
                'dibaca' => $n->read_at !== null,
                'dibuat_pada' => $n->created_at?->toIso8601String() ?? now()->toIso8601String(),
            ];
        })->values()->all();

        return response()->json([
            'sukses' => true,
            'pesan' => 'Notifikasi berhasil dimuat',
            'data' => $formatted,
        ]);
    }

    /**
     * GET /api/notifikasi/jumlah-belum-dibaca
     */
    public function jumlahNotifikasi(Request $request): JsonResponse
    {
        $user = $request->user();
        $unread = $user ? $user->unreadNotifications()->count() : 0;

        return response()->json([
            'sukses' => true,
            'pesan' => 'Jumlah notifikasi berhasil dimuat',
            'data' => ['jumlah' => $unread],
        ]);
    }

    /**
     * Helper to format an ExpenseReport model.
     */
    private function formatLaporan(ExpenseReport $er): array
    {
        $er->loadMissing(['travelRequest.user', 'travelRequest.department', 'travelRequest.disbursements', 'expenses']);
        $tr = $er->travelRequest;
        $totalApproved = (float) ($er->total_approved ?? $er->expenses->sum('approved_amount') ?: $er->expenses->sum('amount'));
        $advance = (float) ($er->advance_amount ?? $tr?->advance_approved ?? $tr?->advance_requested ?? 0);
        $diff = $totalApproved - $advance;

        $jenisSelisih = 'NIHIL';
        if ($diff > 0) {
            $jenisSelisih = 'KURANG_BAYAR';
        } elseif ($diff < 0) {
            $jenisSelisih = 'LEBIH_BAYAR';
        }

        $klaimList = $er->expenses->map(function ($exp) {
            return [
                'id' => $exp->id,
                'kategori_biaya_id' => 1,
                'tanggal_transaksi' => $exp->expense_date?->toDateString() ?? now()->toDateString(),
                'deskripsi' => $exp->description,
                'jumlah_diajukan' => (string) $exp->amount,
                'jumlah_disetujui' => (string) ($exp->approved_amount ?? $exp->amount),
                'status' => match ($exp->status) {
                    \App\Enums\ExpenseStatus::Approved => 'DISETUJUI',
                    \App\Enums\ExpenseStatus::Rejected => 'DITOLAK',
                    default => 'DIAJUKAN',
                },
                'melebihi_plafon' => false,
                'catatan_verifikasi' => $exp->verification_note,
                'kategoriBiaya' => [
                    'id' => 1,
                    'nama' => $exp->category?->name ?? 'Operasional',
                    'nama_kategori' => $exp->category?->name ?? 'Operasional',
                ],
                'bukti' => $exp->receipt_path ? [
                    [
                        'id' => $exp->id,
                        'nama_file' => $exp->receipt_name ?? 'receipt.jpg',
                        'path_file' => $exp->receipt_path,
                        'tipe_mime' => $exp->receipt_mime_type ?? 'image/jpeg',
                        'ukuran_byte' => $exp->receipt_size ?? 10240,
                        'status_verifikasi' => 'VALID',
                    ]
                ] : [],
            ];
        })->values()->all();

        $pencairanList = ($tr?->disbursements ?? collect())->map(function ($d) {
            return [
                'id' => $d->id,
                'perjalanan_id' => $d->travel_request_id,
                'laporan_id' => null,
                'jenis' => $d->type === DisbursementType::Advance ? 'UANG_MUKA' : 'REIMBURSEMENT',
                'jumlah' => (string) $d->amount,
                'metode' => $d->method?->value ?? 'TRANSFER_BANK',
                'nama_bank' => $d->bank_name ?? 'BCA',
                'no_rekening' => $d->bank_account_number ?? '1234567890',
                'nomor_referensi' => $d->reference_number,
                'referensi_payroll' => $d->reference_number,
                'tanggal_pencairan' => $d->paid_at?->toIso8601String(),
                'status' => $d->status === DisbursementStatus::Paid ? 'SELESAI' : 'MENUNGGU',
            ];
        })->values()->all();

        return [
            'id' => $er->id,
            'perjalanan_id' => $er->travel_request_id,
            'nomor_laporan' => 'LPJ-' . ($tr?->request_number ?? $er->id),
            'tanggal_lapor' => $er->submitted_at?->toDateString() ?? now()->toDateString(),
            'ringkasan_kegiatan' => $er->summary ?? 'Laporan kegiatan perjalanan dinas selesai dilaksanakan.',
            'hasil_capaian' => 'Seluruh agenda pertemuan dan koordinasi telah terlaksana dengan baik.',
            'total_realisasi' => (string) $totalApproved,
            'total_uang_muka' => (string) $advance,
            'selisih' => (string) abs($diff),
            'jenis_selisih' => $jenisSelisih,
            'status' => match ($er->status) {
                \App\Enums\ExpenseReportStatus::Submitted => 'DIAJUKAN',
                \App\Enums\ExpenseReportStatus::Returned => 'REVISI',
                \App\Enums\ExpenseReportStatus::Verified => 'DIVERIFIKASI',
                default => 'DRAFT',
            },
            'catatan_verifikator' => $er->verification_note,
            'tanggal_verifikasi' => $er->verified_at?->toIso8601String(),
            'perjalanan' => $tr ? $this->formatSppd($tr) : null,
            'klaim' => $klaimList,
            'pencairan' => $pencairanList,
        ];
    }

    /**
     * GET /api/laporan/{id}
     */
    public function detailLaporan($id): JsonResponse
    {
        $er = ExpenseReport::with(['travelRequest.user', 'expenses'])->findOrFail($id);
        return response()->json([
            'sukses' => true,
            'pesan' => 'Detail laporan berhasil dimuat',
            'data' => $this->formatLaporan($er),
        ]);
    }

    /**
     * POST /api/sppd/{sppdId}/laporan
     */
    public function buatLaporan(Request $request, $sppdId): JsonResponse
    {
        $tr = TravelRequest::findOrFail($sppdId);

        $er = ExpenseReport::create([
            'travel_request_id' => $tr->id,
            'summary' => $request->input('ringkasan_kegiatan', 'Laporan perjalanan dinas ' . $tr->request_number),
            'status' => \App\Enums\ExpenseReportStatus::Draft,
            'advance_amount' => $tr->advance_approved ?? $tr->advance_requested ?? 0,
            'total_approved' => 0,
            'difference' => -($tr->advance_approved ?? $tr->advance_requested ?? 0),
            'submitted_at' => null,
        ]);

        return response()->json([
            'sukses' => true,
            'pesan' => 'Draf Laporan Pertanggungjawaban (LPJ) berhasil dibuat',
            'data' => $this->formatLaporan($er),
        ]);
    }

    /**
     * POST /api/laporan/{id}/klaim
     */
    public function tambahKlaim(Request $request, $id): JsonResponse
    {
        $er = ExpenseReport::findOrFail($id);

        $amount = (float) $request->input('jumlah_diajukan', 0);
        $expense = Expense::create([
            'expense_report_id' => $er->id,
            'category' => \App\Enums\ExpenseCategory::Meals,
            'expense_date' => $request->input('tanggal_transaksi', now()->toDateString()),
            'description' => $request->input('deskripsi', 'Pengeluaran operasional perjalanan dinas'),
            'amount' => $amount,
            'approved_amount' => $amount,
            'status' => \App\Enums\ExpenseStatus::Pending,
        ]);

        $totalApproved = $er->expenses()->sum('amount');
        $er->update([
            'total_approved' => $totalApproved,
            'difference' => $totalApproved - $er->advance_amount,
        ]);

        return response()->json([
            'sukses' => true,
            'pesan' => 'Item klaim pengeluaran berhasil ditambahkan',
            'data' => $expense,
        ]);
    }

    /**
     * DELETE /api/laporan/{id}/klaim/{klaimId}
     */
    public function hapusKlaim($id, $klaimId): JsonResponse
    {
        $expense = Expense::where('expense_report_id', $id)->where('id', $klaimId)->firstOrFail();
        $expense->delete();

        $er = ExpenseReport::find($id);
        if ($er) {
            $total = $er->expenses()->sum('amount');
            $er->update([
                'total_approved' => $total,
                'difference' => $total - $er->advance_amount,
            ]);
        }

        return response()->json([
            'sukses' => true,
            'pesan' => 'Item klaim berhasil dihapus',
            'data' => null,
        ]);
    }

    /**
     * POST /api/laporan/{id}/ajukan
     */
    public function ajukanLaporan(Request $request, $id): JsonResponse
    {
        $er = ExpenseReport::findOrFail($id);
        $er->update([
            'status' => \App\Enums\ExpenseReportStatus::Submitted,
            'submitted_at' => now(),
        ]);

        return response()->json([
            'sukses' => true,
            'pesan' => 'Laporan Pertanggungjawaban (LPJ) berhasil diajukan untuk verifikasi Keuangan',
            'data' => $this->formatLaporan($er),
        ]);
    }

    /**
     * POST /api/laporan/{id}/verifikasi
     */
    public function verifikasiLaporan(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $er = ExpenseReport::findOrFail($id);

        $klaimInputs = $request->input('klaim', []);
        foreach ($klaimInputs as $ki) {
            $exp = Expense::where('expense_report_id', $er->id)->where('id', $ki['klaim_id'])->first();
            if ($exp) {
                $statusExp = match ($ki['status'] ?? 'DISETUJUI') {
                    'DITOLAK' => \App\Enums\ExpenseStatus::Rejected,
                    default => \App\Enums\ExpenseStatus::Approved,
                };
                $exp->update([
                    'status' => $statusExp,
                    'approved_amount' => $statusExp === \App\Enums\ExpenseStatus::Approved ? ($ki['jumlah_disetujui'] ?? $exp->amount) : 0,
                    'verification_note' => $ki['catatan'] ?? null,
                ]);
            }
        }

        $totalApproved = $er->expenses()->where('status', \App\Enums\ExpenseStatus::Approved)->sum('approved_amount');
        $diff = $totalApproved - $er->advance_amount;

        $er->update([
            'status' => \App\Enums\ExpenseReportStatus::Verified,
            'verified_by' => $user?->id ?? 1,
            'verified_at' => now(),
            'verification_note' => $request->input('catatan', 'Laporan telah diverifikasi oleh Bagian Keuangan.'),
            'total_approved' => $totalApproved,
            'difference' => $diff,
            'settlement_type' => $diff > 0 ? \App\Enums\SettlementType::Underpaid : ($diff < 0 ? \App\Enums\SettlementType::Overpaid : \App\Enums\SettlementType::Even),
        ]);

        if ($diff > 0) {
            Disbursement::firstOrCreate(
                [
                    'travel_request_id' => $er->travel_request_id,
                    'type' => DisbursementType::Reimbursement,
                ],
                [
                    'amount' => $diff,
                    'status' => DisbursementStatus::Pending,
                    'method' => PaymentMethod::BankTransfer,
                    'bank_name' => $er->travelRequest?->user?->bank_name ?? 'BCA',
                    'bank_account_number' => $er->travelRequest?->user?->bank_account_number ?? '1234567890',
                    'bank_account_name' => $er->travelRequest?->user?->name ?? 'Pegawai',
                ]
            );
        }

        return response()->json([
            'sukses' => true,
            'pesan' => 'Laporan berhasil diverifikasi oleh Bagian Keuangan',
            'data' => $this->formatLaporan($er),
        ]);
    }

    /**
     * POST /api/sppd/{sppdId}/uang-muka
     */
    public function cairkanUangMuka(Request $request, $sppdId): JsonResponse
    {
        $tr = TravelRequest::findOrFail($sppdId);
        $user = $request->user();
        $amount = (float) ($request->input('jumlah') ?: $tr->advance_requested ?: 1000000);

        $disb = Disbursement::firstOrCreate(
            [
                'travel_request_id' => $tr->id,
                'type' => DisbursementType::Advance,
            ],
            [
                'amount' => $amount,
                'status' => DisbursementStatus::Paid,
                'method' => PaymentMethod::BankTransfer,
                'bank_name' => $tr->user?->bank_name ?? 'BCA',
                'bank_account_number' => $tr->user?->bank_account_number ?? '1234567890',
                'bank_account_name' => $tr->user?->name ?? 'Pegawai',
                'paid_at' => now(),
                'processed_by' => $user?->id ?? 1,
                'reference_number' => 'UM-' . rand(100000, 999999),
            ]
        );

        return response()->json([
            'sukses' => true,
            'pesan' => 'Uang muka berhasil dicairkan',
            'data' => $disb,
        ]);
    }

    /**
     * POST /api/laporan/{id}/pencairan
     */
    public function pencairanDariLaporan(Request $request, $id): JsonResponse
    {
        $er = ExpenseReport::with('travelRequest.user')->findOrFail($id);
        $nominal = abs((float) $er->difference);

        $disb = Disbursement::create([
            'travel_request_id' => $er->travel_request_id,
            'type' => DisbursementType::Reimbursement,
            'amount' => $nominal,
            'status' => DisbursementStatus::Pending,
            'method' => PaymentMethod::BankTransfer,
            'bank_name' => $er->travelRequest?->user?->bank_name ?? 'BCA',
            'bank_account_number' => $er->travelRequest?->user?->bank_account_number ?? '1234567890',
            'bank_account_name' => $er->travelRequest?->user?->name ?? 'Pegawai',
        ]);

        return response()->json([
            'sukses' => true,
            'pesan' => 'Pengajuan pembayaran selisih reimbursement berhasil dibuat',
            'data' => $disb,
        ]);
    }

    /**
     * GET /api/master/jabatan
     */
    public function masterJabatan(): JsonResponse
    {
        return response()->json([
            'sukses' => true,
            'pesan' => 'Daftar jabatan berhasil dimuat',
            'data' => [
                ['id' => 1, 'kode' => 'STAFF', 'nama_jabatan' => 'Staff Operasional', 'level' => 1],
                ['id' => 2, 'kode' => 'SPV', 'nama_jabatan' => 'Supervisor / Atasan', 'level' => 2],
                ['id' => 3, 'kode' => 'MGR', 'nama_jabatan' => 'Manager Departemen', 'level' => 3],
                ['id' => 4, 'kode' => 'DIR', 'nama_jabatan' => 'Direktur Utama', 'level' => 4],
            ],
        ]);
    }
}
