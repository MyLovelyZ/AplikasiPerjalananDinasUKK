/** Kolom dibiarkan snake_case persis seperti respons API Laravel. */

export interface Respons<T> {
  data: T
  message?: string
}

/** Bentuk paginasi bawaan Laravel API Resource. */
export interface ResponsHalaman<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
  }
}

export interface Opsi<T extends string | number = string> {
  value: T
  label: string
}

// ── Enumerasi ─────────────────────────────────────────────────────────

export type Peran = 'super_admin' | 'supervisor' | 'finance' | 'employee'

export type StatusPerjalanan =
  | 'draft'
  | 'submitted'
  | 'supervisor_approved'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'completed'

export type JenisPerjalanan = 'local' | 'domestic' | 'international'

export type Transportasi =
  | 'plane'
  | 'train'
  | 'ship'
  | 'bus'
  | 'office_vehicle'
  | 'private_vehicle'
  | 'other'

export type KategoriBiaya = 'transportation' | 'accommodation' | 'daily_allowance' | 'meals' | 'other'

export type JenisDokumen = 'invitation' | 'terms_of_reference' | 'assignment_letter' | 'other'

export type TahapPersetujuan = 'supervisor' | 'finance' | 'expense_report'

export type StatusLaporan = 'draft' | 'submitted' | 'returned' | 'verified'

export type StatusPengeluaran = 'pending' | 'approved' | 'partially_approved' | 'rejected'

export type JenisPencairan = 'advance' | 'reimbursement' | 'refund'

export type StatusPencairan = 'pending' | 'paid'

export type MetodeBayar = 'transfer' | 'cash' | 'payroll'

export type JenisPenyelesaian = 'reimbursement' | 'refund' | 'none'

// ── Pengguna & organisasi ─────────────────────────────────────────────

export interface Departemen {
  id: number
  code: string
  name: string
  is_active: boolean
  users_count?: number
  created_at?: string
  updated_at?: string
}

export interface RingkasPengguna {
  id: number
  name: string
  email: string
  role: Peran
  role_label: string
  position: string | null
  profile_photo_url: string | null
}

export interface Pengguna extends RingkasPengguna {
  employee_number: string | null
  phone: string | null
  department_id: number | null
  department?: Departemen | null
  supervisor_id: number | null
  supervisor?: RingkasPengguna | null
  bank_name?: string | null
  bank_account_number?: string | null
  bank_account_name?: string | null
  is_active: boolean
  last_login_at: string | null
  subordinates_count?: number
  created_at: string
  updated_at: string
}

export interface HasilMasuk {
  token: string
  token_type: string
  user: Pengguna
}

// ── Perjalanan dinas ──────────────────────────────────────────────────

export interface EstimasiBiaya {
  id: number
  category: KategoriBiaya
  category_label: string
  description: string | null
  quantity: number
  unit_price: number
  subtotal: number
}

export interface DokumenPendukung {
  id: number
  type: JenisDokumen
  type_label: string
  original_name: string
  mime_type: string
  size: number
  url: string
  created_at: string
}

export interface Persetujuan {
  id: number
  stage: TahapPersetujuan
  stage_label: string
  decision: 'approved' | 'rejected'
  decision_label: string
  note: string | null
  approver?: RingkasPengguna
  decided_at: string
}

export interface Pengeluaran {
  id: number
  category: KategoriBiaya
  category_label: string
  expense_date: string
  description: string
  amount: number
  approved_amount: number | null
  status: StatusPengeluaran
  status_label: string
  verification_note: string | null
  receipt: { name: string; mime_type: string; size: number; url: string } | null
  created_at: string
}

export interface LaporanBiaya {
  id: number
  travel_request_id: number
  status: StatusLaporan
  status_label: string
  is_editable: boolean
  summary: string | null
  total_claimed?: number
  total_approved: number | null
  advance_amount: number | null
  difference: number | null
  settlement_type: JenisPenyelesaian | null
  settlement_type_label: string | null
  submitted_at: string | null
  verified_at: string | null
  verification_note: string | null
  verifier?: RingkasPengguna | null
  expenses?: Pengeluaran[]
  created_at: string
  updated_at: string
}

export interface Anggaran {
  id: number
  department_id: number
  department?: Departemen
  year: number
  month: number | null
  period_label: string
  amount: number
  committed_amount?: number
  spent_amount?: number
  remaining_amount?: number
  utilization_percentage?: number
  notes: string | null
  creator?: RingkasPengguna
  created_at: string
  updated_at: string
}

export interface Pencairan {
  id: number
  travel_request_id: number
  type: JenisPencairan
  type_label: string
  amount: number
  status: StatusPencairan
  status_label: string
  method: MetodeBayar | null
  method_label: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  reference_number: string | null
  paid_at: string | null
  notes: string | null
  processor?: RingkasPengguna | null
  travel_request?: Perjalanan
  created_at: string
}

export interface Perjalanan {
  id: number
  request_number: string
  purpose: string
  description: string | null
  destination: string
  trip_type: JenisPerjalanan
  trip_type_label: string
  transportation: Transportasi
  transportation_label: string
  departure_date: string
  return_date: string
  duration_days: number
  estimated_cost: number
  advance_requested: number
  advance_approved: number | null
  status: StatusPerjalanan
  status_label: string
  is_editable: boolean
  is_cancellable: boolean
  /** Hanya ada bila relasi laporan ikut dimuat. */
  finance_stage?: 'finance' | 'expense_report' | null
  notes: string | null
  submitted_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  requester?: Pengguna
  department?: Departemen
  budget?: Anggaran | null
  cost_estimates?: EstimasiBiaya[]
  documents?: DokumenPendukung[]
  approvals?: Persetujuan[]
  expense_report?: LaporanBiaya | null
  disbursements?: Pencairan[]
}

