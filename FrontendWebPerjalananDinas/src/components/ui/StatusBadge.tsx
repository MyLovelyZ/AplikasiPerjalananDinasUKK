import type { WarnaStatus } from '@/utils/format'

interface StatusBadgeProps {
  label: string
  warna: WarnaStatus
}

/** Lencana status; warnanya ditentukan pemanggil lewat peta di utils/format. */
export function StatusBadge({ label, warna }: StatusBadgeProps) {
  return <span className={`status ${warna}`}>{label}</span>
}
