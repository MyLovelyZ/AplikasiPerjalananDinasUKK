import { Icon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { REPORT_SUMMARY } from '@/data/reports'
import { TripTrendChart } from '@/features/reports/components/TripTrendChart'

interface ReportsPageProps {
  onNotify: (message: string) => void
}

/** Ringkasan aktivitas dan biaya perjalanan dinas. */
export function ReportsPage({ onNotify }: ReportsPageProps) {
  return (
    <>
      <PageHeader
        eyebrow="Data & analitik"
        title="Laporan Perjalanan"
        description="Ringkasan aktivitas dan biaya perjalanan dinas."
        action={
          <button
            type="button"
            className="outline"
            onClick={() => onNotify('Laporan berhasil disiapkan untuk diunduh')}
          >
            <Icon name="download" /> Export Laporan
          </button>
        }
      />
      <div className="report-stats">
        {REPORT_SUMMARY.map((item) => (
          <StatCard
            key={item.title}
            icon={item.icon}
            title={item.title}
            value={item.value}
            note={item.note}
          />
        ))}
      </div>
      <TripTrendChart />
    </>
  )
}
