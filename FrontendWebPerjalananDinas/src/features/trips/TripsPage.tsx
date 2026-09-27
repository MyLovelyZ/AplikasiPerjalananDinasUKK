import { useState } from 'react'

import { apiDaftarSppd } from '@/api/endpoint'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Muatan } from '@/components/ui/Keadaan'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/auth/useAuth'
import { usePermintaan } from '@/hooks/usePermintaan'
import { rentangTanggal, rupiah, rupaStatusSppd } from '@/utils/format'

interface TripsPageProps {
  /** Kata kunci pencarian dari topbar. */
  pencarian: string
  onBuatSppd: () => void
  onBukaSppd: (id: number) => void
  /** Naik saat ada aksi yang mengubah data, memaksa daftar diambil ulang. */
  penandaSegar: number
}

/** Pilihan penyaring status; nilainya dikirim apa adanya ke query API. */
const FILTER_STATUS = [
  { nilai: '', label: 'Semua status' },
  { nilai: 'DRAFT', label: 'Draf' },
  { nilai: 'DIAJUKAN,MENUNGGU_PERSETUJUAN', label: 'Menunggu persetujuan' },
  { nilai: 'REVISI', label: 'Perlu revisi' },
  { nilai: 'DISETUJUI', label: 'Disetujui' },
  { nilai: 'DALAM_PERJALANAN,MENUNGGU_LAPORAN', label: 'Sedang berjalan' },
  { nilai: 'SELESAI', label: 'Selesai' },
  { nilai: 'DITOLAK,DIBATALKAN', label: 'Ditolak / dibatalkan' },
]

export function TripsPage({
  pencarian,
  onBuatSppd,
  onBukaSppd,
  penandaSegar,
}: TripsPageProps) {
  const { boleh } = useAuth()
  const [status, setStatus] = useState('')
  const [halaman, setHalaman] = useState(1)

  const { data, memuat, galat, muatUlang } = usePermintaan(
    () => apiDaftarSppd({ halaman, per_halaman: 12, status: status || undefined, cari: pencarian || undefined }),
    [halaman, status, pencarian, penandaSegar],
  )

  const gantiStatus = (nilai: string) => {
    setStatus(nilai)
    setHalaman(1) // filter baru selalu dimulai dari halaman pertama
  }

  const judulHalaman = boleh('sppd.lihat_semua') ? 'Perjalanan Dinas' : 'Perjalanan Saya'

  return (
    <>
      <PageHeader
        eyebrow="Modul Pengajuan"
        title={judulHalaman}
        description={
          boleh('sppd.lihat_semua')
            ? 'Seluruh pengajuan perjalanan dinas perusahaan beserta statusnya.'
            : 'Riwayat pengajuan perjalanan dinas Anda beserta status terkininya.'
        }
        action={
          boleh('sppd.buat') ? (
            <button type="button" className="btn utama" onClick={onBuatSppd}>
              <Icon name="plus" size={17} />
              Ajukan Perjalanan
            </button>
          ) : undefined
        }
      />

      <section className="panel">
        <div className="bilah-alat">
          <select
            value={status}
            onChange={(e) => gantiStatus(e.target.value)}
            aria-label="Saring berdasarkan status"
          >
            {FILTER_STATUS.map((f) => (
              <option key={f.nilai} value={f.nilai}>
                {f.label}
              </option>
            ))}
          </select>

          {pencarian && (
            <span className="status biru">Pencarian: “{pencarian}”</span>
          )}

          <button type="button" className="btn kecil dorong" onClick={muatUlang}>
            <Icon name="segarkan" size={15} />
            Segarkan
          </button>
        </div>

        <Muatan
          data={data}
          memuat={memuat}
          galat={galat}
          onCobaLagi={muatUlang}
          barisRangka={6}
        >
          {(hasil) =>
            hasil.data.length === 0 ? (
              <Kosong
                ikon="plane"
                judul="Tidak ada perjalanan"
                pesan={
                  pencarian || status
                    ? 'Tidak ada data yang cocok dengan penyaring saat ini. Coba ubah kata kunci atau statusnya.'
                    : 'Belum ada pengajuan perjalanan dinas. Mulai dengan membuat pengajuan baru.'
                }
                aksi={
                  boleh('sppd.buat') && !pencarian && !status ? (
                    <button type="button" className="btn kecil utama" onClick={onBuatSppd}>
                      <Icon name="plus" size={15} />
                      Ajukan sekarang
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <div className="pembungkus-tabel">
                  <table className="tabel">
                    <thead>
                      <tr>
                        <th>Nomor SPPD</th>
                        <th>Pemohon</th>
                        <th>Tujuan &amp; keperluan</th>
                        <th>Tanggal</th>
                        <th className="kanan">Estimasi</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {hasil.data.map((sppd) => {
                        const rupa = rupaStatusSppd(sppd.status)
                        return (
                          <tr key={sppd.id}>
                            <td className="sel-utama angka">{sppd.nomor_sppd}</td>
                            <td>
                              <div className="sel-utama">{sppd.pemohon?.nama_lengkap ?? '—'}</div>
                              <div className="sel-sekunder">{sppd.departemen?.nama ?? '—'}</div>
                            </td>
                            <td>
                              <div className="sel-utama">
                                {sppd.lokasiTujuan?.nama_kota ?? sppd.tujuan_lainnya ?? '—'}
                              </div>
                              <div className="sel-sekunder">{sppd.keperluan}</div>
                            </td>
                            <td>
                              <div className="sel-utama">
                                {rentangTanggal(sppd.tanggal_berangkat, sppd.tanggal_kembali)}
                              </div>
                              <div className="sel-sekunder">{sppd.jumlah_hari} hari</div>
                            </td>
                            <td className="kanan angka">{rupiah(sppd.estimasi_biaya)}</td>
                            <td>
                              <StatusBadge label={rupa.label} warna={rupa.warna} />
                            </td>
                            <td className="kanan">
                              <button
                                type="button"
                                className="btn kecil"
                                onClick={() => onBukaSppd(sppd.id)}
                              >
                                Detail
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="paginasi">
                  <span>
                    Menampilkan {hasil.data.length} dari {hasil.halaman.total_data} pengajuan ·
                    halaman {hasil.halaman.halaman_saat_ini} / {hasil.halaman.total_halaman}
                  </span>
                  <div className="tombol-halaman">
                    <button
                      type="button"
                      className="btn kecil"
                      disabled={halaman <= 1}
                      onClick={() => setHalaman((n) => n - 1)}
                    >
                      Sebelumnya
                    </button>
                    <button
                      type="button"
                      className="btn kecil"
                      disabled={halaman >= hasil.halaman.total_halaman}
                      onClick={() => setHalaman((n) => n + 1)}
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              </>
            )
          }
        </Muatan>
      </section>
    </>
  )
}