export interface OpsiFormPerjalanan {
  trip_types: Opsi<JenisPerjalanan>[]
  transportations: Opsi<Transportasi>[]
  expense_categories: Opsi<KategoriBiaya>[]
  document_types: Opsi<JenisDokumen>[]
  department: Departemen | null
  approver: RingkasPengguna | null
  max_document_size_kb: number
}

export interface PemeriksaanAnggaran {
  budget: Anggaran | null
  required_amount: number
  remaining_amount: number
  is_sufficient: boolean
  message: string
}

export interface DetailPerjalanan {
  data: Perjalanan
  /** Dari endpoint atasan: apakah pengguna boleh memutuskan. */
  can_review?: boolean
  /** Dari endpoint keuangan, saat menunggu verifikasi anggaran. */
  budget_check?: PemeriksaanAnggaran | null
}

export interface RuangLaporan {
  travel_request: Perjalanan
  can_manage: boolean
  advance_paid: number
  expense_categories: Array<Opsi<KategoriBiaya> & { requires_receipt: boolean }>
}

// ── Dashboard ─────────────────────────────────────────────────────────

export interface HitunganStatus {
  status: StatusPerjalanan
  label: string
  total: number
}

export interface DashboardPegawai {
  requests_by_status: HitunganStatus[]
  this_year: {
    requests: number
    approved_estimated_cost: number
    verified_expenses: number
  }
  current_trip: Perjalanan | null
  upcoming_trips: Perjalanan[]
  expense_reports_due: Perjalanan[]
  pending_disbursements: Pencairan[]
  recent_requests: Perjalanan[]
}

export interface DashboardAtasan {
  pending_approvals: number
  my_decisions_this_month: { approved: number; rejected: number }
  team: {
    members: number
    committed_cost_this_year: number
    requests_by_status_this_year: HitunganStatus[]
    on_trip_today: Perjalanan[]
  }
  oldest_pending: Perjalanan[]
}

export interface TotalAnggaran {
  amount: number
  committed_amount: number
  spent_amount: number
  remaining_amount: number
  utilization_percentage: number
}

export interface TotalKategori {
  category: KategoriBiaya
  label: string
  total: number
}

export interface TotalBulan {
  month: number
  label: string
  total: number
}

export interface DashboardKeuangan {
  spending: {
    this_month: number
    last_month: number
    change_amount: number
    change_percentage: number | null
    this_month_by_category: TotalKategori[]
    last_month_by_category: TotalKategori[]
    monthly_trend: TotalBulan[]
  }
  budget: TotalAnggaran & {
    year: number
    by_department: Array<TotalAnggaran & { department: Departemen }>
  }
  queues: {
    budget_verification: number
    expense_report_verification: number
    pending_disbursements: number
    pending_disbursement_amount: number
  }
  oldest_pending_disbursements: Pencairan[]
}

export interface LogAudit {
  id: number
  action: string
  action_label: string
  description: string
  subject_type: string | null
  subject_id: number | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  user?: RingkasPengguna | null
  created_at: string
}

export interface DashboardAdmin {
  users: {
    total: number
    active: number
    inactive: number
    by_role: Array<{ role: Peran; label: string; total: number }>
  }
  departments: { total: number; active: number }
  travel_requests_this_year: { total: number; by_status: HitunganStatus[] }
  logins_today: number
  recent_activities: LogAudit[]
}

// ── Keuangan ──────────────────────────────────────────────────────────

export interface RingkasanAnggaran {
  year: number
  amount: number
  committed_amount: number
  spent_amount: number
  remaining_amount: number
}

export interface OpsiFormAnggaran {
  departments: Array<Pick<Departemen, 'id' | 'code' | 'name'>>
  years: number[]
  months: Opsi<number>[]
}

export interface LaporanKeuangan {
  period: { year: number; month: number | null; label: string; from: string; to: string }
  department: Pick<Departemen, 'id' | 'code' | 'name'> | null
  generated_at: string
  summary: {
    trips_submitted: number
    trips_approved: number
    estimated_cost: number
    realized_spending: number
    advances_paid: number
    reimbursements_paid: number
    refunds_received: number
    budget_amount: number
    budget_committed: number
    budget_remaining: number
  }
  by_category: TotalKategori[]
  by_month: TotalBulan[]
  by_department: Array<{
    code: string
    department: string
    trips_approved: number
    estimated_cost: number
    realized_spending: number
    budget_amount: number
  }>
  budgets: Array<{
    department: string
    period: string
    amount: number
    committed_amount: number
    spent_amount: number
    remaining_amount: number
  }>
  trips: Array<{
    request_number: string
    requester: string
    department: string
    purpose: string
    destination: string
    departure_date: string
    return_date: string
    status: StatusPerjalanan
    status_label: string
    estimated_cost: number
    realized_cost: number | null
  }>
}

// ── Admin ─────────────────────────────────────────────────────────────

export interface OpsiFormPengguna {
  roles: Opsi<Peran>[]
  departments: Array<Pick<Departemen, 'id' | 'code' | 'name'>>
  supervisors: Array<{ id: number; name: string; email: string; department_id: number | null }>
}
