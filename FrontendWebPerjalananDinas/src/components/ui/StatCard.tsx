import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/types/icon'

interface StatCardProps {
  icon: IconName
  title: string
  value: string | number
  /** Keterangan tambahan di bawah angka utama. */
  note: string
  /** Warna kotak ikon; biru bila tidak disebut. */
  warna?: 'biru' | 'hijau' | 'kuning' | 'merah' | 'ungu'
}

/** Kartu ringkasan angka yang dipakai di dashboard dan halaman laporan. */
export function StatCard({ icon, title, value, note, warna = 'biru' }: StatCardProps) {
  return (
    <div className="stat">
      <div className={`stat-icon ${warna === 'biru' ? '' : warna}`}>
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
