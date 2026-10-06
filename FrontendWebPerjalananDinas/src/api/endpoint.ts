import { keFormData, minta, mintaData, unduh } from '@/api/klien'
import type {
  Anggaran,
  DashboardAdmin,
  DashboardAtasan,
  DashboardKeuangan,
  DashboardPegawai,
  Departemen,
  DetailPerjalanan,
  HasilMasuk,
  JenisDokumen,
  JenisPencairan,
  KategoriBiaya,
  LaporanBiaya,
  LaporanKeuangan,
  LogAudit,
  MetodeBayar,
  Opsi,
  OpsiFormAnggaran,
  OpsiFormPengguna,
  OpsiFormPerjalanan,
  Pencairan,
  Pengguna,
  Peran,
  Perjalanan,
  Respons,
  ResponsHalaman,
  RingkasanAnggaran,
  RuangLaporan,
  StatusPencairan,
  StatusPerjalanan,
} from '@/api/tipe'

type Pesan = { message: string }

// ── Autentikasi & profil ──────────────────────────────────────────────

export const apiMasuk = (email: string, password: string) =>
  mintaData<HasilMasuk>('/login', {
    metode: 'POST',
    body: { email, password, platform: 'web', device_name: 'web' },
  })

export const apiKeluar = () => minta<Pesan>('/logout', { metode: 'POST' })

export const apiProfil = () => mintaData<Pengguna>('/profile')

export interface FormulirProfil {
  name?: string
  phone?: string | null
  photo?: File
  current_password?: string
  password?: string
  password_confirmation?: string
}

/** PHP tidak mem-parse multipart pada PUT, jadi dikirim sebagai POST + `_method`. */
export const apiUbahProfil = (isi: FormulirProfil) =>
  minta<Respons<Pengguna> & Pesan>('/profile', {
    metode: 'POST',
    formulir: keFormData({ ...isi, _method: 'PUT' }),
  })

// ── Dashboard per peran ───────────────────────────────────────────────

export const apiDashboardPegawai = () => mintaData<DashboardPegawai>('/employee/dashboard')
export const apiDashboardAtasan = () => mintaData<DashboardAtasan>('/supervisor/dashboard')
export const apiDashboardKeuangan = () => mintaData<DashboardKeuangan>('/finance/dashboard')
export const apiDashboardAdmin = () => mintaData<DashboardAdmin>('/admin/dashboard')

// ── Pegawai: perjalanan dinas ─────────────────────────────────────────

export interface FilterPerjalanan {
  page?: number
  per_page?: number
  status?: StatusPerjalanan | ''
  search?: string
  year?: number
}

export const apiDaftarPerjalanan = (filter: FilterPerjalanan = {}) =>
  minta<ResponsHalaman<Perjalanan>>('/employee/requests', { query: { ...filter } })

export const apiOpsiPerjalanan = () => mintaData<OpsiFormPerjalanan>('/employee/requests/create')

export const apiDetailPerjalananPegawai = (id: number) =>
  minta<DetailPerjalanan>(`/employee/requests/${id}`)

export interface BarisBiaya {
  category: KategoriBiaya | ''
  description: string
  quantity: number
  unit_price: number
}

export interface FormulirPerjalanan {
  purpose: string
  description: string
  destination: string
  trip_type: string
  transportation: string
  departure_date: string
  return_date: string
  advance_requested: number
  notes: string
  costs: BarisBiaya[]
  documents: Array<{ type: JenisDokumen; file: File }>
  remove_document_ids?: number[]
  submit: boolean
}

export const apiBuatPerjalanan = (isi: FormulirPerjalanan) =>
  minta<Respons<Perjalanan> & Pesan>('/employee/requests', {
    metode: 'POST',
    formulir: keFormData({ ...isi }),
  })

export const apiUbahPerjalanan = (id: number, isi: Partial<FormulirPerjalanan>) =>
  minta<Respons<Perjalanan> & Pesan>(`/employee/requests/${id}`, {
    metode: 'POST',
    formulir: keFormData({ ...isi, _method: 'PUT' }),
  })

