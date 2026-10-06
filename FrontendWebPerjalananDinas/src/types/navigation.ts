import type { IconName } from '@/types/icon'

export interface NavItem {
  label: string
  /** Rute frontend; awalannya sama dengan prefiks `role:` di routes/api.php. */
  jalur: string
  icon: IconName
  /** Menampilkan lencana jumlah antrean. */
  antrean?: boolean
}
