import type { NavItem, PageKey } from '@/types/navigation'

/** Penjagaan sesungguhnya tetap di API; ini hanya menyembunyikan menu yang tidak relevan. */
export const NAV_ITEMS: NavItem[] = [
  { key: 'Dashboard', icon: 'grid', peran: ['employee', 'supervisor', 'finance', 'super_admin'] },
  { key: 'Perjalanan Saya', icon: 'plane', peran: ['employee'] },
  { key: 'Laporan Biaya', icon: 'file', peran: ['employee'] },
  { key: 'Persetujuan', icon: 'check', peran: ['supervisor'] },
  { key: 'Verifikasi', icon: 'check', peran: ['finance'] },
  { key: 'Pencairan', icon: 'wallet', peran: ['finance'] },
  { key: 'Anggaran', icon: 'chart', peran: ['finance'] },
  { key: 'Laporan Keuangan', icon: 'file', peran: ['finance'] },
  { key: 'Pengguna', icon: 'users', peran: ['super_admin'] },
  { key: 'Departemen', icon: 'gedung', peran: ['super_admin'] },
  { key: 'Log Audit', icon: 'clock', peran: ['super_admin'] },
]

export const DEFAULT_PAGE: PageKey = 'Dashboard'

/** Diletakkan terpisah di bagian bawah sidebar. */
export const PROFILE_PAGE: PageKey = 'Profil'

/** Menu yang menampilkan lencana jumlah antrean. */
export const HALAMAN_ANTREAN: PageKey[] = ['Persetujuan', 'Verifikasi']
