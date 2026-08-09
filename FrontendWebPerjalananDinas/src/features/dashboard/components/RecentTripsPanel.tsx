import { Icon } from '@/components/ui/Icon'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { Trip } from '@/types/trip'

/** Jumlah baris perjalanan terbaru yang ditampilkan pada dashboard. */
const RECENT_TRIP_LIMIT = 4

interface RecentTripsPanelProps {
  trips: Trip[]
  onViewAll: () => void
}

/** Tabel ringkas berisi pengajuan perjalanan dinas terakhir. */
export function RecentTripsPanel({ trips, onViewAll }: RecentTripsPanelProps) {
  return (
    <section className="panel">
      <PanelHeader
        title="Perjalanan Terbaru"
        subtitle="Aktivitas pengajuan perjalanan dinas terakhir."
        action={
          <button type="button" className="text-btn" onClick={onViewAll}>
            Lihat semua <Icon name="arrow" size={16} />
          </button>
        }
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nomor</th>
              <th>Tujuan</th>
              <th>Tanggal</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {trips.slice(0, RECENT_TRIP_LIMIT).map((trip) => (
              <tr key={trip.id}>
                <td>
                  <b>{trip.id}</b>
                  <small>{trip.name}</small>
                </td>
                <td>{trip.tujuan}</td>
                <td>{trip.tanggal}</td>
                <td>
                  <StatusBadge status={trip.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
