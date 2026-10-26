import { useState } from 'react'
import type { CSSProperties } from 'react'

import { apiAnalisisBulanan, apiOpsiAnggaran, apiUnduhAnalisisBulanan } from '@/api/endpoint'
import type { FilterAnalisisBulanan } from '@/api/endpoint'
import type { AnalisisBulanan, MetrikBulanan, Perubahan } from '@/api/tipe'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Muatan } from '@/components/ui/Keadaan'
import { PageHeader } from '@/components/ui/PageHeader'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { Pilihan } from '@/components/ui/Pilihan'
import { LABEL_KATEGORI_BIAYA, labelPeriode, NAMA_BULAN } from '@/constants/label'
import { useKirim } from '@/hooks/useKirim'
import { usePermintaan } from '@/hooks/usePermintaan'
import { angka, rupiah, rupiahRingkas, tanggalPendek } from '@/utils/format'

/** 24 bulan terakhir, terbaru di atas; nilainya "2026-10". */
const DAFTAR_BULAN = Array.from({ length: 24 }, (_, mundur) => {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - mundur)
  return {
    nilai: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    label: `${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`,
  }
})

const METRIK: Array<{ kunci: MetrikBulanan; label: string; uang: boolean }> = [
  { kunci: 'spending', label: 'Pengeluaran terverifikasi', uang: true },
  { kunci: 'claimed', label: 'Diklaim karyawan', uang: true },
  { kunci: 'expense_count', label: 'Transaksi pengeluaran', uang: false },
  { kunci: 'trip_count', label: 'Perjalanan yang mengeluarkan biaya', uang: false },
  { kunci: 'average_per_trip', label: 'Rata-rata per perjalanan', uang: true },
  { kunci: 'advances_paid', label: 'Uang muka dibayarkan', uang: true },
  { kunci: 'reimbursements_paid', label: 'Reimbursement dibayarkan', uang: true },
]

/** "+Rp 600.000", "−Rp 200.000", atau "—" bila sama. */
const selisihRupiah = (nilai: number) => (nilai === 0 ? '—' : `${nilai > 0 ? '+' : '−'}${rupiah(Math.abs(nilai))}`)

const selisihAngka = (nilai: number) => (nilai === 0 ? '—' : `${nilai > 0 ? '+' : '−'}${angka(Math.abs(nilai))}`)

/** "▲ 12,5%" (oranye: pengeluaran naik), "▼ 8%", "baru" bila bulan lalu nol, atau "tetap". */
function LencanaPerubahan({ perubahan: p }: { perubahan: Perubahan }) {
  let teks = 'tetap'
  if (p.change_percentage === null) teks = p.current > 0 ? 'baru' : '—'
  else if (p.change_amount !== 0) teks = `${p.change_amount > 0 ? '▲' : '▼'} ${angka(Math.abs(p.change_percentage))}%`
  return <span className={`selisih ${p.change_amount > 0 ? 'naik' : ''}`}>{teks}</span>
}

/** Kalimat utama: naik/turun berapa persen dibanding bulan sebelumnya. */
function kalimatPerubahan(p: Perubahan, ini: string, lalu: string): string {
  if (p.current === 0 && p.previous === 0) return `Belum ada pengeluaran terverifikasi pada ${lalu} maupun ${ini}.`
  if (p.change_percentage === null) return `${lalu} belum ada pengeluaran, jadi persentase perubahan tidak bisa dihitung.`
  if (p.change_amount === 0) return `Pengeluaran ${ini} sama dengan ${lalu}.`
  return `Pengeluaran ${ini} ${p.change_amount > 0 ? 'naik' : 'turun'} ${angka(Math.abs(p.change_percentage))}% dibanding ${lalu}.`
}

/** /finance/analysis — perbandingan pengeluaran satu bulan dengan bulan sebelumnya, plus unduhan Excel. */
export function AnalisisBulananPage() {
  const [bulan, setBulan] = useState(DAFTAR_BULAN[0].nilai)
  const [departemen, setDepartemen] = useState(0)
  const unduhan = useKirim()

  const [tahun, bulanKe] = bulan.split('-').map(Number)
  const filter: FilterAnalisisBulanan = { year: tahun, month: bulanKe, department_id: departemen || undefined }

  const opsi = usePermintaan(() => apiOpsiAnggaran(), [])
  const { data, memuat, galat, muatUlang } = usePermintaan(() => apiAnalisisBulanan(filter), [bulan, departemen])

  return (
    <>
      <PageHeader
        eyebrow="Manajer Keuangan"
        title="Analisis Bulanan"
        description="Bandingkan pengeluaran terverifikasi satu bulan dengan bulan sebelumnya, lalu unduh rinciannya ke Excel untuk dicek."
        action={
          <button
            type="button"
            className="btn utama"
            disabled={unduhan.mengirim}
            onClick={() => void unduhan.jalankan(() => apiUnduhAnalisisBulanan(filter))}
          >
            <Icon name="download" size={16} />
            {unduhan.mengirim ? 'Menyiapkan...' : 'Unduh Excel'}
          </button>
        }
      />

      {unduhan.galat && (
        <div className="kotak-galat" role="alert">
          <Icon name="peringatan" size={16} />
          <span>Gagal mengunduh Excel: {unduhan.galat}</span>
        </div>
      )}

      <section className="panel">
        <div className="bilah-alat">
          <Pilihan label="Bulan" nilai={bulan} bawaan={DAFTAR_BULAN[0].nilai} onUbah={setBulan} opsi={DAFTAR_BULAN} />
          <Pilihan
            label="Departemen"
            nilai={departemen}
            bawaan={0}
            onUbah={setDepartemen}
            opsi={[
              { nilai: 0, label: 'Semua departemen' },
              ...(opsi.data?.departments ?? []).map((d) => ({ nilai: d.id, label: d.name })),
            ]}
          />
        </div>
      </section>

      <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={8}>
        {(a) => <IsiAnalisis analisis={a} />}
      </Muatan>
    </>
  )
}

