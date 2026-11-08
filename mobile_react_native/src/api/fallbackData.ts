import {
  DashboardPegawai,
  JenisPerjalanan,
  KategoriBiaya,
  LaporanBiaya,
  MetaPaginasi,
  Notifikasi,
  OpsiFormPerjalanan,
  Pengeluaran,
  Pengguna,
  Perjalanan,
  ResponsPaginasi,
  RuangLaporan,
  Transportasi,
} from './types';

function addDaysIso(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

let mockUser: Pengguna = {
  id: 4,
  name: 'Andi Pratama',
  email: 'employee@citramandiri.test',
  employee_number: 'EMP-00004',
  role: 'employee',
  role_label: 'Karyawan',
  position: 'Software Engineer',
  phone: '0812-3456-7890',
  bank_name: 'BCA',
  bank_account_number: '5240891123',
  bank_account_name: 'Andi Pratama',
  is_active: true,
  department: {
    id: 1,
    name: 'Information Technology',
    code: 'IT',
    budget: 150000000,
    description: 'Divisi Teknologi Informasi & Infrastruktur',
  },
  supervisor: {
    id: 3,
    name: 'Budi Santoso',
    email: 'supervisor@citramandiri.test',
    employee_number: 'EMP-00003',
    position: 'IT Supervisor',
  },
  last_login_at: new Date().toISOString(),
  created_at: addDaysIso(-90),
};

export const fallbackOptions: OpsiFormPerjalanan = {
  trip_types: [
    { value: 'local', label: 'Dalam Kota' },
    { value: 'domestic', label: 'Luar Kota (Domestik)' },
    { value: 'international', label: 'Luar Negeri (Internasional)' },
  ],
  transportations: [
    { value: 'plane', label: 'Pesawat Udara' },
    { value: 'train', label: 'Kereta Api' },
    { value: 'bus', label: 'Bus / Travel' },
    { value: 'ship', label: 'Kapal Laut' },
    { value: 'office_vehicle', label: 'Kendaraan Dinas' },
    { value: 'private_vehicle', label: 'Kendaraan Pribadi' },
    { value: 'other', label: 'Lainnya' },
  ],
  expense_categories: [
    { value: 'transportation', label: 'Transportasi', requires_receipt: true },
    { value: 'accommodation', label: 'Penginapan / Hotel', requires_receipt: true },
    { value: 'daily_allowance', label: 'Uang Saku Harian', requires_receipt: false },
    { value: 'meals', label: 'Konsumsi / Makan', requires_receipt: true },
    { value: 'other', label: 'Lain-lain', requires_receipt: true },
  ],
  document_types: [
    { value: 'assignment_letter', label: 'Surat Tugas' },
    { value: 'invitation', label: 'Undangan Resmi' },
    { value: 'itinerary', label: 'Jadwal / Itinerary' },
    { value: 'other', label: 'Dokumen Pendukung' },
  ],
  approver: {
    id: 3,
    name: 'Budi Santoso',
    email: 'supervisor@citramandiri.test',
    position: 'IT Supervisor',
  },
  department: {
    id: 1,
    name: 'Information Technology',
    code: 'IT',
    budget: 150000000,
  },
};

let mockTrips: Perjalanan[] = [
  {
    id: 4,
    request_number: 'TR-2026-0004',
    purpose: 'Technical training for branch staff',
    description: 'Pelatihan sistem jaringan dan keamanan router cabang Sumatera Utara.',
    destination: 'Medan',
    trip_type: 'domestic',
    trip_type_label: 'Luar Kota (Domestik)',
    transportation: 'plane',
    transportation_label: 'Pesawat Udara',
    departure_date: addDaysIso(3),
    return_date: addDaysIso(5),
    duration_days: 3,
    estimated_cost: 6000000,
    advance_requested: 2000000,
    advance_approved: 2000000,
    status: 'approved',
    status_label: 'Disetujui',
    is_editable: false,
    is_cancellable: true,
    notes: 'Membawa modul pelatihan dan perangkat firewall cadangan.',
    submitted_at: addDaysIso(-5),
    completed_at: null,
    created_at: addDaysIso(-6),
    updated_at: addDaysIso(-3),
    employee: {
      id: 4,
      name: 'Andi Pratama',
      email: 'employee@citramandiri.test',
      employee_number: 'EMP-00004',
      position: 'Software Engineer',
      bank_name: 'BCA',
      bank_account_number: '5240891123',
      bank_account_name: 'Andi Pratama',
      department: { id: 1, name: 'Information Technology', code: 'IT' },
    },
    current_approver: null,
    cost_estimates: [
      {
        id: 401,
        category: 'transportation',
        category_label: 'Transportasi',
        description: 'Tiket Pesawat PP Jakarta - Medan',
        quantity: 1,
        unit_price: 2800000,
        subtotal: 2800000,
      },
      {
        id: 402,
        category: 'accommodation',
        category_label: 'Penginapan',
        description: 'Hotel Santika Premiere Medan (2 malam)',
        quantity: 2,
        unit_price: 1150000,
        subtotal: 2300000,
      },
      {
        id: 403,
        category: 'daily_allowance',
        category_label: 'Uang Saku Harian',
        description: 'Uang saku 3 hari',
        quantity: 3,
        unit_price: 300000,
        subtotal: 900000,
      },
    ],
    documents: [],
    approvals: [
      {
        id: 1,
        stage: 'supervisor',
        stage_label: 'Atasan Langsung',
        decision: 'approved',
        decision_label: 'Disetujui',
        note: 'Jadwal sudah sesuai dengan kepala cabang Medan.',
        approver: {
          id: 3,
          name: 'Budi Santoso',
          email: 'supervisor@citramandiri.test',
          position: 'IT Supervisor',
        },
        decided_at: addDaysIso(-4),
      },
      {
        id: 2,
        stage: 'finance',
        stage_label: 'Bagian Keuangan',
        decision: 'approved',
        decision_label: 'Disetujui',
        note: 'Anggaran IT Q4 mencukupi. Uang muka Rp 2.000.000 dicairkan.',
        approver: {
          id: 2,
          name: 'Siti Rahmawati',
          email: 'finance@citramandiri.test',
          position: 'Finance Manager',
        },
        decided_at: addDaysIso(-3),
      },
    ],
    expense_report: {
      id: 40,
      travel_request_id: 4,
      summary: 'Persiapan laporan biaya perjalanan pelatihan cabang Medan.',
      total_claimed: 2100000,
      total_approved: 0,
      difference: 100000,
      settlement_type: 'reimbursement',
      status: 'draft',
      status_label: 'Draf',
      is_editable: true,
      verification_note: null,
      submitted_at: null,
      verified_at: null,
      expenses: [
        {
          id: 4001,
          category: 'transportation',
          category_label: 'Transportasi',
          expense_date: addDaysIso(3),
          description: 'Tiket Pesawat CGK - KNO (PP)',
          amount: 2100000,
          approved_amount: null,
          status: 'pending',
          status_label: 'Menunggu',
          note: null,
          has_receipt: true,
          receipt_original_name: 'e-ticket-medan.pdf',
          receipt_url: null,
        },
      ],
    },
    disbursements: [
      {
        id: 41,
        travel_request_id: 4,
        type: 'advance',
        type_label: 'Uang Muka',
        amount: 2000000,
        status: 'paid',
        status_label: 'Dibayarkan',
        method: 'bank_transfer',
        method_label: 'Transfer Bank',
        reference_number: 'ADV-2026-0041',
        recipient_bank_name: 'BCA',
        recipient_account_number: '5240891123',
        recipient_account_name: 'Andi Pratama',
        paid_at: addDaysIso(-2),
        notes: 'Pencairan uang muka perjalanan Medan',
        receipt_url: null,
        processor: {
          id: 2,
          name: 'Siti Rahmawati',
          email: 'finance@citramandiri.test',
        },
        created_at: addDaysIso(-3),
      },
    ],
  },
  {
    id: 5,
    request_number: 'TR-2026-0005',
    purpose: 'Industry conference attendance',
    description: 'Menghadiri konferensi infrastruktur cloud & keamanan data nasional.',
    destination: 'Denpasar',
    trip_type: 'domestic',
    trip_type_label: 'Luar Kota (Domestik)',
    transportation: 'plane',
    transportation_label: 'Pesawat Udara',
    departure_date: addDaysIso(-6),
    return_date: addDaysIso(-4),
    duration_days: 3,
    estimated_cost: 5500000,
    advance_requested: 2000000,
    advance_approved: 2000000,
    status: 'approved',
    status_label: 'Disetujui',
    is_editable: false,
    is_cancellable: false,
    notes: 'Laporan pengeluaran sedang diverifikasi bagian Keuangan.',
    submitted_at: addDaysIso(-15),
    completed_at: null,
    created_at: addDaysIso(-16),
    updated_at: addDaysIso(-2),
    employee: {
      id: 4,
      name: 'Andi Pratama',
      email: 'employee@citramandiri.test',
      employee_number: 'EMP-00004',
      position: 'Software Engineer',
      department: { id: 1, name: 'Information Technology', code: 'IT' },
    },
    current_approver: null,
    cost_estimates: [
      {
        id: 501,
        category: 'transportation',
        category_label: 'Transportasi',
        description: 'Return flight Jakarta - Denpasar',
        quantity: 1,
        unit_price: 2200000,
        subtotal: 2200000,
      },
      {
        id: 502,
        category: 'accommodation',
        category_label: 'Penginapan',
        description: 'Hotel 3 malam',
        quantity: 3,
        unit_price: 950000,
        subtotal: 2850000,
      },
      {
        id: 503,
        category: 'daily_allowance',
        category_label: 'Uang Saku Harian',
        description: 'Uang saku 3 hari',
        quantity: 3,
        unit_price: 150000,
        subtotal: 450000,
      },
    ],
    documents: [],
    approvals: [
      {
        id: 51,
        stage: 'supervisor',
        stage_label: 'Atasan Langsung',
        decision: 'approved',
        decision_label: 'Disetujui',
        note: 'Approved.',
        approver: {
          id: 3,
          name: 'Budi Santoso',
          email: 'supervisor@citramandiri.test',
          position: 'IT Supervisor',
        },
        decided_at: addDaysIso(-14),
      },
      {
        id: 52,
        stage: 'finance',
        stage_label: 'Bagian Keuangan',
        decision: 'approved',
        decision_label: 'Disetujui',
        note: 'Budget verified.',
        approver: {
          id: 2,
          name: 'Siti Rahmawati',
          email: 'finance@citramandiri.test',
          position: 'Finance Manager',
        },
        decided_at: addDaysIso(-13),
      },
    ],
    expense_report: {
      id: 50,
      travel_request_id: 5,
      summary: 'Attended the three-day conference and met two prospective partners.',
      total_claimed: 4500000,
      total_approved: 0,
      difference: 2500000,
      settlement_type: 'reimbursement',
      status: 'submitted',
      status_label: 'Diajukan',
      is_editable: false,
      verification_note: null,
      submitted_at: addDaysIso(-2),
      verified_at: null,
      expenses: [
        {
          id: 5001,
          category: 'transportation',
          category_label: 'Transportasi',
          expense_date: addDaysIso(-6),
          description: 'Return flight',
          amount: 2100000,
          approved_amount: null,
          status: 'pending',
          status_label: 'Menunggu',
          note: null,
          has_receipt: true,
          receipt_original_name: 'receipt-flight.png',
          receipt_url: null,
        },
        {
          id: 5002,
          category: 'accommodation',
          category_label: 'Penginapan',
          expense_date: addDaysIso(-5),
          description: 'Hotel, 3 nights',
          amount: 1950000,
          approved_amount: null,
          status: 'pending',
          status_label: 'Menunggu',
          note: null,
          has_receipt: true,
          receipt_original_name: 'receipt-hotel.png',
          receipt_url: null,
        },
        {
          id: 5003,
          category: 'daily_allowance',
          category_label: 'Uang Saku Harian',
          expense_date: addDaysIso(-4),
          description: 'Daily allowance, 3 days',
          amount: 450000,
          approved_amount: null,
          status: 'pending',
          status_label: 'Menunggu',
          note: null,
          has_receipt: false,
          receipt_original_name: null,
          receipt_url: null,
        },
      ],
    },
    disbursements: [
      {
        id: 55,
        travel_request_id: 5,
        type: 'advance',
        type_label: 'Uang Muka',
        amount: 2000000,
        status: 'paid',
        status_label: 'Dibayarkan',
        method: 'bank_transfer',
        method_label: 'Transfer Bank',
        reference_number: 'ADV-2026-0055',
        recipient_bank_name: 'BCA',
        recipient_account_number: '5240891123',
        recipient_account_name: 'Andi Pratama',
        paid_at: addDaysIso(-10),
        notes: 'Uang muka perjalanan Denpasar',
        receipt_url: null,
        created_at: addDaysIso(-12),
      },
    ],
  },
  {
    id: 1,
    request_number: 'TR-2026-0001',
    purpose: 'Vendor site inspection',
    description: 'Inspeksi kesiapan perangkat server di fasilitas vendor Bandung.',
    destination: 'Bandung',
    trip_type: 'domestic',
    trip_type_label: 'Luar Kota (Domestik)',
    transportation: 'train',
    transportation_label: 'Kereta Api',
    departure_date: addDaysIso(20),
    return_date: addDaysIso(21),
    duration_days: 2,
    estimated_cost: 2250000,
    advance_requested: 750000,
    advance_approved: null,
    status: 'draft',
    status_label: 'Draf',
    is_editable: true,
    is_cancellable: true,
    notes: 'Jadwal tentatif menunggu konfirmasi teknisi vendor.',
    submitted_at: null,
    completed_at: null,
    created_at: addDaysIso(-1),
    updated_at: addDaysIso(-1),
    employee: {
      id: 4,
      name: 'Andi Pratama',
      email: 'employee@citramandiri.test',
      employee_number: 'EMP-00004',
      position: 'Software Engineer',
      department: { id: 1, name: 'Information Technology', code: 'IT' },
    },
    current_approver: null,
    cost_estimates: [
      {
        id: 101,
        category: 'transportation',
        category_label: 'Transportasi',
        description: 'Kereta Cepat Whoosh PP',
        quantity: 2,
        unit_price: 350000,
        subtotal: 700000,
      },
      {
        id: 102,
        category: 'accommodation',
        category_label: 'Penginapan',
        description: 'Hotel 1 malam di Bandung',
        quantity: 1,
        unit_price: 950000,
        subtotal: 950000,
      },
      {
        id: 103,
        category: 'daily_allowance',
        category_label: 'Uang Saku Harian',
        description: 'Uang saku 2 hari',
        quantity: 2,
        unit_price: 300000,
        subtotal: 600000,
      },
    ],
    documents: [],
    approvals: [],
    expense_report: null,
    disbursements: [],
  },
  {
    id: 2,
    request_number: 'TR-2026-0002',
    purpose: 'Regional sales coordination',
    description: 'Sinkronisasi sistem pelaporan penjualan regional Jawa Timur.',
    destination: 'Surabaya',
    trip_type: 'domestic',
    trip_type_label: 'Luar Kota (Domestik)',
    transportation: 'plane',
    transportation_label: 'Pesawat Udara',
    departure_date: addDaysIso(12),
    return_date: addDaysIso(14),
    duration_days: 3,
    estimated_cost: 4500000,
    advance_requested: 1000000,
    advance_approved: null,
    status: 'submitted',
    status_label: 'Diajukan',
    is_editable: false,
    is_cancellable: true,
    notes: 'Menunggu persetujuan Supervisor IT.',
    submitted_at: addDaysIso(-2),
    completed_at: null,
    created_at: addDaysIso(-3),
    updated_at: addDaysIso(-2),
    employee: {
      id: 4,
      name: 'Andi Pratama',
      email: 'employee@citramandiri.test',
      employee_number: 'EMP-00004',
      position: 'Software Engineer',
      department: { id: 1, name: 'Information Technology', code: 'IT' },
    },
    current_approver: {
      id: 3,
      name: 'Budi Santoso',
      email: 'supervisor@citramandiri.test',
      role: 'supervisor',
    },
    cost_estimates: [
      {
        id: 201,
        category: 'transportation',
        category_label: 'Transportasi',
        description: 'Tiket Pesawat PP Jakarta - Surabaya',
        quantity: 1,
        unit_price: 2100000,
        subtotal: 2100000,
      },
      {
        id: 202,
        category: 'accommodation',
        category_label: 'Penginapan',
        description: 'Hotel 2 malam di Surabaya',
        quantity: 2,
        unit_price: 900000,
        subtotal: 1800000,
      },
      {
        id: 203,
        category: 'daily_allowance',
        category_label: 'Uang Saku Harian',
        description: 'Uang saku 3 hari',
        quantity: 3,
        unit_price: 200000,
        subtotal: 600000,
      },
    ],
    documents: [],
    approvals: [],
    expense_report: null,
    disbursements: [],
  },
  {
    id: 3,
    request_number: 'TR-2026-0003',
    purpose: 'Client meeting and contract negotiation',
    description: 'Pertemuan teknis integrasi API bersama mitra regional Indonesia Timur.',
    destination: 'Makassar',
    trip_type: 'domestic',
    trip_type_label: 'Luar Kota (Domestik)',
    transportation: 'plane',
    transportation_label: 'Pesawat Udara',
    departure_date: addDaysIso(8),
    return_date: addDaysIso(9),
    duration_days: 2,
    estimated_cost: 5200000,
    advance_requested: 1500000,
    advance_approved: null,
    status: 'supervisor_approved',
    status_label: 'Disetujui Atasan',
    is_editable: false,
    is_cancellable: true,
    notes: 'Telah disetujui atasan langsung, menunggu verifikasi Finance.',
    submitted_at: addDaysIso(-4),
    completed_at: null,
    created_at: addDaysIso(-5),
    updated_at: addDaysIso(-3),
    employee: {
      id: 4,
      name: 'Andi Pratama',
      email: 'employee@citramandiri.test',
      employee_number: 'EMP-00004',
      position: 'Software Engineer',
      department: { id: 1, name: 'Information Technology', code: 'IT' },
    },
    current_approver: {
      id: 2,
      name: 'Siti Rahmawati',
      email: 'finance@citramandiri.test',
      role: 'finance',
    },
    cost_estimates: [
      {
        id: 301,
        category: 'transportation',
        category_label: 'Transportasi',
        description: 'Tiket Pesawat PP Jakarta - Makassar',
        quantity: 1,
        unit_price: 3400000,
        subtotal: 3400000,
      },
      {
        id: 302,
        category: 'accommodation',
        category_label: 'Penginapan',
        description: 'Hotel 1 malam di Makassar',
        quantity: 1,
        unit_price: 1200000,
        subtotal: 1200000,
      },
      {
        id: 303,
        category: 'daily_allowance',
        category_label: 'Uang Saku Harian',
        description: 'Uang saku 2 hari',
        quantity: 2,
        unit_price: 300000,
        subtotal: 600000,
      },
    ],
    documents: [],
    approvals: [
      {
        id: 31,
        stage: 'supervisor',
        stage_label: 'Atasan Langsung',
        decision: 'approved',
        decision_label: 'Disetujui',
        note: 'Approved by supervisor.',
        approver: {
          id: 3,
          name: 'Budi Santoso',
          email: 'supervisor@citramandiri.test',
          position: 'IT Supervisor',
        },
        decided_at: addDaysIso(-3),
      },
    ],
    expense_report: null,
    disbursements: [],
  },
  {
    id: 6,
    request_number: 'TR-2026-0006',
    purpose: 'Branch office system audit',
    description: 'Audit berkala server dan jaringan kantor cabang DIY.',
    destination: 'Yogyakarta',
    trip_type: 'domestic',
    trip_type_label: 'Luar Kota (Domestik)',
    transportation: 'train',
    transportation_label: 'Kereta Api',
    departure_date: addDaysIso(-25),
    return_date: addDaysIso(-23),
    duration_days: 3,
    estimated_cost: 4300000,
    advance_requested: 2000000,
    advance_approved: 2000000,
    status: 'completed',
    status_label: 'Selesai',
    is_editable: false,
    is_cancellable: false,
    notes: 'Seluruh rangkaian audit dan pelunasan biaya telah selesai.',
    submitted_at: addDaysIso(-35),
    completed_at: addDaysIso(-18),
    created_at: addDaysIso(-35),
    updated_at: addDaysIso(-18),
    employee: {
      id: 4,
      name: 'Andi Pratama',
      email: 'employee@citramandiri.test',
      employee_number: 'EMP-00004',
      position: 'Software Engineer',
      department: { id: 1, name: 'Information Technology', code: 'IT' },
    },
    current_approver: null,
    cost_estimates: [
      {
        id: 601,
        category: 'transportation',
        category_label: 'Transportasi',
        description: 'Return flight / kereta eksekutif',
        quantity: 1,
        unit_price: 1800000,
        subtotal: 1800000,
      },
      {
        id: 602,
        category: 'accommodation',
        category_label: 'Penginapan',
        description: 'Hotel 3 malam',
        quantity: 3,
        unit_price: 550000,
        subtotal: 1650000,
      },
      {
        id: 603,
        category: 'daily_allowance',
        category_label: 'Uang Saku Harian',
        description: 'Daily allowance 3 days',
        quantity: 3,
        unit_price: 150000,
        subtotal: 450000,
      },
    ],
    documents: [],
    approvals: [
      {
        id: 61,
        stage: 'supervisor',
        stage_label: 'Atasan Langsung',
        decision: 'approved',
        decision_label: 'Disetujui',
        note: 'Approved.',
        approver: {
          id: 3,
          name: 'Budi Santoso',
          email: 'supervisor@citramandiri.test',
          position: 'IT Supervisor',
        },
        decided_at: addDaysIso(-33),
      },
      {
        id: 62,
        stage: 'finance',
        stage_label: 'Bagian Keuangan',
        decision: 'approved',
        decision_label: 'Disetujui',
        note: 'Budget verified & settled.',
        approver: {
          id: 2,
          name: 'Siti Rahmawati',
          email: 'finance@citramandiri.test',
          position: 'Finance Manager',
        },
        decided_at: addDaysIso(-32),
      },
    ],
    expense_report: {
      id: 60,
      travel_request_id: 6,
      summary: 'All planned activities were completed on schedule.',
      total_claimed: 3900000,
      total_approved: 3900000,
      difference: 1900000,
      settlement_type: 'reimbursement',
      status: 'settled',
      status_label: 'Lunas',
      is_editable: false,
      verification_note: 'Seluruh bukti pengeluaran lengkap dan telah dilunasi.',
      submitted_at: addDaysIso(-21),
      verified_at: addDaysIso(-19),
      verifier: {
        id: 2,
        name: 'Siti Rahmawati',
        email: 'finance@citramandiri.test',
      },
      expenses: [
        {
          id: 6001,
          category: 'transportation',
          category_label: 'Transportasi',
          expense_date: addDaysIso(-25),
          description: 'Return flight',
          amount: 1800000,
          approved_amount: 1800000,
          status: 'approved',
          status_label: 'Disetujui',
          note: null,
          has_receipt: true,
          receipt_original_name: 'receipt-yk-transport.png',
          receipt_url: null,
        },
        {
          id: 6002,
          category: 'accommodation',
          category_label: 'Penginapan',
          expense_date: addDaysIso(-24),
          description: 'Hotel, 3 nights',
          amount: 1650000,
          approved_amount: 1650000,
          status: 'approved',
          status_label: 'Disetujui',
          note: null,
          has_receipt: true,
          receipt_original_name: 'receipt-yk-hotel.png',
          receipt_url: null,
        },
        {
          id: 6003,
          category: 'daily_allowance',
          category_label: 'Uang Saku Harian',
          expense_date: addDaysIso(-23),
          description: 'Daily allowance, 3 days',
          amount: 450000,
          approved_amount: 450000,
          status: 'approved',
          status_label: 'Disetujui',
          note: null,
          has_receipt: false,
          receipt_original_name: null,
          receipt_url: null,
        },
      ],
    },
    disbursements: [
      {
        id: 61,
        travel_request_id: 6,
        type: 'advance',
        type_label: 'Uang Muka',
        amount: 2000000,
        status: 'paid',
        status_label: 'Dibayarkan',
        method: 'bank_transfer',
        method_label: 'Transfer Bank',
        reference_number: 'ADV-2026-0061',
        recipient_bank_name: 'BCA',
        recipient_account_number: '5240891123',
        recipient_account_name: 'Andi Pratama',
        paid_at: addDaysIso(-28),
        notes: 'Uang muka perjalanan Yogyakarta',
        receipt_url: null,
        created_at: addDaysIso(-29),
      },
      {
        id: 62,
        travel_request_id: 6,
        type: 'reimbursement',
        type_label: 'Penggantian Biaya',
        amount: 1900000,
        status: 'paid',
        status_label: 'Dibayarkan',
        method: 'bank_transfer',
        method_label: 'Transfer Bank',
        reference_number: 'RMB-2026-0062',
        recipient_bank_name: 'BCA',
        recipient_account_number: '5240891123',
        recipient_account_name: 'Andi Pratama',
        paid_at: addDaysIso(-18),
        notes: 'Pelunasan selisih klaim pengeluaran Yogyakarta',
        receipt_url: null,
        created_at: addDaysIso(-18),
      },
    ],
  },
  {
    id: 7,
    request_number: 'TR-2026-0007',
    purpose: 'Partner workshop',
    description: 'Workshop teknis bersama mitra implementasi Jawa Tengah.',
    destination: 'Semarang',
    trip_type: 'domestic',
    trip_type_label: 'Luar Kota (Domestik)',
    transportation: 'train',
    transportation_label: 'Kereta Api',
    departure_date: addDaysIso(15),
    return_date: addDaysIso(16),
    duration_days: 2,
    estimated_cost: 3100000,
    advance_requested: 1000000,
    advance_approved: null,
    status: 'rejected',
    status_label: 'Ditolak',
    is_editable: true,
    is_cancellable: true,
    notes: null,
    submitted_at: addDaysIso(-3),
    completed_at: null,
    created_at: addDaysIso(-4),
    updated_at: addDaysIso(-2),
    employee: {
      id: 4,
      name: 'Andi Pratama',
      email: 'employee@citramandiri.test',
      employee_number: 'EMP-00004',
      position: 'Software Engineer',
      department: { id: 1, name: 'Information Technology', code: 'IT' },
    },
    current_approver: null,
    cost_estimates: [
      {
        id: 701,
        category: 'transportation',
        category_label: 'Transportasi',
        description: 'Kereta Argo Muria PP',
        quantity: 1,
        unit_price: 1100000,
        subtotal: 1100000,
      },
      {
        id: 702,
        category: 'accommodation',
        category_label: 'Penginapan',
        description: 'Hotel 1 malam di Semarang',
        quantity: 1,
        unit_price: 1500000,
        subtotal: 1500000,
      },
      {
        id: 703,
        category: 'daily_allowance',
        category_label: 'Uang Saku Harian',
        description: 'Uang saku 2 hari',
        quantity: 2,
        unit_price: 250000,
        subtotal: 500000,
      },
    ],
    documents: [],
    approvals: [
      {
        id: 71,
        stage: 'supervisor',
        stage_label: 'Atasan Langsung',
        decision: 'rejected',
        decision_label: 'Ditolak',
        note: 'Please combine this visit with the Surabaya trip next week.',
        approver: {
          id: 3,
          name: 'Budi Santoso',
          email: 'supervisor@citramandiri.test',
          position: 'IT Supervisor',
        },
        decided_at: addDaysIso(-2),
      },
    ],
    expense_report: null,
    disbursements: [],
  },
  {
    id: 8,
    request_number: 'TR-2026-0008',
    purpose: 'Vendor site inspection',
    description: 'Kunjungan inspeksi dibatalkan karena jadwal ulang vendor.',
    destination: 'Balikpapan',
    trip_type: 'domestic',
    trip_type_label: 'Luar Kota (Domestik)',
    transportation: 'plane',
    transportation_label: 'Pesawat Udara',
    departure_date: addDaysIso(25),
    return_date: addDaysIso(25),
    duration_days: 1,
    estimated_cost: 2800000,
    advance_requested: 500000,
    advance_approved: null,
    status: 'cancelled',
    status_label: 'Dibatalkan',
    is_editable: false,
    is_cancellable: false,
    notes: null,
    submitted_at: addDaysIso(-5),
    completed_at: null,
    created_at: addDaysIso(-6),
    updated_at: addDaysIso(-5),
    employee: {
      id: 4,
      name: 'Andi Pratama',
      email: 'employee@citramandiri.test',
      employee_number: 'EMP-00004',
      position: 'Software Engineer',
      department: { id: 1, name: 'Information Technology', code: 'IT' },
    },
    current_approver: null,
    cost_estimates: [],
    documents: [],
    approvals: [],
    expense_report: null,
    disbursements: [],
  },
];

let mockNotifications: Notifikasi[] = [
  {
    id: 'notif-1',
    event: 'request_approved_by_finance',
    travel_request_id: 4,
    request_number: 'TR-2026-0004',
    purpose: 'Technical training for branch staff',
    destination: 'Medan',
    status: 'approved',
    actor_id: 2,
    actor_name: 'Siti Rahmawati',
    note: 'Anggaran IT Q4 mencukupi. Uang muka Rp 2.000.000 dicairkan.',
    extra: {},
    read_at: null,
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'notif-2',
    event: 'request_approved_by_supervisor',
    travel_request_id: 3,
    request_number: 'TR-2026-0003',
    purpose: 'Client meeting and contract negotiation',
    destination: 'Makassar',
    status: 'supervisor_approved',
    actor_id: 3,
    actor_name: 'Budi Santoso',
    note: 'Disetujui atasan langsung, diteruskan ke bagian Keuangan.',
    extra: {},
    read_at: null,
    created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
  },
  {
    id: 'notif-3',
    event: 'request_rejected',
    travel_request_id: 7,
    request_number: 'TR-2026-0007',
    purpose: 'Partner workshop',
    destination: 'Semarang',
    status: 'rejected',
    actor_id: 3,
    actor_name: 'Budi Santoso',
    note: 'Please combine this visit with the Surabaya trip next week.',
    extra: {},
    read_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
  },
  {
    id: 'notif-4',
    event: 'disbursement_paid',
    travel_request_id: 6,
    request_number: 'TR-2026-0006',
    purpose: 'Branch office system audit',
    destination: 'Yogyakarta',
    status: 'completed',
    actor_id: 2,
    actor_name: 'Siti Rahmawati',
    note: 'Pelunasan reimbursement Rp 1.900.000 telah ditransfer ke rekening BCA Anda.',
    extra: { amount: 1900000, type: 'reimbursement' },
    read_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 96 * 3600 * 1000).toISOString(),
  },
];

