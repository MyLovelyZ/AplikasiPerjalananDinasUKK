import type { IconName } from '@/types/icon'

export interface ReportSummaryItem {
  icon: IconName
  title: string
  value: string
  note: string
}

/** Ringkasan angka pada halaman laporan. */
export const REPORT_SUMMARY: ReportSummaryItem[] = [
  { icon: 'plane', title: 'Total Perjalanan', value: '28', note: 'Jan–Sep 2026' },
  { icon: 'file', title: 'Total Pengeluaran', value: 'Rp 128,4 Jt', note: 'Realisasi 82%' },
  { icon: 'users', title: 'Pegawai Aktif', value: '64', note: '12 perjalanan aktif' },
]

export interface MonthlyTrend {
  month: string
  /** Tinggi batang dalam persen terhadap area grafik. */
  value: number
}

/** Tren jumlah perjalanan dinas per bulan. */
export const MONTHLY_TRIP_TREND: MonthlyTrend[] = [
  { month: 'Jan', value: 42 },
  { month: 'Feb', value: 58 },
  { month: 'Mar', value: 47 },
  { month: 'Apr', value: 72 },
  { month: 'Mei', value: 66 },
  { month: 'Jun', value: 84 },
  { month: 'Jul', value: 62 },
  { month: 'Agu', value: 91 },
  { month: 'Sep', value: 76 },
]

/** Pilihan tahun pada filter grafik laporan. */
export const REPORT_YEARS = ['2026', '2025']
