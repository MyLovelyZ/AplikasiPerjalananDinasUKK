import type { TitikTren } from '@/api/tipe'
import { rupiahRingkas } from '@/utils/format'

/**
 * Grafik batang tren bulanan.
 *
 * Digambar dengan flexbox biasa, tanpa pustaka grafik: bentuknya sederhana
 * dan pustaka charting akan menambah beban unduhan yang tidak sepadan.
 * Tinggi tiap batang adalah persentase terhadap bulan tertinggi.
 */
export function GrafikTren({ titik }: { titik: TitikTren[] }) {
  const tertinggi = Math.max(...titik.map((t) => t.jumlah), 1)
  const totalPerjalanan = titik.reduce((jumlah, t) => jumlah + t.jumlah, 0)
  const totalBiaya = titik.reduce((jumlah, t) => jumlah + t.total_biaya, 0)
  const tersibuk = titik.reduce((a, b) => (b.jumlah > a.jumlah ? b : a), titik[0])

  return (
    <>
      <div className="grafik" role="img" aria-label="Grafik jumlah perjalanan per bulan">
        {titik.map((t) => (
          <div
            key={t.bulan}
            className={`grafik-kolom ${t.jumlah > 0 ? 'terisi' : ''}`}
            title={`${t.nama_bulan}: ${t.jumlah} perjalanan · ${rupiahRingkas(t.total_biaya)}`}
          >
            <div
              className="grafik-batang"
              style={{ height: `${Math.max(3, (t.jumlah / tertinggi) * 100)}%` }}
            />
            <small>{t.nama_bulan}</small>
          </div>
        ))}
      </div>

      <div className="grafik-kaki">
        <span>
          Total <b>{totalPerjalanan}</b> perjalanan · <b>{rupiahRingkas(totalBiaya)}</b>
        </span>
        {totalPerjalanan > 0 && (
          <span>
            Tersibuk: <b>{tersibuk.nama_bulan}</b> ({tersibuk.jumlah})
          </span>
        )}
      </div>
    </>
  )
}
