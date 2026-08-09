import type { IconName } from '@/types/icon'

/** Seluruh halaman yang dapat diakses dari sidebar. */
export type PageKey =
  | 'Dashboard'
  | 'Pengajuan Dinas'
  | 'Perjalanan Saya'
  | 'Persetujuan'
  | 'Laporan'
  | 'Pegawai'
  | 'Pengaturan'

export interface NavItem {
  /** Label yang tampil sekaligus dipakai sebagai kunci halaman aktif. */
  key: PageKey
  icon: IconName
  /** Lencana jumlah (mis. antrean persetujuan) yang tampil di sisi kanan menu. */
  badge?: string
}
