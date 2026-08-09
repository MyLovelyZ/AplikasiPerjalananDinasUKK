import type { TripStatus } from '@/types/trip'

interface StatusBadgeProps {
  status: TripStatus
}

/** Lencana status pengajuan; warna diatur lewat kelas turunan `.status`. */
export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`status ${status.toLowerCase()}`}>{status}</span>
}
