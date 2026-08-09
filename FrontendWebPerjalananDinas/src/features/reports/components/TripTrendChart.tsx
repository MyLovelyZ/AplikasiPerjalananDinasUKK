import { PanelHeader } from '@/components/ui/PanelHeader'
import { MONTHLY_TRIP_TREND, REPORT_YEARS } from '@/data/reports'

/** Grafik batang sederhana untuk tren perjalanan per bulan. */
export function TripTrendChart() {
  return (
    <section className="panel chart-panel">
      <PanelHeader
        title="Tren Perjalanan"
        subtitle="Jumlah perjalanan dinas per bulan"
        action={
          <select aria-label="Pilih tahun">
            {REPORT_YEARS.map((year) => (
              <option key={year}>{year}</option>
            ))}
          </select>
        }
      />
      <div className="bars">
        {MONTHLY_TRIP_TREND.map(({ month, value }) => (
          <div className="bar-col" key={month}>
            <span style={{ height: `${value}%` }}></span>
            <small>{month}</small>
          </div>
        ))}
      </div>
    </section>
  )
}
