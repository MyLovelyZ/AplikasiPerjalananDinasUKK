import { PageHeader } from '@/components/ui/PageHeader'
import { APPROVAL_CARD_LIMIT, EXTRA_PENDING_APPROVALS } from '@/data/approvals'
import { ApprovalCard } from '@/features/approvals/components/ApprovalCard'
import type { Trip } from '@/types/trip'

interface ApprovalsPageProps {
  trips: Trip[]
  onNotify: (message: string) => void
}

/** Antrean pengajuan berstatus `Menunggu` yang perlu ditindaklanjuti. */
export function ApprovalsPage({ trips, onNotify }: ApprovalsPageProps) {
  const pendingTrips = [
    ...trips.filter((trip) => trip.status === 'Menunggu'),
    ...EXTRA_PENDING_APPROVALS,
  ].slice(0, APPROVAL_CARD_LIMIT)

  return (
    <>
      <PageHeader
        eyebrow="Workflow"
        title="Persetujuan"
        description="Review pengajuan perjalanan dinas yang membutuhkan tindakan."
        action={<span className="counter">3 menunggu</span>}
      />
      <section className="approval-grid">
        {pendingTrips.map((trip) => (
          <ApprovalCard
            key={trip.id}
            trip={trip}
            onApprove={({ id }) => onNotify(`${id} disetujui`)}
            onReject={({ id }) => onNotify(`${id} ditolak`)}
          />
        ))}
      </section>
    </>
  )
}
