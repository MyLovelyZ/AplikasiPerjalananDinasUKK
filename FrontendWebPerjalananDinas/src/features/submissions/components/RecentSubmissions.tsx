import { Icon } from '@/components/ui/Icon'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { Trip } from '@/types/trip'

/** Jumlah pengajuan terakhir yang ditampilkan. */
const RECENT_SUBMISSION_LIMIT = 3

interface RecentSubmissionsProps {
  trips: Trip[]
}

/** Daftar ringkas pengajuan terakhir beserta statusnya. */
export function RecentSubmissions({ trips }: RecentSubmissionsProps) {
  return (
    <section className="panel mini-list">
      <PanelHeader
        title="Pengajuan Terakhir"
        subtitle={`${trips.length} pengajuan tercatat`}
      />
      {trips.slice(0, RECENT_SUBMISSION_LIMIT).map((trip) => (
        <div className="mini-row" key={trip.id}>
          <span className="mini-icon">
            <Icon name="file" size={17} />
          </span>
          <div>
            <b>
              {trip.id} · {trip.tujuan}
            </b>
            <small>{trip.kegiatan}</small>
          </div>
          <StatusBadge status={trip.status} />
        </div>
      ))}
    </section>
  )
}
