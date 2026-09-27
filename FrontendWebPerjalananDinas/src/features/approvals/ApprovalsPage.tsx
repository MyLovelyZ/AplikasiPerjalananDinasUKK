import { useState } from 'react'

import { apiAntreanPersetujuan, apiRiwayatPersetujuan } from '@/api/endpoint'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Muatan } from '@/components/ui/Keadaan'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { usePermintaan } from '@/hooks/usePermintaan'
import { KartuPersetujuan } from '@/features/approvals/components/KartuPersetujuan'
import { ModalKeputusan } from '@/features/approvals/components/ModalKeputusan'
import type { Keputusan } from '@/features/approvals/components/ModalKeputusan'
import { manusiawi, rentangTanggal, rupiah, waktu, warnaPersetujuan } from '@/utils/format'
import type { TugasPersetujuan } from '@/api/tipe'

interface ApprovalsPageProps {
  onSukses: (pesan: string) => void
  onGalat: (penyebab: unknown) => void
  onBukaSppd: (id: number) => void
  /** Naik setiap ada keputusan, agar antrean di sidebar ikut diperbarui. */
  penandaSegar: number
  onAntreanBerubah: () => void
}

/**
 * Antrean persetujuan — kotak "3. Review Atasan / Dept Head" pada flowchart.
 * Tiga cabangnya (setujui, tolak, revisi) tersedia pada tiap kartu.
 */
export function ApprovalsPage({
  onSukses,
  onGalat,
  onBukaSppd,
  penandaSegar,
  onAntreanBerubah,
}: ApprovalsPageProps) {
  const [tab, setTab] = useState<'antrean' | 'riwayat'>('antrean')
  const [keputusan, setKeputusan] = useState<{ tugas: TugasPersetujuan; jenis: Keputusan } | null>(
    null,
  )

  const antrean = usePermintaan(() => apiAntreanPersetujuan(), [penandaSegar])
  const riwayat = usePermintaan(() => apiRiwayatPersetujuan(), [penandaSegar, tab])

  const selesaiMemutuskan = (pesan: string) => {
    setKeputusan(null)
    onSukses(pesan)
    antrean.muatUlang()
    onAntreanBerubah()
  }

  const jumlahAntrean = antrean.data?.halaman.total_data ?? 0

  return (
    <>
      <PageHeader
        eyebrow="Modul Persetujuan"
        title="Persetujuan Perjalanan"
        description="Tinjau pengajuan yang menunggu keputusan Anda. Setiap keputusan tercatat pada log audit."
        action={
          <button type="button" className="btn" onClick={antrean.muatUlang}>
            <Icon name="segarkan" size={16} />
            Segarkan
          </button>
        }
      />

      <section className="panel">
        <div className="tab">
          <button
            type="button"
            className={tab === 'antrean' ? 'aktif' : ''}
            onClick={() => setTab('antrean')}
          >
            Menunggu Keputusan
            {jumlahAntrean > 0 && <span className="hitungan">{jumlahAntrean}</span>}
          </button>
          <button
            type="button"
            className={tab === 'riwayat' ? 'aktif' : ''}
            onClick={() => setTab('riwayat')}
          >
            Riwayat Keputusan
          </button>
        </div>

        <div className="panel-body">
          {tab === 'antrean' ? (
            <Muatan
              data={antrean.data}
              memuat={antrean.memuat}
              galat={antrean.galat}
              onCobaLagi={antrean.muatUlang}
              barisRangka={4}
            >
              {(hasil) =>
                hasil.data.length === 0 ? (
                  <Kosong
                    ikon="check"
                    judul="Antrean Anda kosong"
                    pesan="Tidak ada pengajuan yang menunggu keputusan Anda saat ini."
                  />
                ) : (
                  <div className="grid-persetujuan">
                    {hasil.data.map((tugas) => (
                      <KartuPersetujuan
                        key={tugas.id}
                        tugas={tugas}
                        onLihatDetail={() => onBukaSppd(tugas.perjalanan.id)}
                        onPutuskan={(jenis) => setKeputusan({ tugas, jenis })}
                      />
                    ))}
                  </div>
                )
              }
            </Muatan>
          ) : (
            <Muatan
              data={riwayat.data}
              memuat={riwayat.memuat}
              galat={riwayat.galat}
              onCobaLagi={riwayat.muatUlang}
              barisRangka={4}
            >
              {(hasil) =>
                hasil.data.length === 0 ? (
                  <Kosong
                    ikon="clock"
                    judul="Belum ada riwayat"
                    pesan="Keputusan yang Anda ambil akan tercatat di sini."
                  />
                ) : (
                  <div className="pembungkus-tabel">
                    <table className="tabel">
                      <thead>
                        <tr>
                          <th>Nomor SPPD</th>
                          <th>Pemohon</th>
                          <th>Tujuan</th>
                          <th>Tanggal</th>
                          <th className="kanan">Estimasi</th>
                          <th>Keputusan</th>
                          <th>Waktu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hasil.data.map((tugas) => (
                          <tr key={tugas.id}>
                            <td className="sel-utama angka">
                              {tugas.perjalanan?.nomor_sppd ?? '—'}
                            </td>
                            <td>{tugas.perjalanan?.pemohon?.nama_lengkap ?? '—'}</td>
                            <td>{tugas.perjalanan?.lokasiTujuan?.nama_kota ?? '—'}</td>
                            <td className="sel-sekunder">
                              {tugas.perjalanan
                                ? rentangTanggal(
                                    tugas.perjalanan.tanggal_berangkat,
                                    tugas.perjalanan.tanggal_kembali,
                                  )
                                : '—'}
                            </td>
                            <td className="kanan angka">
                              {rupiah(tugas.perjalanan?.estimasi_biaya)}
                            </td>
                            <td>
                              <StatusBadge
                                label={manusiawi(tugas.status)}
                                warna={warnaPersetujuan(tugas.status)}
                              />
                            </td>
                            <td className="sel-sekunder">{waktu(tugas.tanggal_aksi)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </Muatan>
          )}
        </div>
      </section>

      {keputusan && (
        <ModalKeputusan
          tugas={keputusan.tugas}
          jenis={keputusan.jenis}
          onTutup={() => setKeputusan(null)}
          onSelesai={selesaiMemutuskan}
          onGalat={onGalat}
        />
      )}
    </>
  )
}