const SEEDED_USERS: Record<string, Pengguna> = {
  'admin@citramandiri.test': {
    id: 1,
    name: 'Super Admin',
    email: 'admin@citramandiri.test',
    employee_number: 'EMP-00001',
    role: 'admin',
    role_label: 'Super Admin',
    position: 'System Administrator',
    phone: '0811-1000-0001',
    bank_name: 'Mandiri',
    bank_account_number: '120009988771',
    bank_account_name: 'Super Admin',
    is_active: true,
    department: null,
    supervisor: null,
    last_login_at: new Date().toISOString(),
    created_at: addDaysIso(-120),
  },
  'finance@citramandiri.test': {
    id: 2,
    name: 'Siti Rahmawati',
    email: 'finance@citramandiri.test',
    employee_number: 'EMP-00002',
    role: 'finance',
    role_label: 'Manajer Keuangan',
    position: 'Finance Manager',
    phone: '0811-2000-0002',
    bank_name: 'BCA',
    bank_account_number: '5240112233',
    bank_account_name: 'Siti Rahmawati',
    is_active: true,
    department: {
      id: 2,
      name: 'Finance & Accounting',
      code: 'FIN',
      budget: 120000000,
      description: 'Divisi Keuangan & Akuntansi',
    },
    supervisor: null,
    last_login_at: new Date().toISOString(),
    created_at: addDaysIso(-110),
  },
  'supervisor@citramandiri.test': {
    id: 3,
    name: 'Budi Santoso',
    email: 'supervisor@citramandiri.test',
    employee_number: 'EMP-00003',
    role: 'supervisor',
    role_label: 'Supervisor',
    position: 'IT Supervisor',
    phone: '0812-3000-0003',
    bank_name: 'BCA',
    bank_account_number: '5240334455',
    bank_account_name: 'Budi Santoso',
    is_active: true,
    department: {
      id: 1,
      name: 'Information Technology',
      code: 'IT',
      budget: 150000000,
      description: 'Divisi Teknologi Informasi & Infrastruktur',
    },
    supervisor: null,
    last_login_at: new Date().toISOString(),
    created_at: addDaysIso(-100),
  },
  'supervisor.hr@citramandiri.test': {
    id: 5,
    name: 'Rina Wulandari',
    email: 'supervisor.hr@citramandiri.test',
    employee_number: 'EMP-00005',
    role: 'supervisor',
    role_label: 'Supervisor',
    position: 'HR Supervisor',
    phone: '0812-5000-0005',
    bank_name: 'BNI',
    bank_account_number: '0445566778',
    bank_account_name: 'Rina Wulandari',
    is_active: true,
    department: {
      id: 3,
      name: 'Human Resources',
      code: 'HR',
      budget: 100000000,
      description: 'Divisi Sumber Daya Manusia',
    },
    supervisor: null,
    last_login_at: new Date().toISOString(),
    created_at: addDaysIso(-95),
  },
  'supervisor.mkt@citramandiri.test': {
    id: 9,
    name: 'Hendra Wijaya',
    email: 'supervisor.mkt@citramandiri.test',
    employee_number: 'EMP-00009',
    role: 'supervisor',
    role_label: 'Supervisor',
    position: 'Marketing Supervisor',
    phone: '0812-9000-0009',
    bank_name: 'BRI',
    bank_account_number: '033401002299',
    bank_account_name: 'Hendra Wijaya',
    is_active: true,
    department: {
      id: 4,
      name: 'Sales & Marketing',
      code: 'MKT',
      budget: 200000000,
      description: 'Divisi Pemasaran & Penjualan',
    },
    supervisor: null,
    last_login_at: new Date().toISOString(),
    created_at: addDaysIso(-95),
  },
  'supervisor.ops@citramandiri.test': {
    id: 13,
    name: 'Dedi Kurniawan',
    email: 'supervisor.ops@citramandiri.test',
    employee_number: 'EMP-00013',
    role: 'supervisor',
    role_label: 'Supervisor',
    position: 'Operations Supervisor',
    phone: '0813-1300-0013',
    bank_name: 'Mandiri',
    bank_account_number: '130005544332',
    bank_account_name: 'Dedi Kurniawan',
    is_active: true,
    department: {
      id: 5,
      name: 'Operations',
      code: 'OPS',
      budget: 180000000,
      description: 'Divisi Operasional Lapangan',
    },
    supervisor: null,
    last_login_at: new Date().toISOString(),
    created_at: addDaysIso(-95),
  },
  'employee@citramandiri.test': {
    id: 4,
    name: 'Andi Pratama',
    email: 'employee@citramandiri.test',
    employee_number: 'EMP-00004',
    role: 'employee',
    role_label: 'Karyawan',
    position: 'Software Engineer',
    phone: '0812-3456-7890',
    bank_name: 'BCA',
    bank_account_number: '5240891123',
    bank_account_name: 'Andi Pratama',
    is_active: true,
    department: {
      id: 1,
      name: 'Information Technology',
      code: 'IT',
      budget: 150000000,
      description: 'Divisi Teknologi Informasi & Infrastruktur',
    },
    supervisor: {
      id: 3,
      name: 'Budi Santoso',
      email: 'supervisor@citramandiri.test',
      employee_number: 'EMP-00003',
      position: 'IT Supervisor',
    },
    last_login_at: new Date().toISOString(),
    created_at: addDaysIso(-90),
  },
};

