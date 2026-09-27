import { apiDaftarSppd } from '@/api/endpoint'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Muatan } from '@/components/ui/Keadaan'
import { PageHeader } from '@/components/ui/PageHeader'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { usePermintaan } from '@/hooks/usePermintaan'
import { rentangTanggal, rupiah, rupaStatusSppd, sejak } from '@/utils/format'

interface SubmissionPageProps {
  onBuatSppd: () => void
  onBukaSppd: (id: number) => void
  penandaSegar: number
}

/** Sembilan langkah alur, mengikuti flowchart sistem dari START sampai END. */
const LANGKAH_ALUR = [
  {
    judul: 'Isi formulir SPPD',
    isi: 'Lengkapi tujuan, tanggal, moda transportasi, dan rincian estimasi biaya. Data tersimpan sebagai draf.',
  },
  {
    judul: 'Sistem memeriksa travel policy',
    isi: 'Biaya yang melampaui plafon tidak menghalangi pengajuan, tetapi ditandai agar terlihat penyetuju.',
  },
  {
    judul: 'Atasan meninjau',
    isi: 'Atasan dapat menyetujui, menolak, atau mengembalikan pengajuan untuk Anda perbaiki.',
  },
  {
    judul: 'Persetujuan berjenjang',
    isi: 'Pengajuan bernilai besar melewati beberapa tahap, termasuk verifikasi Tim Keuangan.',
  },
  {
    judul: 'Uang muka dicairkan',
    isi: 'Setelah disetujui penuh, Tim Keuangan memproses uang muka maksimal 80% dari estimasi biaya.',
  },
  {
    judul: 'Jalankan perjalanan',
    isi: 'Selesai bertugas, tandai perjalanan sebagai selesai untuk membuka tahap pelaporan.',
  },
  {
    judul: 'Unggah nota',
    isi: 'Lampirkan nota tiap klaim. Nota yang sama tidak dapat diunggah dua kali.',
  },
  {
    judul: 'Verifikasi Keuangan',
    isi: 'Tim Keuangan menetapkan jumlah yang disetujui, lalu sistem menghitung selisih terhadap uang muka.',
  },
  {
    judul: 'Penyelesaian dana',
    isi: 'Kekurangan dibayar sebagai reimbursement, kelebihan dikembalikan, lalu SPPD ditutup.',
  },
]

/**
 * Halaman pengantar pengajuan: menjelaskan alur sistem sekali di muka,
 * lalu menampilkan draf dan pengajuan terbaru agar pemohon bisa melanjutkan
 * yang belum selesai tanpa berpindah halaman.
 */
export function SubmissionPage({ onBuatSppd, onBukaSppd, penandaSegar }: SubmissionPageProps) {
  const { data, memuat, galat, muatUlang } = usePermintaan(
    () => apiDaftarSppd({ per_halaman: 6 }),
    [penandaSegar],
  )

  const draf = (data?.data ?? []).filter((s) => ['DRAFT', 'REVISI'].includes(s.status))

  return (
    <>
      <PageHeader
        eyebrow="Modul Pengajuan"
        title="Ajukan Perjalanan Dinas"
        description="Pahami alurnya sekali, lalu ajukan perjalanan Anda. Seluruh proses berjalan digital tanpa berkas kertas."
        action={
          <button type="button" className="btn utama" onClick={onBuatSppd}>
            <Icon name="plus" size={17} />
            Buat Pengajuan
          </button>
        }
      />

      <div className="grid-dua">
        <section className="panel">
          <PanelHeader
            title="Alur Perjalanan Dinas"
            subtitle="Sembilan langkah dari pengajuan sampai penyelesaian dana"
          />
          <div className="linimasa">
            {LANGKAH_ALUR.map((langkah, indeks) => (
              <div className="linimasa-item" key={langkah.judul}>
                <div className="linimasa-titik">{indeks + 1}</div>
                <div className="linimasa-isi">
                  <b>{langkah.judul}</b>
                  <small>{langkah.isi}</small>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="panel">
            <PanelHeader
              title="Draf & Perlu Revisi"
              subtitle="Pengajuan yang belum terkirim ke penyetuju"
            />
            <Muatan
              data={data}
              memuat={memuat}
              galat={galat}
              onCobaLagi={muatUlang}
              barisRangka={3}
            >
              {() =>
                draf.length === 0 ? (
                  <Kosong
                    ikon="check"
                    judul="Tidak ada yang tertunda"
                    pesan="Semua pengajuan Anda sudah terkirim ke penyetuju."
                  />
                ) : (
                  <div className="daftar">
                    {draf.map((sppd) => {
                      const rupa = rupaStatusSppd(sppd.status)
                      return (
                        <button
                          key={sppd.id}
                          type="button"
                          className="daftar-baris"
                                                   onClick={() => onBukaSppd(sppd.id)}
                        >
                          <span className="isi">
                            <b>{sppd.keperluan}</b>
                            <small>
                              {sppd.nomor_sppd} · {rupiah(sppd.estimasi_biaya)}
                            </small>
                          </span>
                          <StatusBadge label={rupa.label} warna={rupa.warna} />
                        </button>
                      )
                    })}
                  </div>
                )
              }
            </Muatan>
          </section>

          <section className="panel">
            <PanelHeader title="Pengajuan Terbaru" subtitle="Enam pengajuan paling akhir" />
            <Muatan
              data={data}
              memuat={memuat}
              galat={galat}
              onCobaLagi={muatUlang}
              barisRangka={3}
            >
              {(hasil) =>
                hasil.data.length === 0 ? (
                  <Kosong
                    ikon="plane"
                    judul="Belum ada pengajuan"
                    pesan="Klik “Buat Pengajuan” untuk memulai perjalanan dinas pertama Anda."
                  />
                ) : (
                  <div className="daftar">
                    {hasil.data.map((sppd) => (
                      <button
                        key={sppd.id}
                        type="button"
                        className="daftar-baris"
                                               onClick={() => onBukaSppd(sppd.id)}
                      >
                        <span className="isi">
                          <b>
                            {sppd.lokasiTujuan?.nama_kota ?? sppd.tujuan_lainnya ?? '—'} ·{' '}
                            {rentangTanggal(sppd.tanggal_berangkat, sppd.tanggal_kembali)}
                          </b>
                          <small>
                            {sppd.nomor_sppd} · dibuat {sejak(sppd.dibuat_pada)}
                          </small>
                        </span>
                        <StatusBadge {...rupaStatusSppd(sppd.status)} />
                      </button>
                    ))}
                  </div>
                )
              }
            </Muatan>
          </section>
        </div>
      </div>
    </>
  )
}