function IsiAnalisis({ analisis: a }: { analisis: AnalisisBulanan }) {
  const ini = labelPeriode(a.period)
  const lalu = labelPeriode(a.previous_period)
  const s = a.summary.spending
  const skala = Math.max(s.current, s.previous, 1)
  const sehari = a.same_day_last_month

  return (
    <>
      {/* Dua bulan berdampingan; panjang batang sebanding dengan jumlahnya. */}
      <section className="banding">
        <div>
          <span className="stat-label">{lalu}</span>
          <strong className="angka">{rupiah(s.previous)}</strong>
          <div className="bilah tebal" aria-hidden="true">
            <i style={{ width: `${(s.previous / skala) * 100}%` }} />
          </div>
          <p>Bulan sebelumnya</p>
        </div>
        <div>
          <span className="stat-label">{ini}</span>
          <strong className="angka">{rupiah(s.current)}</strong>
          <div className="bilah tebal" aria-hidden="true">
            <i className="kini" style={{ width: `${(s.current / skala) * 100}%` }} />
          </div>
          <p>{sehari ? `Masih berjalan, sampai tanggal ${sehari.day}` : 'Bulan terpilih'}</p>
        </div>
        <div>
          <span className="stat-label">Selisih</span>
          <strong className="angka">{selisihRupiah(s.change_amount)}</strong>
          <p>{kalimatPerubahan(s, ini, lalu)}</p>
        </div>
      </section>

      {sehari && (
        <div className="kotak-info">
          <strong>Bulan ini belum selesai</strong>
          Sampai tanggal {sehari.day}, {lalu} baru mengeluarkan {rupiah(sehari.spending)}. Pada titik yang sama, {ini}{' '}
          {s.current === sehari.spending
            ? 'sama besarnya.'
            : `${s.current > sehari.spending ? 'lebih tinggi' : 'lebih rendah'} ${rupiah(Math.abs(s.current - sehari.spending))}.`}
        </div>
      )}

      <section className="panel">
        <PanelHeader title="Ringkasan perbandingan" subtitle={`${lalu} dibanding ${ini}`} />
        <div className="pembungkus-tabel">
          <table className="tabel">
            <thead>
              <tr>
                <th>Ukuran</th>
                <th className="kanan">{lalu}</th>
                <th className="kanan">{ini}</th>
                <th className="kanan">Selisih</th>
                <th className="kanan">Perubahan</th>
              </tr>
            </thead>
            <tbody>
              {METRIK.map(({ kunci, label, uang }) => {
                const p = a.summary[kunci]
                const tulis = uang ? rupiah : angka
                return (
                  <tr key={kunci}>
                    <td className="sel-utama">{label}</td>
                    <td className="kanan angka">{tulis(p.previous)}</td>
                    <td className="kanan angka">{tulis(p.current)}</td>
                    <td className="kanan angka">{uang ? selisihRupiah(p.change_amount) : selisihAngka(p.change_amount)}</td>
                    <td className="kanan">
                      <LencanaPerubahan perubahan={p} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <PanelHeader title="Per kategori" subtitle="Pengeluaran terverifikasi menurut jenis biaya" />
        <GrafikBanding
          judul="Pengeluaran per kategori"
          ini={ini}
          lalu={lalu}
          grup={a.by_category.map((k) => ({ ...k, kunci: k.category, label: LABEL_KATEGORI_BIAYA[k.category] ?? k.label }))}
        />
      </section>

      <section className="panel">
        <PanelHeader title="Per departemen" subtitle="Diurutkan dari pengeluaran terbesar bulan terpilih" />
        {a.by_department.length === 0 ? (
          <Kosong ikon="gedung" judul="Belum ada pengeluaran" pesan="Tidak ada departemen yang mengeluarkan biaya pada kedua bulan." />
        ) : (
          <GrafikBanding
            judul="Pengeluaran per departemen"
            ini={ini}
            lalu={lalu}
            grup={a.by_department.map((d) => ({ ...d, kunci: d.code, label: d.department }))}
          />
        )}
      </section>

      <section className="panel">
        <PanelHeader
          title={`Pengeluaran terbesar ${ini}`}
          subtitle="Sepuluh transaksi terbesar. Rincian lengkap kedua bulan ada di file Excel."
        />
        {a.largest_expenses.length === 0 ? (
          <Kosong ikon="wallet" judul="Belum ada pengeluaran" pesan={`Belum ada pengeluaran terverifikasi pada ${ini}.`} />
        ) : (
          <div className="pembungkus-tabel">
            <table className="tabel">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Perjalanan</th>
                  <th>Karyawan</th>
                  <th>Kategori &amp; keterangan</th>
                  <th className="kanan">Disetujui</th>
                </tr>
              </thead>
              <tbody>
                {a.largest_expenses.map((e) => (
                  <tr key={e.id}>
                    <td>{tanggalPendek(e.expense_date)}</td>
                    <td>
                      <div className="sel-utama angka">{e.request_number}</div>
                      <div className="sel-sekunder">{e.destination}</div>
                    </td>
                    <td>
                      <div className="sel-utama">{e.employee}</div>
                      <div className="sel-sekunder">{e.department}</div>
                    </td>
                    <td>
                      <div className="sel-utama">{LABEL_KATEGORI_BIAYA[e.category] ?? e.category_label}</div>
                      <div className="sel-sekunder">{e.description}</div>
                    </td>
                    <td className="kanan">
                      <div className="sel-utama angka">{rupiah(e.approved_amount)}</div>
                      {e.amount !== e.approved_amount && <div className="sel-sekunder angka">diklaim {rupiah(e.amount)}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

/**
 * Grafik batang tegak berpasangan, bergaya sama dengan grafik pengeluaran per bulan di dashboard:
 * bulan sebelumnya navy, bulan terpilih oranye dengan nilainya di atas batang. Nilai pasti
 * muncul saat batang ditunjuk. Nama dan perubahan tiap kelompok berada di baris sendiri,
 * jadi nama yang terlipat dua baris tidak menggeser garis dasar batang.
 */
function GrafikBanding({
  judul,
  grup,
  ini,
  lalu,
}: {
  judul: string
  grup: Array<{ kunci: string; label: string } & Perubahan>
  ini: string
  lalu: string
}) {
  const tertinggi = Math.max(1, ...grup.flatMap((g) => [g.current, g.previous]))
  const tinggi = (nilai: number) => `${Math.max(2, (nilai / tertinggi) * 100)}%`
  const kolom = { '--kolom': grup.length } as CSSProperties
  const total = (pilih: (g: Perubahan) => number) => grup.reduce((jumlah, g) => jumlah + pilih(g), 0)
  const uraian = grup.map((g) => `${g.label}: ${lalu} ${rupiah(g.previous)}, ${ini} ${rupiah(g.current)}`).join('; ')

  return (
    <>
      <div className="legenda">
        <span>
          <i /> {lalu}
        </span>
        <span>
          <i className="kini" /> {ini}
        </span>
      </div>

      {/* Di layar sempit kolom diberi lebar minimum dan bagian ini bisa digeser ke samping. */}
      <div className="grafik-gulir">
        <div className="grafik-isi" style={kolom}>
          <div className="grafik grafik-ganda" role="img" aria-label={`${judul}. ${uraian}`}>
            {grup.map((g) => (
              <div className="grafik-pasangan" key={g.kunci}>
                <div className={`grafik-kolom ${g.previous > 0 ? 'terisi' : ''}`} data-nilai={`${lalu}: ${rupiah(g.previous)}`}>
                  <div className="grafik-batang" style={{ height: tinggi(g.previous) }} />
                </div>
                <div className={`grafik-kolom kini ${g.current > 0 ? 'terisi' : ''}`} data-nilai={`${ini}: ${rupiah(g.current)}`}>
                  {/* Tanpa "Rp" agar label muat selebar batang; nilai lengkap ada di tooltip. */}
                  <em className="angka">{rupiahRingkas(g.current).replace(/^Rp\s?/, '')}</em>
                  <div className="grafik-batang" style={{ height: tinggi(g.current) }} />
                </div>
              </div>
            ))}
          </div>

          <div className="grafik-label" aria-hidden="true">
            {grup.map((g) => (
              <div key={g.kunci}>
                <b>{g.label}</b>
                <LencanaPerubahan perubahan={g} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grafik-kaki">
        <span>
          Total {lalu} <b>{rupiah(total((g) => g.previous))}</b>
        </span>
        <span>
          Total {ini} <b>{rupiah(total((g) => g.current))}</b>
        </span>
      </div>
    </>
  )
}
