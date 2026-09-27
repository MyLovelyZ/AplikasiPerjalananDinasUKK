import type { NavItem, PageKey } from '@/types/navigation'

/**
 * Menu utama sidebar.
 *
 * `hak` disamakan dengan kode hak akses pada backend
 * (database/seeders/20260810000001-peran-dan-hak-akses.js), sehingga menu
 * yang tampil selalu sejalan dengan yang benar-benar boleh diakses. Ini
 * kenyamanan tampilan saja — penjagaan sesungguhnya tetap di sisi API.
 */
export const NAV_ITEMS: NavItem[] = [
  { key: 'Dashboard', icon: 'grid', hak: ['dashboard.lihat'] },
  { key: 'Pengajuan Dinas', icon: 'plus', hak: ['sppd.buat'] },
  { key: 'Perjalanan Saya', icon: 'plane', hak: ['sppd.lihat'] },
  { key: 'Persetujuan', icon: 'check', hak: ['sppd.setujui'] },
  { key: 'Laporan', icon: 'file', hak: ['laporan.lihat'] },
  { key: 'Keuangan', icon: 'wallet', hak: ['pencairan.proses'] },
  { key: 'Pegawai', icon: 'users', hak: ['karyawan.lihat'] },
]

/** Halaman default saat aplikasi pertama kali dibuka. */
export const DEFAULT_PAGE: PageKey = 'Dashboard'

/** Menu pengaturan diletakkan terpisah di bagian bawah sidebar. */
export const SETTINGS_PAGE: PageKey = 'Pengaturan'
