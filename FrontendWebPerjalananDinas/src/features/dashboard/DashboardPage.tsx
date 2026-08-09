import { StatCard } from '@/components/ui/StatCard'
import { DashboardHero } from '@/features/dashboard/components/DashboardHero'
import {
  QuickActionsPanel,
  type QuickActionId,
} from '@/features/dashboard/components/QuickActionsPanel'
import { RecentTripsPanel } from '@/features/dashboard/components/RecentTripsPanel'
import { countTripsByStatus } from '@/features/trips/tripService'
import type { PageKey } from '@/types/navigation'
import type { Trip } from '@/types/trip'

interface DashboardPageProps {
  trips: Trip[]
  onCreateTrip: () => void
  onNavigate: (page: PageKey) => void
}

/** Halaman ringkasan: banner, statistik, perjalanan terbaru, dan akses cepat. */
export function DashboardPage({ trips, onCreateTrip, onNavigate }: DashboardPageProps) {
  const approvedCount = countTripsByStatus(trips, 'Disetujui')
  const waitingCount = countTripsByStatus(trips, 'Menunggu')

  const handleQuickAction = (id: QuickActionId) => {
    if (id === 'create-trip') {
      onCreateTrip()
      return
    }
    onNavigate(id === 'approvals' ? 'Persetujuan' : 'Laporan')
  }

  return (
    <>
      <DashboardHero onCreateTrip={onCreateTrip} />

      <div className="stats">
        <StatCard
          icon="file"
          title="Total Pengajuan"
          value={trips.length}
          note="+2 bulan ini"
        />
        <StatCard
          icon="clock"
          title="Menunggu Persetujuan"
          value={waitingCount + 2}
          note="Perlu ditinjau"
        />
        <StatCard
          icon="check"
          title="Disetujui"
          value={approvedCount}
          note="Bulan berjalan"
        />
        <StatCard
          icon="plane"
          title="Perjalanan Aktif"
          value="4"
          note="Sedang berlangsung"
        />
      </div>

      <div className="grid-2">
        <RecentTripsPanel trips={trips} onViewAll={() => onNavigate('Perjalanan Saya')} />
        <QuickActionsPanel onSelect={handleQuickAction} />
      </div>
    </>
  )
}
