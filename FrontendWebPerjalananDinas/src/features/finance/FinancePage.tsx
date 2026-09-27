import { useState } from 'react'

import { apiDaftarPencairan, apiProsesPencairan } from '@/api/endpoint'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Muatan } from '@/components/ui/Keadaan'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { usePermintaan } from '@/hooks/usePermintaan'
import { manusiawi, rupiah, tanggalPendek, warnaPencairan } from '@/utils/format'

interface FinancePageProps {
  onSukses: (pesan: string) => void
  onGalat: (penyebab: unknown) => void
  onBukaSppd: (id: number) => void
}

const FILTER_STATUS = [
  { nilai: '', label: 'Semua status' },
  { nilai: 'MENUNGGU', label: 'Menunggu' },
  { nilai: 'DIPROSES', label: 'Sedang diproses' },
  { nilai: 'SELESAI', label: 'Selesai' },
  { nilai: 'GAGAL', label: 'Gagal' },
]

const FILTER_JENIS = [
  { nilai: '', label: 'Semua jenis' },
  { nilai: 'UANG_MUKA', label: 'Uang muka' },
  { nilai: 'REIMBURSEMENT', label: 'Reimbursement' },
  { nilai: 'PENGEMBALIAN', label: 'Pengembalian' },
]

/**
 * Ruang kerja Tim Keuangan: seluruh pencairan dana beserta tombol untuk
 * menandainya selesai. Menandai selesai sekaligus mencatat nomor rujukan
 * payroll — itulah yang dimaksud "Sync Payroll/Akuntansi" pada flowchart.
 */
export function FinancePage({ onSukses, onGalat, onBukaSppd }: FinancePageProps) {
  const [status, setStatus] = useState('')
  const [jenis, setJenis] = useState('')
  const [sedangProses, setSedangProses] = useState<number | null>(null)

  const { data, memuat, galat, muatUlang } = usePermintaan(
    () => apiDaftarPencairan({ status: status || undefined, jenis: jenis || undefined }),
    [status, jenis],
  )

  const daftar = data?.data ?? []
  const menunggu = daftar.filter((p) => p.status === 'MENUNGGU').length
  const totalMenunggu = daftar
    .filter((p) => p.status !== 'SELESAI' && p.status !== 'GAGAL')
    .reduce((jumlah, p) => jumlah + Number(p.jumlah), 0)
  const totalSelesai = daftar
    .filter((p) => p.status === 'SELESAI')
    .reduce((jumlah, p) => jumlah + Number(p.jumlah), 0)

  const proses = async (id: number) => {
    const referensi = window.prompt(
      'Nomor rujukan payroll / akuntansi (kosongkan bila belum ada):',
      '',
    )
    // prompt mengembalikan null bila dibatalkan; string kosong tetap diteruskan.
    if (referensi === null) return

    setSedangProses(id)
    try {
      const { pesan } = await apiProsesPencairan(id, {
        status: 'SELESAI',
        referensi_payroll: referensi.trim() || undefined,
      })
      onSukses(pesan)
      muatUlang()
    } catch (penyebab: unknown) {
      onGalat(penyebab)
    } finally {
      setSedangProses(null)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Modul Keuangan"
        title="Pencairan Dana"
        description="Uang muka, reimbursement, dan pengembalian sisa dana perjalanan dinas."
        action={
          <button type="button" className="btn" onClick={muatUlang}>
            <Icon name="segarkan" size={16} />
            Segarkan
          </button>
        }
      />

      <div className="grid-stat">
        <StatCard
          icon="wallet"
          title="Total Transaksi"
          value={data?.halaman.total_data ?? 0}
          note="Sesuai penyaring saat ini"
        />
        <StatCard
          icon="clock"
          warna="kuning"
          title="Menunggu Diproses"
          value={menunggu}
          note="Belum ditandai selesai"
        />
        <StatCard
          icon="chart"
          warna="ungu"
          title="Nilai Belum Cair"
          value={rupiah(totalMenunggu)}
          note="Menunggu atau sedang diproses"
        />
        <StatCard
          icon="check"
          warna="hijau"
          title="Sudah Dicairkan"
          value={rupiah(totalSelesai)}
          note="Dari transaksi yang tampil"
        />
      </div>

      <section className="panel">
        <div className="bilah-alat">
          <select value={jenis} onChange={(e) => setJenis(e.target.value)} aria-label="Saring jenis">
            {FILTER_JENIS.map((f) => (
              <option key={f.nilai} value={f.nilai}>
                {f.label}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Saring status"
          >
            {FILTER_STATUS.map((f) => (
              <option key={f.nilai} value={f.nilai}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <Muatan
          data={data}
          memuat={memuat}
          galat={galat}
          onCobaLagi={muatUlang}
          barisRangka={5}
        >
          {(hasil) =>
            hasil.data.length === 0 ? (
              <Kosong
                ikon="wallet"
                judul="Belum ada pencairan"
                pesan="Transaksi muncul setelah SPPD disetujui atau laporan diverifikasi."
              />
            ) : (
              <div className="pembungkus-tabel">
                <table className="tabel">
                  <thead>
                    <tr>
                      <th>SPPD &amp; penerima</th>
                      <th>Jenis</th>
                      <th className="kanan">Jumlah</th>
                      <th>Rekening</th>
                      <th>Rujukan</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {hasil.data.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="sel-utama angka">
                            {p.perjalanan?.nomor_sppd ?? '—'}
                          </div>
                          <div className="sel-sekunder">
                            {p.perjalanan?.pemohon?.nama_lengkap ?? '—'}
                          </div>
                        </td>
                        <td>
                          <div className="sel-utama">{manusiawi(p.jenis)}</div>
                          <div className="sel-sekunder">{manusiawi(p.metode)}</div>
                        </td>
                        <td className="kanan angka sel-utama">{rupiah(p.jumlah)}</td>
                        <td className="sel-sekunder">
                          {p.nama_bank ? `${p.nama_bank} · ${p.no_rekening ?? '—'}` : '—'}
                        </td>
                        <td className="sel-sekunder">
                          {p.referensi_payroll ?? '—'}
                          {p.tanggal_pencairan && (
                            <div>{tanggalPendek(p.tanggal_pencairan)}</div>
                          )}
                        </td>
                        <td>
                          <StatusBadge label={manusiawi(p.status)} warna={warnaPencairan(p.status)} />
                        </td>
                        <td className="kanan">
                          <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                            {p.perjalanan && (
                              <button
                                type="button"
                                className="btn kecil"
                                onClick={() => onBukaSppd(p.perjalanan!.id)}
                              >
                                SPPD
                              </button>
                            )}
                            {p.status !== 'SELESAI' && (
                              <button
                                type="button"
                                className="btn kecil utama"
                                disabled={sedangProses === p.id}
                                onClick={() => proses(p.id)}
                              >
                                {sedangProses === p.id ? '...' : 'Tandai cair'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </Muatan>
      </section>
    </>
  )
}
