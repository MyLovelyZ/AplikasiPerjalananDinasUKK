import type { Peran } from '@/api/tipe'
import type { IconName } from '@/types/icon'

export type PageKey =
  | 'Dashboard'
  | 'Perjalanan Saya'
  | 'Laporan Biaya'
  | 'Persetujuan'
  | 'Verifikasi'
  | 'Pencairan'
  | 'Anggaran'
  | 'Laporan Keuangan'
  | 'Pengguna'
  | 'Departemen'
  | 'Log Audit'
  | 'Profil'

export interface NavItem {
  /** Label yang tampil sekaligus dipakai sebagai kunci halaman aktif. */
  key: PageKey
  icon: IconName
  /** Peran yang melihat menu ini; sejalan dengan middleware `role:` di routes/api.php. */
  peran: Peran[]
}
