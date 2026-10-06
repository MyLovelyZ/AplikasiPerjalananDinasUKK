import { useState } from 'react'

import { apiLaporanKeuangan, apiOpsiAnggaran, apiUnduhLaporanKeuangan } from '@/api/endpoint'
import type { FilterLaporanKeuangan } from '@/api/endpoint'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Muatan } from '@/components/ui/Keadaan'
import { PageHeader } from '@/components/ui/PageHeader'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LABEL_KATEGORI_BIAYA, NAMA_BULAN, RUPA_STATUS_PERJALANAN } from '@/constants/label'
import { GrafikBatang } from '@/features/dashboard/components/GrafikBatang'
import { useKirim } from '@/hooks/useKirim'
import { usePermintaan } from '@/hooks/usePermintaan'
import { rentangTanggal, rupiah, rupiahRingkas } from '@/utils/format'

const TAHUN_INI = new Date().getFullYear()

export function LaporanKeuanganPage() {
  const [tahun, setTahun] = useState(TAHUN_INI)
  const [bulan, setBulan] = useState(0)
  const [departemen, setDepartemen] = useState(0)
  const unduhan = useKirim()

  const filter: FilterLaporanKeuangan = {
    year: tahun,
    month: bulan || undefined,
    department_id: departemen || undefined,
  }

  const opsi = usePermintaan(() => apiOpsiAnggaran(), [])
  const { data, memuat, galat, muatUlang } = usePermintaan(() => apiLaporanKeuangan(filter), [
    tahun,
    bulan,
    departemen,
  ])

  const unduh = (format: 'pdf' | 'xlsx') => void unduhan.jalankan(() => apiUnduhLaporanKeuangan(filter, format))

  return (
    <>
      <PageHeader
        eyebrow="Keuangan"
        title="Laporan Keuangan"
        description="Rekap perjalanan, realisasi biaya, pencairan, dan serapan anggaran untuk satu tahun atau satu bulan."
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn" disabled={unduhan.mengirim} onClick={() => unduh('xlsx')}>
              <Icon name="download" size={16} />
              Excel
            </button>
            <button type="button" className="btn utama" disabled={unduhan.mengirim} onClick={() => unduh('pdf')}>
              <Icon name="download" size={16} />
              PDF
            </button>
          </div>
        }
      />

      {unduhan.galat && (
        <div className="kotak-galat" role="alert" style={{ marginBottom: 16 }}>
          <Icon name="peringatan" size={16} />
          <span>Gagal mengunduh laporan: {unduhan.galat}</span>
        </div>
      )}

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="bilah-alat">
          <select value={tahun} onChange={(e) => setTahun(Number(e.target.value))} aria-label="Tahun">
            {[TAHUN_INI - 2, TAHUN_INI - 1, TAHUN_INI, TAHUN_INI + 1].map((t) => (
              <option key={t} value={t}>
                Tahun {t}
              </option>
            ))}
          </select>
          <select value={bulan} onChange={(e) => setBulan(Number(e.target.value))} aria-label="Bulan">
            <option value={0}>Setahun penuh</option>
            {NAMA_BULAN.map((nama, indeks) => (
              <option key={nama} value={indeks + 1}>
                {nama}
              </option>
            ))}
          </select>
          <select value={departemen} onChange={(e) => setDepartemen(Number(e.target.value))} aria-label="Departemen">
            <option value={0}>Semua departemen</option>
            {(opsi.data?.departments ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={8}>
        {(laporan) => {
          const r = laporan.summary
          return (
            <>
              <div className="grid-stat">
                <StatCard
                  icon="plane"
                  title="Perjalanan disetujui"
                  value={r.trips_approved}
                  note={`${r.trips_submitted} diajukan · estimasi ${rupiahRingkas(r.estimated_cost)}`}
                />
                <StatCard
                  icon="chart"
                  warna="ungu"
                  title="Realisasi biaya"
                  value={rupiahRingkas(r.realized_spending)}
                  note="Pengeluaran terverifikasi"
                />
                <StatCard
                  icon="wallet"
                  warna="kuning"
                  title="Dana dibayarkan"
                  value={rupiahRingkas(r.advances_paid + r.reimbursements_paid)}
                  note={`Uang muka ${rupiahRingkas(r.advances_paid)} · reimburse ${rupiahRingkas(r.reimbursements_paid)}`}
                />
                <StatCard
                  icon="grid"
                  warna="hijau"
                  title="Sisa anggaran"
                  value={rupiahRingkas(r.budget_remaining)}
                  note={`Dari pagu ${rupiahRingkas(r.budget_amount)}`}
                />
              </div>

              <div className="grid-dua">
                <section className="panel">
                  <PanelHeader title="Realisasi per Kategori" subtitle={laporan.period.label} />
                  <div className="daftar">
                    {laporan.by_category.map((k) => (
                      <div className="daftar-baris" key={k.category}>
                        <span className="isi">
                          <b>{LABEL_KATEGORI_BIAYA[k.category]}</b>
                        </span>
                        <b className="angka">{rupiah(k.total)}</b>
                      </div>
                    ))}
                  </div>
                </section>

                {laporan.by_month.length > 0 ? (
                  <section className="panel">
                    <PanelHeader title="Realisasi per Bulan" subtitle={`Tahun ${laporan.period.year}`} />
                    <GrafikBatang
                      titik={laporan.by_month.map((b) => ({ label: NAMA_BULAN[b.month - 1].slice(0, 3), nilai: b.total }))}
                      formatNilai={rupiahRingkas}
                    />
                  </section>
                ) : (
                  <section className="panel">
                    <PanelHeader title="Pencairan" subtitle={laporan.period.label} />
                    <div className="daftar">
                      <div className="daftar-baris">
                        <span className="isi">
                          <b>Uang muka dibayar</b>
                        </span>
                        <b className="angka">{rupiah(r.advances_paid)}</b>
                      </div>
                      <div className="daftar-baris">
                        <span className="isi">
                          <b>Reimbursement dibayar</b>
                        </span>
                        <b className="angka">{rupiah(r.reimbursements_paid)}</b>
                      </div>
                      <div className="daftar-baris">
                        <span className="isi">
                          <b>Pengembalian diterima</b>
                        </span>
                        <b className="angka">{rupiah(r.refunds_received)}</b>
                      </div>
                    </div>
                  </section>
                )}
              </div>

              <section className="panel" style={{ marginTop: 16 }}>
                <PanelHeader title="Per Departemen" subtitle="Estimasi perjalanan disetujui dibanding realisasi dan pagu" />
                {laporan.by_department.length === 0 ? (
                  <Kosong ikon="gedung" judul="Belum ada data" pesan="Tidak ada aktivitas pada periode ini." />
                ) : (
                  <div className="pembungkus-tabel">
                    <table className="tabel">
                      <thead>
                        <tr>
                          <th>Departemen</th>
                          <th className="kanan">Perjalanan</th>
                          <th className="kanan">Estimasi</th>
                          <th className="kanan">Realisasi</th>
                          <th className="kanan">Pagu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {laporan.by_department.map((d) => (
                          <tr key={d.code}>
                            <td className="sel-utama">{d.department}</td>
                            <td className="kanan angka">{d.trips_approved}</td>
                            <td className="kanan angka">{rupiah(d.estimated_cost)}</td>
                            <td className="kanan angka">{rupiah(d.realized_spending)}</td>
                            <td className="kanan angka">{rupiah(d.budget_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="panel" style={{ marginTop: 16 }}>
                <PanelHeader title="Daftar Perjalanan" subtitle={`${laporan.trips.length} perjalanan berangkat pada periode ini`} />
                {laporan.trips.length === 0 ? (
                  <Kosong ikon="plane" judul="Tidak ada perjalanan" pesan="Tidak ada perjalanan pada periode ini." />
                ) : (
                  <div className="pembungkus-tabel">
                    <table className="tabel">
                      <thead>
                        <tr>
                          <th>Nomor</th>
                          <th>Pemohon</th>
                          <th>Tujuan</th>
                          <th>Tanggal</th>
                          <th>Status</th>
                          <th className="kanan">Estimasi</th>
                          <th className="kanan">Realisasi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {laporan.trips.map((t) => (
                          <tr key={t.request_number}>
                            <td className="sel-utama angka">{t.request_number}</td>
                            <td>
                              <div className="sel-utama">{t.requester}</div>
                              <div className="sel-sekunder">{t.department}</div>
                            </td>
                            <td>
                              <div className="sel-utama">{t.destination}</div>
                              <div className="sel-sekunder">{t.purpose}</div>
                            </td>
                            <td>{rentangTanggal(t.departure_date, t.return_date)}</td>
                            <td>
                              <StatusBadge {...RUPA_STATUS_PERJALANAN[t.status]} />
                            </td>
                            <td className="kanan angka">{rupiah(t.estimated_cost)}</td>
                            <td className="kanan angka">{t.realized_cost === null ? '—' : rupiah(t.realized_cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )
        }}
      </Muatan>
    </>
  )
}
