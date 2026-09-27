import type { IconName } from '@/types/icon'

/** Seluruh halaman yang dapat diakses dari sidebar. */
export type PageKey =
  | 'Dashboard'
  | 'Pengajuan Dinas'
  | 'Perjalanan Saya'
  | 'Persetujuan'
  | 'Laporan'
  | 'Keuangan'
  | 'Pegawai'
  | 'Pengaturan'

export interface NavItem {
  /** Label yang tampil sekaligus dipakai sebagai kunci halaman aktif. */
  key: PageKey
  icon: IconName
  /**
   * Hak akses yang harus dimiliki agar menu ini tampil. Menu tanpa daftar
   * ini terbuka bagi seluruh pengguna yang sudah masuk.
   */
  hak?: string[]
}
