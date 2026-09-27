import { useState } from 'react'

import { apiDaftarLaporan } from '@/api/endpoint'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Muatan } from '@/components/ui/Keadaan'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/auth/useAuth'
import { usePermintaan } from '@/hooks/usePermintaan'
import { rupiah, rupaStatusLaporan, tanggalPendek } from '@/utils/format'

interface ReportsPageProps {
  onBukaLaporan: (laporanId: number) => void
  penandaSegar: number
}

const FILTER_STATUS = [
  { nilai: '', label: 'Semua status' },
  { nilai: 'DRAFT', label: 'Draf' },
  { nilai: 'DIAJUKAN', label: 'Menunggu verifikasi' },
  { nilai: 'REVISI', label: 'Perlu revisi' },
  { nilai: 'DIVERIFIKASI', label: 'Diverifikasi' },
]

/** Label selisih realisasi terhadap uang muka (aturan D-4). */
const RUPA_SELISIH = {
  KURANG_BAYAR: { label: 'Perusahaan menambah', warna: 'kuning' as const },
  LEBIH_BAYAR: { label: 'Karyawan mengembalikan', warna: 'ungu' as const },
  NIHIL: { label: 'Sesuai', warna: 'hijau' as const },
}

/**
 * Daftar laporan pertanggungjawaban.
 * Karyawan melihat laporannya sendiri; Tim Keuangan melihat seluruhnya
 * beserta antrean yang menunggu verifikasi.
 */
export function ReportsPage({ onBukaLaporan, penandaSegar }: ReportsPageProps) {
  const { boleh } = useAuth()
  const [status, setStatus] = useState('')

  const { data, memuat, galat, muatUlang } = usePermintaan(
    () => apiDaftarLaporan({ status: status || undefined }),
    [status, penandaSegar],
  )

  const daftar = data?.data ?? []
  const menungguVerifikasi = daftar.filter((l) => l.status === 'DIAJUKAN').length
  const totalRealisasi = daftar.reduce((jumlah, l) => jumlah + Number(l.total_realisasi), 0)
  const perluDitindak = daftar.filter(
    (l) => l.status === 'DIVERIFIKASI' && l.jenis_selisih !== 'NIHIL',
  ).length

  return (
    <>
      <PageHeader
        eyebrow="Modul Pelaporan"
        title="Laporan Pertanggungjawaban"
        description="Realisasi biaya perjalanan beserta nota pendukung dan hasil verifikasi Tim Keuangan."
        action={
          <button type="button" className="btn" onClick={muatUlang}>
            <Icon name="segarkan" size={16} />
            Segarkan
          </button>
        }
      />

      <div className="grid-stat">
        <StatCard
          icon="file"
          title="Total Laporan"
          value={data?.halaman.total_data ?? 0}
          note="Sesuai penyaring saat ini"
        />
        <StatCard
          icon="clock"
          warna="kuning"
          title="Menunggu Verifikasi"
          value={menungguVerifikasi}
          note="Perlu diperiksa Tim Keuangan"
        />
        <StatCard
          icon="wallet"
          warna="ungu"
          title="Total Realisasi"
          value={rupiah(totalRealisasi)}
          note="Dari laporan yang tampil"
        />
        <StatCard
          icon="check"
          warna="hijau"
          title="Selisih Perlu Ditindak"
          value={perluDitindak}
          note="Reimbursement atau pengembalian"
        />
      </div>

      <section className="panel">
        <div className="bilah-alat">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Saring berdasarkan status laporan"
          >
            {FILTER_STATUS.map((f) => (
              <option key={f.nilai} value={f.nilai}>
                {f.label}
              </option>
            ))}
          </select>

          {boleh('laporan.verifikasi') && (
            <span className="status biru dorong">Anda dapat memverifikasi laporan</span>
          )}
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
                ikon="file"
                judul="Belum ada laporan"
                pesan="Laporan dibuat setelah perjalanan dinas selesai dijalankan."
              />
            ) : (
              <div className="pembungkus-tabel">
                <table className="tabel">
                  <thead>
                    <tr>
                      <th>Nomor laporan</th>
                      <th>SPPD &amp; pemohon</th>
                      <th>Tanggal lapor</th>
                      <th className="kanan">Uang muka</th>
                      <th className="kanan">Realisasi</th>
                      <th>Selisih</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {hasil.data.map((laporan) => {
                      const rupa = rupaStatusLaporan(laporan.status)
                      const selisih = RUPA_SELISIH[laporan.jenis_selisih]

                      return (
                        <tr key={laporan.id}>
                          <td className="sel-utama angka">{laporan.nomor_laporan}</td>
                          <td>
                            <div className="sel-utama">
                              {laporan.perjalanan?.nomor_sppd ?? '—'}
                            </div>
                            <div className="sel-sekunder">
                              {laporan.perjalanan?.pemohon?.nama_lengkap ?? '—'}
                            </div>
                          </td>
                          <td className="sel-sekunder">{tanggalPendek(laporan.tanggal_lapor)}</td>
                          <td className="kanan angka">{rupiah(laporan.total_uang_muka)}</td>
                          <td className="kanan angka sel-utama">
                            {rupiah(laporan.total_realisasi)}
                          </td>
                          <td>
                            <StatusBadge label={selisih.label} warna={selisih.warna} />
                            {laporan.jenis_selisih !== 'NIHIL' && (
                              <div className="sel-sekunder angka">
                                {rupiah(Math.abs(Number(laporan.selisih)))}
                              </div>
                            )}
                          </td>
                          <td>
                            <StatusBadge label={rupa.label} warna={rupa.warna} />
                          </td>
                          <td className="kanan">
                            <button
                              type="button"
                              className="btn kecil"
                              onClick={() => onBukaLaporan(laporan.id)}
                            >
                              Buka
                            </button>
                          </td>
                        </tr>
                      )
                    })}
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
