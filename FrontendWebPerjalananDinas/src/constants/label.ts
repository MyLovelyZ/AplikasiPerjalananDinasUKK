import type {
  JenisDokumen,
  JenisPencairan,
  JenisPenyelesaian,
  JenisPerjalanan,
  KategoriBiaya,
  MetodeBayar,
  Notifikasi,
  Peran,
  StatusLaporan,
  StatusPencairan,
  StatusPengeluaran,
  StatusPerjalanan,
  TahapPersetujuan,
  Transportasi,
} from '@/api/tipe'
import { rupiah } from '@/utils/format'
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

/**
 * Judul dan kalimat notifikasi dalam bahasa Indonesia, disusun dari data
 * notifikasi. Jenis yang belum dikenal memakai ringkasan Inggris dari backend.
 */
export function teksNotifikasi(n: Notifikasi): { judul: string; pesan: string } {
  const { request_number: nomor, actor_name, amount, note, stage, settlement_type, disbursement_type, completed } = n.details
  const pelaku = actor_name ?? 'Seseorang'
  const jumlah = rupiah(amount ?? 0)
  const alasan = note ? ` Catatan: “${note}”` : ''

  switch (n.event) {
    case 'request_submitted':
      return { judul: 'Pengajuan menunggu persetujuan', pesan: `${pelaku} mengajukan perjalanan ${nomor}.` }
    case 'request_cancelled':
      return { judul: 'Pengajuan dibatalkan', pesan: `${pelaku} membatalkan perjalanan ${nomor}.` }
    case 'request_supervisor_approved':
      return {
        judul: 'Disetujui atasan',
        pesan: `${pelaku} menyetujui perjalanan ${nomor}. Kini menunggu verifikasi anggaran oleh Keuangan.`,
      }
    case 'request_awaiting_finance':
      return {
        judul: 'Menunggu verifikasi anggaran',
        pesan: `Perjalanan ${nomor} telah disetujui atasan dan perlu dicek anggarannya.`,
      }
    case 'request_approved':
      return {
        judul: 'Perjalanan disetujui',
        pesan: amount
          ? `Perjalanan ${nomor} disetujui dengan uang muka ${jumlah}.`
          : `Perjalanan ${nomor} disetujui Keuangan.`,
      }
    case 'request_rejected':
      return {
        judul: 'Pengajuan ditolak',
        pesan: `${pelaku} menolak perjalanan ${nomor}${stage === 'finance' ? ' pada verifikasi anggaran' : ''}.${alasan}`,
      }
    case 'expense_report_submitted':
      return {
        judul: 'Laporan biaya menunggu verifikasi',
        pesan: `${pelaku} mengirim laporan biaya perjalanan ${nomor} sebesar ${jumlah}.`,
      }
    case 'expense_report_returned':
      return {
        judul: 'Laporan biaya dikembalikan',
        pesan: `Laporan biaya perjalanan ${nomor} perlu diperbaiki lalu dikirim ulang.${alasan}`,
      }
    case 'expense_report_verified':
      return {
        judul: 'Laporan biaya diverifikasi',
        pesan:
          settlement_type === 'reimbursement'
            ? `Laporan biaya perjalanan ${nomor} diverifikasi. Kekurangan ${jumlah} akan dibayarkan kepada Anda.`
            : settlement_type === 'refund'
              ? `Laporan biaya perjalanan ${nomor} diverifikasi. Mohon kembalikan sisa uang muka ${jumlah}.`
              : `Laporan biaya perjalanan ${nomor} diverifikasi. Tidak ada selisih, perjalanan selesai.`,
      }
    case 'disbursement_paid': {
      const selesai = completed ? ' Perjalanan kini selesai.' : ''
      return disbursement_type === 'refund'
        ? { judul: 'Pengembalian diterima', pesan: `Keuangan menerima pengembalian ${jumlah} untuk perjalanan ${nomor}.${selesai}` }
        : {
            judul: 'Dana dicairkan',
            pesan: `Keuangan membayarkan ${(disbursement_type ? LABEL_JENIS_PENCAIRAN[disbursement_type] : 'dana').toLowerCase()} ${jumlah} untuk perjalanan ${nomor}.${selesai}`,
          }
    }
    default:
      return { judul: 'Notifikasi', pesan: n.message ?? '' }
  }
}

/** Opsi `<select>` dari peta label, dengan urutan kunci yang ditulis di atas. */
export const opsiDari = <K extends string>(peta: Record<K, string>) =>
  (Object.entries(peta) as Array<[K, string]>).map(([value, label]) => ({ value, label }))
