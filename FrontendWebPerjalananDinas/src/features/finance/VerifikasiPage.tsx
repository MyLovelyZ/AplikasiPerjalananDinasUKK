import { Link, useSearchParams } from 'react-router'

import { apiAntreanKeuangan } from '@/api/endpoint'
import type { TahapKeuangan } from '@/api/endpoint'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Muatan } from '@/components/ui/Keadaan'
import { PageHeader } from '@/components/ui/PageHeader'
import { Paginasi } from '@/components/ui/Paginasi'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LABEL_TAHAP } from '@/constants/label'
import { useHalaman } from '@/hooks/useHalaman'
import { usePermintaan } from '@/hooks/usePermintaan'
import { useAplikasi } from '@/layouts/konteksAplikasi'
import { rentangTanggal, rupiah } from '@/utils/format'

const TAB: Array<{ nilai: TahapKeuangan; label: string }> = [
  { nilai: 'finance', label: 'Cek anggaran' },
  { nilai: 'expense_report', label: 'Laporan biaya' },
]

/** /finance/approvals?stage=finance|expense_report */
export function VerifikasiPage() {
  const { pencarian, penandaSegar } = useAplikasi()
  const [params, setParams] = useSearchParams()
  const tahap: TahapKeuangan = params.get('stage') === 'expense_report' ? 'expense_report' : 'finance'
  const setTahap = (nilai: TahapKeuangan) => setParams({ stage: nilai }, { replace: true })
  const [halaman, setHalaman] = useHalaman(tahap, pencarian)

  const { data, memuat, galat, muatUlang } = usePermintaan(
    () => apiAntreanKeuangan({ stage: tahap, search: pencarian, page: halaman }),
    [tahap, pencarian, halaman, penandaSegar],
  )

  return (
    <>
      <PageHeader
        eyebrow="Keuangan"
        title="Verifikasi"
        description="Pengajuan yang menunggu verifikasi anggaran sebelum berangkat, dan laporan biaya setelah kembali. Diurutkan dari keberangkatan terdekat."
      />

      <section className="panel">
        <div className="tab" role="tablist">
          {TAB.map((t) => (
            <button
              key={t.nilai}
              type="button"
              role="tab"
              aria-selected={tahap === t.nilai}
              className={tahap === t.nilai ? 'aktif' : ''}
              onClick={() => setTahap(t.nilai)}
            >
              {t.label}
              {tahap === t.nilai && data && <span className="hitungan">{data.meta.total}</span>}
            </button>
          ))}
        </div>

        <div className="bilah-alat">
          {pencarian && <span className="status biru">Pencarian: “{pencarian}”</span>}
          <button type="button" className="btn kecil dorong" onClick={muatUlang}>
            <Icon name="segarkan" size={15} />
            Segarkan
          </button>
        </div>

        <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={6}>
          {(hasil) =>
            hasil.data.length === 0 ? (
              <Kosong ikon="check" judul="Antrean kosong" pesan="Tidak ada pengajuan yang menunggu Keuangan." />
            ) : (
              <>
                <div className="pembungkus-tabel">
                  <table className="tabel">
                    <thead>
                      <tr>
                        <th>Nomor</th>
                        <th>Pemohon</th>
                        <th>Tujuan &amp; keperluan</th>
                        <th>Tanggal</th>
                        <th className="kanan">Estimasi</th>
                        <th>Tahap</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {hasil.data.map((p) => (
                        <tr key={p.id}>
                          <td className="sel-utama angka">{p.request_number}</td>
                          <td>
                            <div className="sel-utama">{p.requester?.name ?? '—'}</div>
                            <div className="sel-sekunder">{p.department?.name ?? '—'}</div>
                          </td>
                          <td>
                            <div className="sel-utama">{p.destination}</div>
                            <div className="sel-sekunder">{p.purpose}</div>
                          </td>
                          <td>{rentangTanggal(p.departure_date, p.return_date)}</td>
                          <td className="kanan angka">{rupiah(p.estimated_cost)}</td>
                          <td>
                            {p.finance_stage && (
                              <StatusBadge
                                label={LABEL_TAHAP[p.finance_stage]}
                                warna={p.finance_stage === 'finance' ? 'biru' : 'ungu'}
                              />
                            )}
                          </td>
                          <td className="kanan">
                            <Link className="btn kecil utama" to={`/finance/approvals/${p.id}`}>
                              Periksa
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Paginasi meta={hasil.meta} satuan="pengajuan" onPindah={setHalaman} />
              </>
            )
          }
        </Muatan>
      </section>
    </>
  )
}