export function getFallbackUser(email?: string): Pengguna {
  if (email) {
    const key = email.trim().toLowerCase();
    if (SEEDED_USERS[key]) {
      mockUser = { ...SEEDED_USERS[key] };
    }
  }
  return { ...mockUser };
}

export function updateFallbackUser(payload: Partial<Pengguna>): Pengguna {
  mockUser = { ...mockUser, ...payload };
  return { ...mockUser };
}

export function getFallbackDashboard(): DashboardPegawai {
  const counts: Record<string, number> = {
    draft: 0,
    submitted: 0,
    supervisor_approved: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const t of mockTrips) {
    counts[t.status] = (counts[t.status] ?? 0) + 1;
  }

  const approvedEstimatedCost = mockTrips
    .filter((t) => ['approved', 'completed'].includes(t.status))
    .reduce((acc, t) => acc + t.estimated_cost, 0);

  const verifiedExpenses = mockTrips
    .filter((t) => t.status === 'completed')
    .reduce((acc, t) => acc + (t.expense_report?.total_approved ?? 0), 0);

  const upcomingTrips = mockTrips.filter(
    (t) =>
      ['approved', 'supervisor_approved', 'submitted'].includes(t.status) &&
      (t.departure_date ?? '') >= addDaysIso(0)
  );

  const expenseReportsDue = mockTrips.filter(
    (t) =>
      t.status === 'approved' &&
      (!t.expense_report ||
        t.expense_report.status === 'draft' ||
        t.expense_report.status === 'returned')
  );

  return {
    requests_by_status: counts,
    this_year: {
      requests: mockTrips.length,
      approved_estimated_cost: approvedEstimatedCost,
      verified_expenses: verifiedExpenses,
    },
    current_trip: null,
    upcoming_trips: upcomingTrips.slice(0, 4),
    expense_reports_due: expenseReportsDue,
    pending_disbursements: [],
    recent_requests: mockTrips.slice(0, 6),
  };
}

