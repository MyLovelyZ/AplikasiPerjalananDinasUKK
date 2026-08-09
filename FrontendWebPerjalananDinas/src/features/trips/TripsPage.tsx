import { Icon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { TripTable } from '@/features/trips/components/TripTable'
import { TripToolbar } from '@/features/trips/components/TripToolbar'
import type { Trip } from '@/types/trip'

interface TripsPageProps {
  trips: Trip[]
  onCreateTrip: () => void
  onNotify: (message: string) => void
}

/** Daftar seluruh perjalanan dinas beserta filter dan aksi per baris. */
export function TripsPage({ trips, onCreateTrip, onNotify }: TripsPageProps) {
  return (
    <>
      <PageHeader
        eyebrow="Manajemen perjalanan"
        title="Perjalanan Saya"
        description="Daftar seluruh perjalanan dinas yang Anda ajukan."
        action={
          <button type="button" className="primary" onClick={onCreateTrip}>
            <Icon name="plus" /> Pengajuan Baru
          </button>
        }
      />
      <section className="panel">
        <TripToolbar onApplyFilter={() => onNotify('Filter diterapkan')} />
        <TripTable trips={trips} onOpenTrip={(trip) => onNotify(`Membuka ${trip.id}`)} />
      </section>
    </>
  )
}
