// Tipe data domain Travel Portal — PT. Citra Mandiri
// Selaras 100% dengan FrontendWebPerjalananDinas/src/api/tipe.ts & Laravel API Resources

export type Peran = 'employee' | 'supervisor' | 'finance' | 'admin';

export type StatusPerjalanan =
  | 'draft'
  | 'submitted'
  | 'supervisor_approved'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled';

export type JenisPerjalanan = 'local' | 'domestic' | 'international';

export type Transportasi =
  | 'plane'
  | 'train'
  | 'bus'
  | 'ship'
  | 'office_vehicle'
  | 'private_vehicle'
  | 'other';

export type KategoriBiaya =
  | 'transportation'
  | 'accommodation'
  | 'daily_allowance'
  | 'meals'
  | 'other';

export type JenisDokumen =
  | 'assignment_letter'
  | 'invitation'
  | 'itinerary'
  | 'other';

export type StatusLaporan =
  | 'draft'
  | 'submitted'
  | 'verified'
  | 'returned'
  | 'settled';

export type StatusPengeluaran = 'pending' | 'approved' | 'rejected';

export type StatusPencairan = 'pending' | 'processing' | 'paid' | 'failed';

export type JenisPencairan = 'advance' | 'reimbursement' | 'refund_To_company';

export type MetodeBayar = 'bank_transfer' | 'cash' | 'payroll';

export interface Departemen {
  id: number;
  name: string;
  code: string;
  budget: number;
  description?: string | null;
  users_count?: number;
}

export interface PenggunaRingkas {
  id: number;
  name: string;
  email: string;
  employee_number?: string | null;
  position?: string | null;
}

export interface Pengguna {
  id: number;
  name: string;
  email: string;
  employee_number: string | null;
  role: Peran;
  role_label: string;
  position: string | null;
  phone: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  is_active: boolean;
  department: Departemen | null;
  supervisor: PenggunaRingkas | null;
  last_login_at: string | null;
  created_at: string | null;
}

export interface RincianBiaya {
  id?: number;
  category: KategoriBiaya;
  category_label?: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface DokumenPerjalanan {
  id: number;
  type: JenisDokumen;
  type_label: string;
  original_name: string;
  mime_type: string | null;
  size: number;
  notes: string | null;
  url: string;
  uploaded_by?: { id: number; name: string };
  created_at: string | null;
}

export interface JejakPersetujuan {
  id: number;
  stage: 'supervisor' | 'finance';
  stage_label: string;
  decision: 'approved' | 'rejected';
  decision_label: string;
  note: string | null;
  approver?: {
    id: number;
    name: string;
    email: string;
    position: string | null;
  };
  decided_at: string | null;
}

export interface Pengeluaran {
  id: number;
  category: KategoriBiaya;
  category_label: string;
  expense_date: string | null;
  description: string;
  amount: number;
  approved_amount: number | null;
  status: StatusPengeluaran;
  status_label: string;
  note: string | null;
  has_receipt: boolean;
  receipt_original_name: string | null;
  receipt_url: string | null;
}

export interface LaporanBiaya {
  id: number;
  travel_request_id: number;
  summary: string | null;
  total_claimed: number;
  total_approved: number;
  difference: number;
  settlement_type: 'reimbursement' | 'refund' | 'balanced' | null;
  status: StatusLaporan;
  status_label: string;
  is_editable: boolean;
  verification_note: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  verifier?: { id: number; name: string; email: string };
  expenses?: Pengeluaran[];
  travel_request?: Perjalanan;
}

export interface Pencairan {
  id: number;
  travel_request_id: number;
  type: JenisPencairan;
  type_label: string;
  amount: number;
  status: StatusPencairan;
  status_label: string;
  method: MetodeBayar | null;
  method_label: string | null;
  reference_number: string | null;
  recipient_bank_name: string | null;
  recipient_account_number: string | null;
  recipient_account_name: string | null;
  paid_at: string | null;
  notes: string | null;
  receipt_url: string | null;
  processor?: { id: number; name: string; email: string };
  travel_request?: Perjalanan;
  created_at: string | null;
}

export interface Perjalanan {
  id: number;
  request_number: string;
  purpose: string;
  description: string | null;
  destination: string;
  trip_type: JenisPerjalanan;
  trip_type_label: string;
  transportation: Transportasi;
  transportation_label: string;
  departure_date: string | null;
  return_date: string | null;
  duration_days: number;
  estimated_cost: number;
  advance_requested: number;
  advance_approved: number | null;
  status: StatusPerjalanan;
  status_label: string;
  is_editable: boolean;
  is_cancellable: boolean;
  notes: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  employee?: {
    id: number;
    name: string;
    email: string;
    employee_number: string | null;
    position: string | null;
    bank_name?: string | null;
    bank_account_number?: string | null;
    bank_account_name?: string | null;
    department?: { id: number; name: string; code: string } | null;
  };
  current_approver?: {
    id: number;
    name: string;
    email: string;
    role: Peran;
  } | null;
  cost_estimates?: RincianBiaya[];
  documents?: DokumenPerjalanan[];
  approvals?: JejakPersetujuan[];
  expense_report?: LaporanBiaya | null;
  disbursements?: Pencairan[];
}

export interface MetaPaginasi {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface ResponsPaginasi<T> {
  data: T[];
  meta: MetaPaginasi;
}

export interface OpsiFormPerjalanan {
  trip_types: { value: JenisPerjalanan; label: string }[];
  transportations: { value: Transportasi; label: string }[];
  expense_categories: {
    value: KategoriBiaya;
    label: string;
    requires_receipt: boolean;
  }[];
  document_types: { value: JenisDokumen; label: string }[];
  approver: {
    id: number;
    name: string;
    email: string;
    position: string | null;
  } | null;
  department: {
    id: number;
    name: string;
    code: string;
    budget: number;
  } | null;
}

export interface DashboardPegawai {
  requests_by_status: Record<string, number>;
  this_year: {
    requests: number;
    approved_estimated_cost: number;
    verified_expenses: number;
  };
  current_trip: Perjalanan | null;
  upcoming_trips: Perjalanan[];
  expense_reports_due: Perjalanan[];
  pending_disbursements: Pencairan[];
  recent_requests: Perjalanan[];
}

export interface Notifikasi {
  id: string;
  event: string;
  travel_request_id: number | null;
  request_number: string | null;
  purpose: string | null;
  destination: string | null;
  status: string | null;
  actor_id: number | null;
  actor_name: string | null;
  note: string | null;
  extra: Record<string, unknown>;
  read_at: string | null;
  created_at: string | null;
}

export interface RuangLaporan {
  travel_request: Perjalanan;
  expense_report: LaporanBiaya | null;
  advance_paid: number;
  categories: {
    value: KategoriBiaya;
    label: string;
    requires_receipt: boolean;
  }[];
  can_manage: boolean;
}

