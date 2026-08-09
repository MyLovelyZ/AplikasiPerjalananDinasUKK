import { Icon } from '@/components/ui/Icon'
import { PanelHeader } from '@/components/ui/PanelHeader'
import type { IconName } from '@/types/icon'

/** Identitas aksi cepat, dipakai induk untuk menentukan tujuan navigasi. */
export type QuickActionId = 'create-trip' | 'approvals' | 'reports'

interface QuickAction {
  id: QuickActionId
  icon: IconName
  /** Varian warna latar ikon. */
  tone: 'orange' | 'blue' | 'red'
  title: string
  description: string
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'create-trip',
    icon: 'plus',
    tone: 'orange',
    title: 'Ajukan Perjalanan',
    description: 'Buat pengajuan dinas baru',
  },
  {
    id: 'approvals',
    icon: 'check',
    tone: 'blue',
    title: 'Persetujuan',
    description: '3 pengajuan menunggu',
  },
  {
    id: 'reports',
    icon: 'file',
    tone: 'red',
    title: 'Laporan Perjalanan',
    description: 'Unduh rekap perjalanan',
  },
]

interface QuickActionsPanelProps {
  onSelect: (id: QuickActionId) => void
}

/** Pintasan menuju menu yang paling sering dipakai. */
export function QuickActionsPanel({ onSelect }: QuickActionsPanelProps) {
  return (
    <section className="panel quick">
      <PanelHeader title="Akses Cepat" subtitle="Menu yang sering digunakan." />
      {QUICK_ACTIONS.map(({ id, icon, tone, title, description }) => (
        <button key={id} type="button" onClick={() => onSelect(id)}>
          <span className={`qicon ${tone}`}>
            <Icon name={icon} />
          </span>
          <div>
            <b>{title}</b>
            <small>{description}</small>
          </div>
          <Icon name="chevron" size={18} />
        </button>
      ))}
    </section>
  )
}
