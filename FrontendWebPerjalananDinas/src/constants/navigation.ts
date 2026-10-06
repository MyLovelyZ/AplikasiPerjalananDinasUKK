import type { Peran } from '@/api/tipe'
import type { NavItem } from '@/types/navigation'

/**
 * Empat peran tetap, masing-masing dengan wilayah URL sendiri. Penjagaan
 * sesungguhnya tetap di API (middleware `role:`); di sini rute peran lain
 * dijawab dengan halaman 403.
 */
export const BERANDA_PERAN: Record<Peran, string> = {
  employee: '/employee',
  supervisor: '/supervisor',
  finance: '/finance',
  super_admin: '/admin',
}

export const MENU_PERAN: Record<Peran, NavItem[]> = {
  employee: [
    { label: 'Dashboard', jalur: '/employee', icon: 'grid' },
    { label: 'Perjalanan Saya', jalur: '/employee/requests', icon: 'plane' },
  ],
  supervisor: [
    { label: 'Dashboard', jalur: '/supervisor', icon: 'grid' },
    { label: 'Persetujuan', jalur: '/supervisor/approvals', icon: 'check', antrean: true },
  ],
  finance: [
    { label: 'Dashboard', jalur: '/finance', icon: 'grid' },
    { label: 'Verifikasi', jalur: '/finance/approvals', icon: 'check', antrean: true },
    { label: 'Anggaran', jalur: '/finance/budgets', icon: 'chart' },
    { label: 'Pencairan', jalur: '/finance/disbursements', icon: 'wallet' },
    { label: 'Laporan Keuangan', jalur: '/finance/reports', icon: 'file' },
  ],
  super_admin: [
    { label: 'Dashboard', jalur: '/admin', icon: 'grid' },
    { label: 'Pengguna', jalur: '/admin/users', icon: 'users' },
    { label: 'Departemen', jalur: '/admin/departments', icon: 'gedung' },
    { label: 'Log Audit', jalur: '/admin/audit-logs', icon: 'clock' },
  ],
}

/** Diletakkan terpisah di bagian bawah sidebar; terbuka untuk semua peran. */
export const MENU_PROFIL: NavItem = { label: 'Profil', jalur: '/profile', icon: 'pengguna' }

/** Menu yang paling cocok dengan URL sekarang (awalan terpanjang). */
export function menuAktif(peran: Peran, pathname: string): NavItem | undefined {
  return [...MENU_PERAN[peran], MENU_PROFIL]
    .filter((item) => pathname === item.jalur || pathname.startsWith(`${item.jalur}/`))
    .sort((a, b) => b.jalur.length - a.jalur.length)[0]
}

/** Tujuan setelah login: halaman asal bila masih milik peran ini, selain itu beranda peran. */
export function tujuanSetelahMasuk(peran: Peran, asal?: string): string {
  const beranda = BERANDA_PERAN[peran]
  const milikPeran =
    asal !== undefined &&
    [beranda, MENU_PROFIL.jalur].some((awalan) => asal === awalan || asal.startsWith(`${awalan}/`))
  return milikPeran ? asal : beranda
}
