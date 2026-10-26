import type { Notifikasi, Peran } from '@/api/tipe'
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
    { label: 'Perjalanan Saya', jalur: '/employee/requests', icon: 'plane', cari: true },
  ],
  supervisor: [
    { label: 'Dashboard', jalur: '/supervisor', icon: 'grid' },
    { label: 'Persetujuan', jalur: '/supervisor/approvals', icon: 'check', antrean: true, cari: true },
  ],
  finance: [
    { label: 'Dashboard', jalur: '/finance', icon: 'grid' },
    { label: 'Verifikasi', jalur: '/finance/approvals', icon: 'check', antrean: true, cari: true },
    { label: 'Anggaran', jalur: '/finance/budgets', icon: 'chart' },
    { label: 'Pencairan', jalur: '/finance/disbursements', icon: 'wallet', cari: true },
    { label: 'Analisis Bulanan', jalur: '/finance/analysis', icon: 'tren' },
    { label: 'Laporan Keuangan', jalur: '/finance/reports', icon: 'file' },
  ],
  super_admin: [
    { label: 'Dashboard', jalur: '/admin', icon: 'grid' },
    { label: 'Pengguna', jalur: '/admin/users', icon: 'users', cari: true },
    { label: 'Departemen', jalur: '/admin/departments', icon: 'gedung' },
    { label: 'Log Audit', jalur: '/admin/audit-logs', icon: 'clock', cari: true },
  ],
}

/** Diletakkan terpisah di bagian bawah sidebar; terbuka untuk semua peran. */
export const MENU_PROFIL: NavItem = { label: 'Profil', jalur: '/profile', icon: 'pengguna' }

/** Dibuka dari lonceng di topbar; terbuka untuk semua peran. */
export const MENU_NOTIFIKASI: NavItem = { label: 'Notifikasi', jalur: '/notifications', icon: 'bell' }

/** Halaman yang dibuka saat notifikasi diklik, sesuai wilayah URL peran penerimanya. */
export function tautanNotifikasi(n: Notifikasi, peran: Peran): string | null {
  const id = n.travel_request_id
  if (id === null) return null

  switch (peran) {
    case 'employee':
      return n.event === 'expense_report_returned' ? `/employee/requests/${id}/expenses` : `/employee/requests/${id}`
    case 'supervisor':
      return `/supervisor/approvals/${id}`
    case 'finance':
      return `/finance/approvals/${id}`
    default:
      return null
  }
}

/** Menu yang paling cocok dengan URL sekarang (awalan terpanjang). */
export function menuAktif(peran: Peran, pathname: string): NavItem | undefined {
  return [...MENU_PERAN[peran], MENU_PROFIL, MENU_NOTIFIKASI]
    .filter((item) => pathname === item.jalur || pathname.startsWith(`${item.jalur}/`))
    .sort((a, b) => b.jalur.length - a.jalur.length)[0]
}

/** Tujuan setelah login: halaman asal bila masih milik peran ini, selain itu beranda peran. */
export function tujuanSetelahMasuk(peran: Peran, asal?: string): string {
  const beranda = BERANDA_PERAN[peran]
  const milikPeran =
    asal !== undefined &&
    [beranda, MENU_PROFIL.jalur, MENU_NOTIFIKASI.jalur].some((awalan) => asal === awalan || asal.startsWith(`${awalan}/`))
  return milikPeran ? asal : beranda
}