export function listFallbackTrips(params?: {
  status?: string;
  search?: string;
  year?: number | string;
  page?: number;
}): ResponsPaginasi<Perjalanan> {
  let filtered = [...mockTrips];
  if (params?.status) {
    filtered = filtered.filter((t) => t.status === params.status);
  }
  if (params?.year) {
    const y = String(params.year);
    filtered = filtered.filter((t) => (t.departure_date ?? '').startsWith(y));
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.destination.toLowerCase().includes(q) ||
        t.request_number.toLowerCase().includes(q) ||
        t.purpose.toLowerCase().includes(q)
    );
  }

  const meta: MetaPaginasi = {
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: filtered.length,
    from: filtered.length > 0 ? 1 : null,
    to: filtered.length > 0 ? filtered.length : null,
  };

  return { data: filtered, meta };
}

export function getFallbackTrip(id: number): Perjalanan {
  const found = mockTrips.find((t) => t.id === id);
  if (!found) {
    throw new Error('Data perjalanan tidak ditemukan.');
  }
  return { ...found };
}

export function createFallbackTrip(payload: Record<string, any>): Perjalanan {
  const nextId = Math.max(0, ...mockTrips.map((t) => t.id)) + 1;
  const dep = String(payload.departure_date || addDaysIso(7));
  const ret = String(payload.return_date || dep);
  const d1 = new Date(dep);
  const d2 = new Date(ret);
  const durationDays = Math.max(
    1,
    Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1
  );
  const submitNow = Boolean(payload.submit);
  const status = submitNow ? 'submitted' : 'draft';
  const statusLabel = submitNow ? 'Diajukan' : 'Draf';

  const rawCosts: any[] = Array.isArray(payload.costs) ? payload.costs : [];
  const costEstimates = rawCosts.map((c, idx) => {
    const qty = Math.max(1, Number(c.quantity) || 1);
    const price = Math.max(0, Number(c.unit_price) || 0);
    return {
      id: nextId * 100 + idx + 1,
      category: (c.category || 'other') as KategoriBiaya,
      category_label: String(c.category || 'Lainnya'),
      description: c.description || null,
      quantity: qty,
      unit_price: price,
      subtotal: qty * price,
    };
  });

  const totalCost = costEstimates.reduce((acc, c) => acc + c.subtotal, 0);
  const tripType = (payload.trip_type || 'domestic') as JenisPerjalanan;
  const transportation = (payload.transportation || 'plane') as Transportasi;

  const created: Perjalanan = {
    id: nextId,
    request_number: `TR-2026-000${nextId}`,
    purpose: String(payload.purpose || 'Perjalanan Dinas'),
    description: payload.description ? String(payload.description) : null,
    destination: String(payload.destination || 'Bandung'),
    trip_type: tripType,
    trip_type_label:
      tripType === 'local'
        ? 'Dalam Kota'
        : tripType === 'international'
        ? 'Luar Negeri'
        : 'Luar Kota (Domestik)',
    transportation,
    transportation_label:
      fallbackOptions.transportations.find((t) => t.value === transportation)
        ?.label ?? 'Pesawat Udara',
    departure_date: dep,
    return_date: ret,
    duration_days: durationDays,
    estimated_cost: totalCost,
    advance_requested: Math.max(0, Number(payload.advance_requested) || 0),
    advance_approved: null,
    status,
    status_label: statusLabel,
    is_editable: !submitNow,
    is_cancellable: true,
    notes: payload.notes ? String(payload.notes) : null,
    submitted_at: submitNow ? new Date().toISOString() : null,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    employee: {
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email,
      employee_number: mockUser.employee_number,
      position: mockUser.position,
      department: mockUser.department
        ? {
            id: mockUser.department.id,
            name: mockUser.department.name,
            code: mockUser.department.code,
          }
        : null,
    },
    current_approver: submitNow
      ? {
          id: 3,
          name: 'Budi Santoso',
          email: 'supervisor@citramandiri.test',
          role: 'supervisor',
        }
      : null,
    cost_estimates: costEstimates,
    documents: [],
    approvals: [],
    expense_report: null,
    disbursements: [],
  };

  mockTrips = [created, ...mockTrips];
  return created;
}