export const apiAjukanPerjalanan = (id: number) =>
  minta<Respons<Perjalanan> & Pesan>(`/employee/requests/${id}`, {
    metode: 'PUT',
    body: { submit: true },
  })

export const apiBatalkanPerjalanan = (id: number) =>
  minta<Respons<Perjalanan> & Pesan>(`/employee/requests/${id}`, { metode: 'DELETE' })

// ── Pegawai: laporan biaya (LPJ) ──────────────────────────────────────

export const apiRuangLaporan = (perjalananId: number) =>
  mintaData<RuangLaporan>(`/employee/requests/${perjalananId}/expenses`)

export interface BaruPengeluaran {
  category: KategoriBiaya
  expense_date: string
  description: string
  amount: number
  receipt?: File
}

export const apiSimpanLaporan = (
  perjalananId: number,
  isi: { expenses?: BaruPengeluaran[]; summary?: string; submit?: boolean },
) =>
  minta<Respons<LaporanBiaya> & Pesan>(`/employee/requests/${perjalananId}/expenses`, {
    metode: 'POST',
    formulir: keFormData({ ...isi }),
  })

export const apiHapusPengeluaran = (perjalananId: number, pengeluaranId: number) =>
  minta<Pesan>(`/employee/requests/${perjalananId}/expenses/${pengeluaranId}`, {
    metode: 'DELETE',
  })

// ── Atasan: persetujuan ───────────────────────────────────────────────

export type FilterPersetujuan = 'pending' | 'decided' | 'all'

export const apiAntreanAtasan = (
  filter: { status?: FilterPersetujuan; search?: string; page?: number; per_page?: number } = {},
) => minta<ResponsHalaman<Perjalanan>>('/supervisor/approvals', { query: { ...filter } })

export const apiDetailPerjalananAtasan = (id: number) =>
  minta<DetailPerjalanan>(`/supervisor/approvals/${id}`)

export const apiSetujuiAtasan = (id: number, note?: string) =>
  minta<Respons<Perjalanan> & Pesan>(`/supervisor/approvals/${id}/approve`, {
    metode: 'POST',
    body: { note },
  })

export const apiTolakAtasan = (id: number, note: string) =>
  minta<Respons<Perjalanan> & Pesan>(`/supervisor/approvals/${id}/reject`, {
    metode: 'POST',
    body: { note },
  })

// ── Keuangan: verifikasi ──────────────────────────────────────────────

export type TahapKeuangan = 'finance' | 'expense_report'

export const apiAntreanKeuangan = (
  filter: { stage?: TahapKeuangan | ''; search?: string; department_id?: number; page?: number; per_page?: number } = {},
) => minta<ResponsHalaman<Perjalanan>>('/finance/approvals', { query: { ...filter } })

export const apiDetailPerjalananKeuangan = (id: number) =>
  minta<DetailPerjalanan>(`/finance/approvals/${id}`)

export interface IsiVerifikasi {
  note?: string
  advance_approved?: number
  expenses?: Array<{ id: number; approved_amount: number; note?: string }>
}

export const apiVerifikasiKeuangan = (id: number, isi: IsiVerifikasi) =>
  minta<Respons<Perjalanan> & Pesan>(`/finance/approvals/${id}/verify`, {
    metode: 'POST',
    body: isi,
  })

export const apiTolakKeuangan = (id: number, note: string) =>
  minta<Respons<Perjalanan> & Pesan>(`/finance/approvals/${id}/reject`, {
    metode: 'POST',
    body: { note },
  })

// ── Keuangan: pencairan ───────────────────────────────────────────────

export const apiDaftarPencairan = (
  filter: { status?: StatusPencairan | ''; type?: JenisPencairan | ''; search?: string; page?: number } = {},
) =>
  minta<
    ResponsHalaman<Pencairan> & {
      filters: { statuses: Opsi[]; types: Opsi[]; methods: Opsi<MetodeBayar>[] }
    }
  >('/finance/disbursements', { query: { per_page: 15, ...filter } })

