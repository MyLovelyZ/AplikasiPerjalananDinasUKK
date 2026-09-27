import type { StatusSppd } from '@/api/tipe'

/** Pemformat angka & tanggal berbahasa Indonesia, dipakai seluruh halaman. */

const RUPIAH = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

const RIBUAN = new Intl.NumberFormat('id-ID')

const TANGGAL_PANJANG = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const TANGGAL_PENDEK = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const WAKTU = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

/** Backend mengirim DECIMAL sebagai string; keduanya diterima di sini. */
export const rupiah = (nilai: string | number | null | undefined): string =>
  RUPIAH.format(Number(nilai ?? 0))

export const angka = (nilai: string | number | null | undefined): string =>
  RIBUAN.format(Number(nilai ?? 0))

/** Nilai besar diringkas agar muat pada kartu statistik. */
export function rupiahRingkas(nilai: string | number | null | undefined): string {
  const n = Number(nilai ?? 0)
  if (Math.abs(n) >= 1_000_000_000) return `Rp${(n / 1_000_000_000).toFixed(1).replace('.', ',')} M`
  if (Math.abs(n) >= 1_000_000) return `Rp${(n / 1_000_000).toFixed(1).replace('.', ',')} jt`
  if (Math.abs(n) >= 1_000) return `Rp${Math.round(n / 1_000)} rb`
  return rupiah(n)
}

export const tanggal = (nilai: string | null | undefined): string =>
  nilai ? TANGGAL_PANJANG.format(new Date(nilai)) : '—'

export const tanggalPendek = (nilai: string | null | undefined): string =>
  nilai ? TANGGAL_PENDEK.format(new Date(nilai)) : '—'

export const waktu = (nilai: string | null | undefined): string =>
  nilai ? WAKTU.format(new Date(nilai)) : '—'

/** Rentang tanggal perjalanan dalam satu baris ringkas. */
export function rentangTanggal(mulai: string, selesai: string): string {
  const a = new Date(mulai)
  const b = new Date(selesai)

  // Bulan yang sama cukup ditulis sekali: "2 – 4 Nov 2026".
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()} – ${TANGGAL_PENDEK.format(b)}`
  }
  return `${TANGGAL_PENDEK.format(a)} – ${TANGGAL_PENDEK.format(b)}`
}

/** Selisih waktu dalam kalimat, mis. "3 jam lalu". */
export function sejak(nilai: string): string {
  const detik = Math.floor((Date.now() - new Date(nilai).getTime()) / 1000)

  if (detik < 60) return 'baru saja'
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`
  if (detik < 604800) return `${Math.floor(detik / 86400)} hari lalu`
  return tanggalPendek(nilai)
}

/** Mengambil maksimal dua huruf awal nama untuk avatar. */
export function inisial(nama: string | undefined | null): string {
  if (!nama) return '??'
  return nama
    .trim()
    .split(/\s+/)
    .map((kata) => kata[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/** Mengubah ENUM backend menjadi kalimat yang enak dibaca. */
export const manusiawi = (enumTeks: string | null | undefined): string =>
  enumTeks ? enumTeks.replaceAll('_', ' ').toLowerCase().replace(/^./, (h) => h.toUpperCase()) : '—'

export type WarnaStatus = 'netral' | 'biru' | 'kuning' | 'hijau' | 'merah' | 'ungu'

/**
 * Peta status SPPD -> label pendek + warna lencana.
 * Sepuluh status backend diringkas menjadi label yang lebih mudah dibaca,
 * sejalan dengan `labelRingkas()` pada model PerjalananDinas.
 */
const RUPA_STATUS: Record<StatusSppd, { label: string; warna: WarnaStatus }> = {
  DRAFT: { label: 'Draf', warna: 'netral' },
  DIAJUKAN: { label: 'Menunggu', warna: 'kuning' },
  MENUNGGU_PERSETUJUAN: { label: 'Menunggu', warna: 'kuning' },
  REVISI: { label: 'Perlu Revisi', warna: 'ungu' },
  DISETUJUI: { label: 'Disetujui', warna: 'hijau' },
  DITOLAK: { label: 'Ditolak', warna: 'merah' },
  DIBATALKAN: { label: 'Dibatalkan', warna: 'merah' },
  DALAM_PERJALANAN: { label: 'Berjalan', warna: 'biru' },
  MENUNGGU_LAPORAN: { label: 'Perlu Laporan', warna: 'biru' },
  SELESAI: { label: 'Selesai', warna: 'hijau' },
}

export const rupaStatusSppd = (status: StatusSppd) =>
  RUPA_STATUS[status] ?? { label: manusiawi(status), warna: 'netral' as WarnaStatus }

const RUPA_LAPORAN: Record<string, { label: string; warna: WarnaStatus }> = {
  DRAFT: { label: 'Draf', warna: 'netral' },
  DIAJUKAN: { label: 'Menunggu Verifikasi', warna: 'kuning' },
  REVISI: { label: 'Perlu Revisi', warna: 'ungu' },
  DIVERIFIKASI: { label: 'Diverifikasi', warna: 'hijau' },
  DITOLAK: { label: 'Ditolak', warna: 'merah' },
}

export const rupaStatusLaporan = (status: string) =>
  RUPA_LAPORAN[status] ?? { label: manusiawi(status), warna: 'netral' as WarnaStatus }

const RUPA_PENCAIRAN: Record<string, WarnaStatus> = {
  MENUNGGU: 'kuning',
  DIPROSES: 'biru',
  SELESAI: 'hijau',
  GAGAL: 'merah',
}

export const warnaPencairan = (status: string): WarnaStatus => RUPA_PENCAIRAN[status] ?? 'netral'

const RUPA_PERSETUJUAN: Record<string, WarnaStatus> = {
  MENUNGGU: 'kuning',
  DISETUJUI: 'hijau',
  DIDELEGASIKAN: 'hijau',
  DITOLAK: 'merah',
  REVISI: 'ungu',
  DILEWATI: 'netral',
}

export const warnaPersetujuan = (status: string): WarnaStatus => RUPA_PERSETUJUAN[status] ?? 'netral'

/** Tanggal hari ini dalam format YYYY-MM-DD untuk nilai awal input date. */
export const hariIni = (): string => new Date().toISOString().slice(0, 10)