export function updateFallbackTrip(
  id: number,
  payload: Record<string, any>
): Perjalanan {
  const idx = mockTrips.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error('Data perjalanan tidak ditemukan.');
  const existing = mockTrips[idx];

  const dep = String(payload.departure_date || existing.departure_date || addDaysIso(3));
  const ret = String(payload.return_date || existing.return_date || dep);
  const durationDays = Math.max(
    1,
    Math.round(
      (new Date(ret).getTime() - new Date(dep).getTime()) / 86400000
    ) + 1
  );

  const rawCosts: any[] = Array.isArray(payload.costs)
    ? payload.costs
    : existing.cost_estimates ?? [];
  const costEstimates = rawCosts.map((c, i) => {
    const qty = Math.max(1, Number(c.quantity) || 1);
    const price = Math.max(0, Number(c.unit_price) || 0);
    return {
      id: id * 100 + i + 1,
      category: (c.category || 'other') as KategoriBiaya,
      category_label: String(c.category || 'Lainnya'),
      description: c.description || null,
      quantity: qty,
      unit_price: price,
      subtotal: qty * price,
    };
  });

  const totalCost =
    costEstimates.length > 0
      ? costEstimates.reduce((acc, c) => acc + c.subtotal, 0)
      : existing.estimated_cost;

  const submitNow = Boolean(payload.submit);
  const nextStatus = submitNow ? 'submitted' : existing.status === 'rejected' ? 'draft' : existing.status;
  const nextStatusLabel =
    nextStatus === 'submitted' ? 'Diajukan' : nextStatus === 'draft' ? 'Draf' : existing.status_label;

  const updated: Perjalanan = {
    ...existing,
    purpose: String(payload.purpose ?? existing.purpose),
    description:
      payload.description !== undefined
        ? payload.description || null
        : existing.description,
    destination: String(payload.destination ?? existing.destination),
    trip_type: (payload.trip_type ?? existing.trip_type) as JenisPerjalanan,
    transportation: (payload.transportation ??
      existing.transportation) as Transportasi,
    departure_date: dep,
    return_date: ret,
    duration_days: durationDays,
    estimated_cost: totalCost,
    advance_requested: Number(
      payload.advance_requested ?? existing.advance_requested
    ),
    notes:
      payload.notes !== undefined ? payload.notes || null : existing.notes,
    status: nextStatus,
    status_label: nextStatusLabel,
    is_editable: nextStatus === 'draft',
    is_cancellable: true,
    submitted_at: submitNow ? new Date().toISOString() : existing.submitted_at,
    cost_estimates: costEstimates,
    updated_at: new Date().toISOString(),
  };

  mockTrips[idx] = updated;
  return updated;
}

