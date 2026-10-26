interface GrafikBatangProps {
  titik: Array<{ label: string; nilai: number }>
  formatNilai: (nilai: number) => string
  /** Label batang yang disorot (mis. bulan berjalan); nilainya ditulis di atas batang. */
  sorot?: string
}

/** Grafik batang flexbox sederhana; tinggi tiap batang relatif terhadap nilai tertinggi. */
export function GrafikBatang({ titik, formatNilai, sorot }: GrafikBatangProps) {
  const tertinggi = Math.max(...titik.map((t) => t.nilai), 1)
  const total = titik.reduce((jumlah, t) => jumlah + t.nilai, 0)
  const puncak = titik.reduce((a, b) => (b.nilai > a.nilai ? b : a), titik[0])

  return (
    <>
      <div className="grafik" role="img" aria-label="Grafik batang per bulan">
        {titik.map((t) => (
          <div
            key={t.label}
            className={`grafik-kolom ${t.nilai > 0 ? 'terisi' : ''} ${t.label === sorot ? 'sorot' : ''}`}
            data-nilai={`${t.label}: ${formatNilai(t.nilai)}`}
          >
            {t.label === sorot && <em className="angka">{formatNilai(t.nilai)}</em>}
            <div className="grafik-batang" style={{ height: `${Math.max(2, (t.nilai / tertinggi) * 100)}%` }} />
            <small>{t.label}</small>
          </div>
        ))}
      </div>

      <div className="grafik-kaki">
        <span>
          Total <b>{formatNilai(total)}</b>
        </span>
        {total > 0 && puncak && (
          <span>
            Tertinggi: <b>{puncak.label}</b> ({formatNilai(puncak.nilai)})
          </span>
        )}
      </div>
    </>
  )
}
