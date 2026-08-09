import type { ReactNode } from 'react'

interface PanelHeaderProps {
  title: string
  subtitle: string
  /** Elemen aksi opsional (tombol "lihat semua", filter, dan sejenisnya). */
  action?: ReactNode
}

/** Kepala panel dengan judul, subjudul, dan aksi opsional di sisi kanan. */
export function PanelHeader({ title, subtitle, action }: PanelHeaderProps) {
  return (
    <div className="panel-head">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  )
}
