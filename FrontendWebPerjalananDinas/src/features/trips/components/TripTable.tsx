import { StatusBadge } from '@/components/ui/StatusBadge'
import type { Trip } from '@/types/trip'

interface TripTableProps {
  trips: Trip[]
  onOpenTrip: (trip: Trip) => void
}

/** Tabel lengkap seluruh perjalanan dinas milik pengguna. */
export function TripTable({ trips, onOpenTrip }: TripTableProps) {
  return (
    <div className="table-wrap">
      <table className="wide">
        <thead>
          <tr>
            <th>Nomor Pengajuan</th>
            <th>Tujuan</th>
            <th>Kegiatan</th>
            <th>Tanggal</th>
            <th>Biaya</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {trips.map((trip) => (
            <tr key={trip.id}>
              <td>
                <b>{trip.id}</b>
                <small>{trip.name}</small>
              </td>
              <td>
                <b>{trip.tujuan}</b>
              </td>
              <td>{trip.kegiatan}</td>
              <td>{trip.tanggal}</td>
              <td>{trip.biaya}</td>
              <td>
                <StatusBadge status={trip.status} />
              </td>
              <td>
                <button
                  type="button"
                  className="dots"
                  aria-label={`Aksi untuk ${trip.id}`}
                  onClick={() => onOpenTrip(trip)}
                >
                  •••
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