export const apiBayarPencairan = (
  id: number,
  isi: { method: MetodeBayar; reference_number?: string; paid_at?: string; notes?: string },
) =>
  minta<Respons<Pencairan> & Pesan>(`/finance/disbursements/${id}/pay`, {
    metode: 'POST',
    body: isi,
  })

// ── Keuangan: anggaran & laporan ──────────────────────────────────────

export const apiDaftarAnggaran = (
  filter: { year?: number; month?: number; department_id?: number; page?: number } = {},
) =>
  minta<ResponsHalaman<Anggaran> & { summary: RingkasanAnggaran }>('/finance/budgets', {
    query: { per_page: 15, ...filter },
  })

export const apiOpsiAnggaran = () => mintaData<OpsiFormAnggaran>('/finance/budgets/create')

export const apiBuatAnggaran = (isi: {
  department_id: number
  year: number
  month: number | null
  amount: number
  notes?: string
}) => minta<Respons<Anggaran> & Pesan>('/finance/budgets', { metode: 'POST', body: isi })

export interface FilterLaporanKeuangan {
  year?: number
  month?: number
  department_id?: number
}

export const apiLaporanKeuangan = (filter: FilterLaporanKeuangan) =>
  mintaData<LaporanKeuangan>('/finance/reports', { query: { ...filter } })

export const apiUnduhLaporanKeuangan = (filter: FilterLaporanKeuangan, format: 'pdf' | 'xlsx') =>
  unduh('/finance/reports', { ...filter, format }, `laporan-keuangan-${filter.year ?? ''}.${format}`)

// ── Super admin ───────────────────────────────────────────────────────

export const apiDaftarPengguna = (
  filter: {
    search?: string
    role?: Peran | ''
    status?: 'active' | 'inactive' | ''
    department_id?: number
    page?: number
  } = {},
) => minta<ResponsHalaman<Pengguna>>('/admin/users', { query: { per_page: 15, ...filter } })

export const apiOpsiPengguna = () => mintaData<OpsiFormPengguna>('/admin/users/create')

export interface FormulirPengguna {
  name: string
  email: string
  password?: string
  role: Peran
  employee_number: string | null
  position: string | null
  phone: string | null
  department_id: number | null
  supervisor_id: number | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  is_active: boolean
}

export const apiBuatPengguna = (isi: FormulirPengguna) =>
  minta<Respons<Pengguna> & Pesan>('/admin/users', { metode: 'POST', body: isi })

export const apiUbahPengguna = (id: number, isi: Partial<FormulirPengguna>) =>
  minta<Respons<Pengguna> & Pesan>(`/admin/users/${id}`, { metode: 'PUT', body: isi })

export const apiHapusPengguna = (id: number) =>
  minta<Pesan>(`/admin/users/${id}`, { metode: 'DELETE' })

export const apiDaftarDepartemen = () => mintaData<Departemen[]>('/admin/departments')

export const apiBuatDepartemen = (isi: { code: string; name: string; is_active: boolean }) =>
  minta<Respons<Departemen> & Pesan>('/admin/departments', { metode: 'POST', body: isi })

export const apiUbahDepartemen = (
  id: number,
  isi: Partial<{ code: string; name: string; is_active: boolean }>,
) => minta<Respons<Departemen> & Pesan>(`/admin/departments/${id}`, { metode: 'PUT', body: isi })

export const apiHapusDepartemen = (id: number) =>
  minta<Pesan>(`/admin/departments/${id}`, { metode: 'DELETE' })

export const apiLogAudit = (
  filter: { search?: string; action?: string; date_from?: string; date_to?: string; page?: number } = {},
) =>
  minta<ResponsHalaman<LogAudit> & { filters: { actions: Opsi[] } }>('/admin/audit-logs', {
    query: { per_page: 20, ...filter },
  })