export function submitFallbackTrip(id: number): Perjalanan {
  const idx = mockTrips.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error('Perjalanan tidak ditemukan.');
  const updated: Perjalanan = {
    ...mockTrips[idx],
    status: 'submitted',
    status_label: 'Diajukan',
    is_editable: false,
    is_cancellable: true,
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockTrips[idx] = updated;
  return updated;
}

export function cancelFallbackTrip(id: number, reason?: string): Perjalanan {
  const idx = mockTrips.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error('Perjalanan tidak ditemukan.');
  const updated: Perjalanan = {
    ...mockTrips[idx],
    status: 'cancelled',
    status_label: 'Dibatalkan',
    is_editable: false,
    is_cancellable: false,
    notes: reason || mockTrips[idx].notes,
    updated_at: new Date().toISOString(),
  };
  mockTrips[idx] = updated;
  return updated;
}

export function getFallbackExpenseWorkspace(tripId: number): RuangLaporan {
  const trip = getFallbackTrip(tripId);
  const advancePaid = (trip.disbursements ?? [])
    .filter((d) => d.type === 'advance' && d.status === 'paid')
    .reduce((acc, d) => acc + d.amount, 0);

  const report: LaporanBiaya = trip.expense_report ?? {
    id: tripId * 10,
    travel_request_id: tripId,
    summary: '',
    total_claimed: 0,
    total_approved: 0,
    difference: -advancePaid,
    settlement_type: advancePaid > 0 ? 'refund' : 'balanced',
    status: 'draft',
    status_label: 'Draf',
    is_editable: true,
    verification_note: null,
    submitted_at: null,
    verified_at: null,
    expenses: [],
  };

  const canManage =
    trip.status === 'approved' &&
    (report.status === 'draft' || report.status === 'returned');

  return {
    travel_request: trip,
    expense_report: report,
    advance_paid: advancePaid,
    categories: fallbackOptions.expense_categories,
    can_manage: canManage,
  };
}

export function addFallbackExpense(
  tripId: number,
  input: {
    category: KategoriBiaya;
    expense_date: string;
    description: string;
    amount: number;
    receipt?: File | null;
  }
): Pengeluaran {
  const idx = mockTrips.findIndex((t) => t.id === tripId);
  if (idx === -1) throw new Error('Perjalanan tidak ditemukan.');
  const workspace = getFallbackExpenseWorkspace(tripId);
  const report = workspace.expense_report!;

  const categoryLabel =
    fallbackOptions.expense_categories.find((c) => c.value === input.category)
      ?.label ?? input.category;

  const newExpense: Pengeluaran = {
    id: Date.now(),
    category: input.category,
    category_label: categoryLabel,
    expense_date: input.expense_date,
    description: input.description,
    amount: input.amount,
    approved_amount: null,
    status: 'pending',
    status_label: 'Menunggu',
    note: null,
    has_receipt: Boolean(input.receipt),
    receipt_original_name: input.receipt ? (input.receipt as any).name ?? 'bukti.jpg' : null,
    receipt_url: null,
  };

  const nextExpenses = [...(report.expenses ?? []), newExpense];
  const totalClaimed = nextExpenses.reduce((acc, e) => acc + e.amount, 0);
  const diff = totalClaimed - workspace.advance_paid;

  mockTrips[idx] = {
    ...mockTrips[idx],
    expense_report: {
      ...report,
      expenses: nextExpenses,
      total_claimed: totalClaimed,
      difference: diff,
      settlement_type:
        diff > 0 ? 'reimbursement' : diff < 0 ? 'refund' : 'balanced',
    },
  };

  return newExpense;
}

export function deleteFallbackExpense(tripId: number, expenseId: number): void {
  const idx = mockTrips.findIndex((t) => t.id === tripId);
  if (idx === -1 || !mockTrips[idx].expense_report) return;
  const workspace = getFallbackExpenseWorkspace(tripId);
  const report = mockTrips[idx].expense_report!;
  const nextExpenses = (report.expenses ?? []).filter((e) => e.id !== expenseId);
  const totalClaimed = nextExpenses.reduce((acc, e) => acc + e.amount, 0);
  const diff = totalClaimed - workspace.advance_paid;

  mockTrips[idx] = {
    ...mockTrips[idx],
    expense_report: {
      ...report,
      expenses: nextExpenses,
      total_claimed: totalClaimed,
      difference: diff,
      settlement_type:
        diff > 0 ? 'reimbursement' : diff < 0 ? 'refund' : 'balanced',
    },
  };
}

export function submitFallbackExpenseReportByTrip(
  tripId: number,
  summary: string
): LaporanBiaya {
  const idx = mockTrips.findIndex((t) => t.id === tripId);
  if (idx === -1) throw new Error('Perjalanan tidak ditemukan.');
  const workspace = getFallbackExpenseWorkspace(tripId);
  const report = workspace.expense_report!;

  const updated: LaporanBiaya = {
    ...report,
    summary,
    status: 'submitted',
    status_label: 'Diajukan',
    is_editable: false,
    submitted_at: new Date().toISOString(),
  };

  mockTrips[idx] = {
    ...mockTrips[idx],
    expense_report: updated,
  };
  return updated;
}

export function listFallbackNotifications(params?: {
  unread?: boolean;
}): { data: Notifikasi[]; unread_count: number } {
  const data = params?.unread
    ? mockNotifications.filter((n) => !n.read_at)
    : [...mockNotifications];
  const unreadCount = mockNotifications.filter((n) => !n.read_at).length;
  return { data, unread_count: unreadCount };
}

export function getFallbackUnreadCount(): number {
  return mockNotifications.filter((n) => !n.read_at).length;
}

export function markFallbackNotificationRead(id: string | number): void {
  const strId = String(id);
  mockNotifications = mockNotifications.map((n) =>
    String(n.id) === strId
      ? { ...n, read_at: n.read_at ?? new Date().toISOString() }
      : n
  );
}

export function markAllFallbackNotificationsRead(): void {
  const now = new Date().toISOString();
  mockNotifications = mockNotifications.map((n) => ({
    ...n,
    read_at: n.read_at ?? now,
  }));
}
