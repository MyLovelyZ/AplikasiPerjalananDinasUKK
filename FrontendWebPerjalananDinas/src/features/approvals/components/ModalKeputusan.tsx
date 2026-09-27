import { useState } from 'react'
import type { FormEvent } from 'react'

import { apiMintaRevisi, apiSetujui, apiTolak } from '@/api/endpoint'
import { Icon } from '@/components/ui/Icon'
import { rupiah } from '@/utils/format'
import type { TugasPersetujuan } from '@/api/tipe'

/** Tiga cabang keputusan pada flowchart langkah 3. */
export type Keputusan = 'setujui' | 'tolak' | 'revisi'

interface ModalKeputusanProps {
  tugas: TugasPersetujuan
  jenis: Keputusan
  onTutup: () => void
  onSelesai: (pesan: string) => void
  onGalat: (penyebab: unknown) => void
}

/** Teks dan perilaku tiap cabang, dikumpulkan agar tidak tersebar di JSX. */
const RUPA: Record<
  Keputusan,
  {
    judul: string
    keterangan: string
    label: string
    kelas: string
    catatanWajib: boolean
    petunjuk: string
  }
> = {
  setujui: {
    judul: 'Setujui pengajuan',
    keterangan:
      'Pengajuan diteruskan ke tahap berikutnya, atau langsung disetujui bila ini tahap terakhir.',
    label: 'Setujui',
    kelas: 'btn sukses',
    catatanWajib: false,
    petunjuk: 'Catatan bersifat opsional.',
  },
  tolak: {
    judul: 'Tolak pengajuan',
    keterangan: 'Alur persetujuan berhenti dan pemohon tidak dapat mengajukan ulang SPPD ini.',
    label: 'Tolak pengajuan',
    kelas: 'btn bahaya',
    catatanWajib: true,
    petunjuk: 'Jelaskan alasan penolakan agar pemohon memahaminya.',
  },
  revisi: {
    judul: 'Kembalikan untuk revisi',
    keterangan:
      'Pengajuan dikembalikan ke pemohon. Setelah diperbaiki, SPPD dapat diajukan ulang dari tahap awal.',
    label: 'Minta revisi',
    kelas: 'btn utama',
    catatanWajib: true,
    petunjuk: 'Sebutkan bagian mana yang perlu diperbaiki.',
  },
}

/** Dialog konfirmasi sekaligus tempat menuliskan catatan keputusan. */
export function ModalKeputusan({
  tugas,
  jenis,
  onTutup,
  onSelesai,
  onGalat,
}: ModalKeputusanProps) {
  const rupa = RUPA[jenis]
  const [catatan, setCatatan] = useState('')
  const [mengirim, setMengirim] = useState(false)

  const kirim = async (peristiwa: FormEvent) => {
    peristiwa.preventDefault()
    setMengirim(true)

    try {
      const isi = catatan.trim()
      const hasil =
        jenis === 'setujui'
          ? await apiSetujui(tugas.id, isi || undefined)
          : jenis === 'tolak'
            ? await apiTolak(tugas.id, isi)
            : await apiMintaRevisi(tugas.id, isi)

      onSelesai(hasil.pesan)
    } catch (penyebab: unknown) {
      onGalat(penyebab)
      setMengirim(false)
    }
  }

  const tidakSah = rupa.catatanWajib && catatan.trim().length < 5

  return (
    <div className="lapisan-modal" role="dialog" aria-modal="true" aria-label={rupa.judul}>
      <div className="modal sempit">
        <div className="modal-head">
          <div>
            <h2>{rupa.judul}</h2>
            <p>{rupa.keterangan}</p>
          </div>
          <button type="button" className="tombol-tutup" onClick={onTutup} aria-label="Tutup">
            ×
          </button>
        </div>

        <form onSubmit={kirim} style={{ display: 'contents' }}>
          <div className="modal-body">
            <div className="kotak-info">
              <strong>{tugas.perjalanan.nomor_sppd}</strong>
              {tugas.perjalanan.pemohon?.nama_lengkap} · {tugas.perjalanan.keperluan}
              <br />
              Estimasi biaya {rupiah(tugas.perjalanan.estimasi_biaya)}
            </div>

            {tugas.ada_pelanggaran_plafon && jenis === 'setujui' && (
              <div className="peringatan-plafon">
                <Icon name="peringatan" size={16} />
                <span>
                  Pengajuan ini memuat biaya di atas plafon. Menyetujuinya berarti
                  menerima pengecualian tersebut.
                </span>
              </div>
            )}

            <div className="bidang">
              <label htmlFor="catatan-keputusan">
                Catatan{rupa.catatanWajib && <span className="wajib">*</span>}
              </label>
              <textarea
                id="catatan-keputusan"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder={rupa.petunjuk}
                autoFocus
              />
              <span className="petunjuk">{rupa.petunjuk}</span>
            </div>
          </div>

          <div className="modal-kaki">
            <button type="button" className="btn" onClick={onTutup} disabled={mengirim}>
              Batal
            </button>
            <button type="submit" className={rupa.kelas} disabled={mengirim || tidakSah}>
              {mengirim ? 'Memproses...' : rupa.label}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
