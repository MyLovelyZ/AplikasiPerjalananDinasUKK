import { Icon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { RecentSubmissions } from '@/features/submissions/components/RecentSubmissions'
import { SubmissionGuide } from '@/features/submissions/components/SubmissionGuide'
import { SubmissionSteps } from '@/features/submissions/components/SubmissionSteps'
import type { Trip } from '@/types/trip'

interface SubmissionPageProps {
  trips: Trip[]
  onCreateTrip: () => void
}

/** Halaman pengantar pengajuan dinas: tahapan, panduan, dan riwayat singkat. */
export function SubmissionPage({ trips, onCreateTrip }: SubmissionPageProps) {
  return (
    <>
      <PageHeader
        eyebrow="Layanan perjalanan"
        title="Pengajuan Dinas"
        description="Ajukan perjalanan dinas dengan data yang lengkap dan terstruktur."
        action={
          <button type="button" className="primary" onClick={onCreateTrip}>
            <Icon name="plus" /> Buat Pengajuan
          </button>
        }
      />
      <SubmissionSteps />
      <SubmissionGuide onStart={onCreateTrip} />
      <RecentSubmissions trips={trips} />
    </>
  )
}
