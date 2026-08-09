import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/types/icon'

interface StatCardProps {
  icon: IconName
  title: string
  value: string | number
  /** Keterangan tambahan di bawah angka utama. */
  note: string
}

/** Kartu ringkasan angka yang dipakai di dashboard dan laporan. */
export function StatCard({ icon, title, value, note }: StatCardProps) {
  return (
    <div className="stat">
      <div className="stat-icon">
        <Icon name={icon} />
      </div>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </div>
  )
}
