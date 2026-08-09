import { Icon } from '@/components/ui/Icon'
import { getInitials } from '@/utils/text'
import type { Trip } from '@/types/trip'

interface ApprovalCardProps {
  trip: Trip
  onApprove: (trip: Trip) => void
  onReject: (trip: Trip) => void
}

/** Kartu satu pengajuan yang menunggu keputusan penyetuju. */
export function ApprovalCard({ trip, onApprove, onReject }: ApprovalCardProps) {
  return (
    <div className="approval-card">
      <div className="approval-top">
        <span className="status menunggu">Menunggu</span>
        <button type="button" className="dots" aria-label={`Aksi untuk ${trip.id}`}>
          •••
        </button>
      </div>

      <b className="approval-id">{trip.id}</b>
      <h3>{trip.kegiatan}</h3>

      <div className="approval-meta">
        <span>
          <Icon name="map" size={16} />
          {trip.tujuan}
        </span>
        <span>
          <Icon name="clock" size={16} />
          {trip.tanggal}
        </span>
        <span>
          <Icon name="file" size={16} />
          {trip.biaya}
        </span>
      </div>

      <div className="approval-person">
        <div className="avatar small">{getInitials(trip.name)}</div>
        <span>
          Diajukan oleh <b>{trip.name}</b>
        </span>
      </div>

      <div className="approval-actions">
        <button type="button" className="reject" onClick={() => onReject(trip)}>
          Tolak
        </button>
        <button type="button" className="approve" onClick={() => onApprove(trip)}>
          Setujui
        </button>
      </div>
    </div>
  )
}
