import type { NavItem, PageKey } from '@/types/navigation'

/** Halaman yang ditampilkan pada menu utama sidebar. */
export const NAV_ITEMS: NavItem[] = [
  { key: 'Dashboard', icon: 'grid' },
  { key: 'Pengajuan Dinas', icon: 'plus' },
  { key: 'Perjalanan Saya', icon: 'plane' },
  { key: 'Persetujuan', icon: 'check', badge: '3' },
  { key: 'Laporan', icon: 'file' },
  { key: 'Pegawai', icon: 'users' },
]

/** Halaman default saat aplikasi pertama kali dibuka. */
export const DEFAULT_PAGE: PageKey = 'Dashboard'

/** Menu pengaturan diletakkan terpisah di bagian bawah sidebar. */
export const SETTINGS_PAGE: PageKey = 'Pengaturan'
