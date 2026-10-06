import type {
  JenisDokumen,
  JenisPencairan,
  JenisPenyelesaian,
  JenisPerjalanan,
  KategoriBiaya,
  MetodeBayar,
  Peran,
  StatusLaporan,
  StatusPencairan,
  StatusPengeluaran,
  StatusPerjalanan,
  TahapPersetujuan,
  Transportasi,
} from '@/api/tipe'
import type { WarnaStatus } from '@/utils/format'

/**
 * Backend mengirim label berbahasa Inggris; antarmuka memakai label
 * Indonesia sendiri berdasarkan nilai enum yang stabil.
 */

interface Rupa {
  label: string
  warna: WarnaStatus
}

export const RUPA_STATUS_PERJALANAN: Record<StatusPerjalanan, Rupa> = {
  draft: { label: 'Draf', warna: 'netral' },
  submitted: { label: 'Menunggu Atasan', warna: 'kuning' },
  supervisor_approved: { label: 'Menunggu Keuangan', warna: 'biru' },
  approved: { label: 'Disetujui', warna: 'hijau' },
  rejected: { label: 'Ditolak', warna: 'merah' },
  cancelled: { label: 'Dibatalkan', warna: 'merah' },
  completed: { label: 'Selesai', warna: 'ungu' },
}

export const RUPA_STATUS_LAPORAN: Record<StatusLaporan, Rupa> = {
  draft: { label: 'Draf', warna: 'netral' },
  submitted: { label: 'Menunggu Verifikasi', warna: 'kuning' },
  returned: { label: 'Dikembalikan', warna: 'ungu' },
  verified: { label: 'Terverifikasi', warna: 'hijau' },
}

export const RUPA_STATUS_PENGELUARAN: Record<StatusPengeluaran, Rupa> = {
  pending: { label: 'Belum diperiksa', warna: 'netral' },
  approved: { label: 'Disetujui', warna: 'hijau' },
  partially_approved: { label: 'Disetujui sebagian', warna: 'kuning' },
  rejected: { label: 'Ditolak', warna: 'merah' },
}

export const RUPA_STATUS_PENCAIRAN: Record<StatusPencairan, Rupa> = {
  pending: { label: 'Menunggu Pembayaran', warna: 'kuning' },
  paid: { label: 'Dibayar', warna: 'hijau' },
}

export const LABEL_PERAN: Record<Peran, string> = {
  super_admin: 'Super Admin',
  supervisor: 'Atasan',
  finance: 'Keuangan',
  employee: 'Pegawai',
}

export const LABEL_JENIS_PERJALANAN: Record<JenisPerjalanan, string> = {
  local: 'Dalam kota',
  domestic: 'Luar kota',
  international: 'Luar negeri',
}

export const LABEL_TRANSPORTASI: Record<Transportasi, string> = {
  plane: 'Pesawat',
  train: 'Kereta api',
  ship: 'Kapal laut',
  bus: 'Bus',
  office_vehicle: 'Kendaraan dinas',
  private_vehicle: 'Kendaraan pribadi',
  other: 'Lainnya',
}

export const LABEL_KATEGORI_BIAYA: Record<KategoriBiaya, string> = {
  transportation: 'Transportasi',
  accommodation: 'Penginapan',
  daily_allowance: 'Uang harian',
  meals: 'Konsumsi',
  other: 'Lainnya',
}

export const LABEL_JENIS_DOKUMEN: Record<JenisDokumen, string> = {
  invitation: 'Undangan',
  terms_of_reference: 'Kerangka acuan (TOR)',
  assignment_letter: 'Surat tugas',
  other: 'Lainnya',
}

export const LABEL_TAHAP: Record<TahapPersetujuan, string> = {
  supervisor: 'Persetujuan atasan',
  finance: 'Verifikasi anggaran',
  expense_report: 'Verifikasi laporan biaya',
}

export const LABEL_JENIS_PENCAIRAN: Record<JenisPencairan, string> = {
  advance: 'Uang muka',
  reimbursement: 'Reimbursement',
  refund: 'Pengembalian kelebihan',
}

export const LABEL_METODE_BAYAR: Record<MetodeBayar, string> = {
  transfer: 'Transfer bank',
  cash: 'Tunai',
  payroll: 'Payroll',
}

export const LABEL_PENYELESAIAN: Record<JenisPenyelesaian, string> = {
  reimbursement: 'Perusahaan membayar kekurangan',
  refund: 'Pegawai mengembalikan kelebihan',
  none: 'Tidak ada selisih',
}

export const LABEL_AKSI_AUDIT: Record<string, string> = {
  login: 'Masuk',
  logout: 'Keluar',
  created: 'Dibuat',
  updated: 'Diubah',
  deleted: 'Dihapus',
  submitted: 'Diajukan',
  cancelled: 'Dibatalkan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  verified: 'Diverifikasi',
  paid: 'Dibayar',
  exported: 'Diekspor',
}

export const NAMA_BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

/** Opsi `<select>` dari peta label, dengan urutan kunci yang ditulis di atas. */
export const opsiDari = <K extends string>(peta: Record<K, string>) =>
  (Object.entries(peta) as Array<[K, string]>).map(([value, label]) => ({ value, label }))
