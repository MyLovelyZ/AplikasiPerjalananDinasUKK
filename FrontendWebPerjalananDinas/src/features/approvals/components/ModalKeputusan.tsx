import { useState } from 'react'
import type { FormEvent } from 'react'

import { apiSetujuiAtasan, apiTolakAtasan } from '@/api/endpoint'
import type { Perjalanan } from '@/api/tipe'
import { KotakGalat, Modal, PesanKolom } from '@/components/ui/Modal'
import { useKirim } from '@/hooks/useKirim'
import { rupiah } from '@/utils/format'

export type Keputusan = 'setujui' | 'tolak'

const RUPA: Record<Keputusan, { judul: string; keterangan: string; label: string; kelas: string; petunjuk: string }> = {
  setujui: {
    judul: 'Setujui pengajuan',
    keterangan: 'Pengajuan diteruskan ke Keuangan untuk verifikasi anggaran.',
    label: 'Setujui',
    kelas: 'btn sukses',
    petunjuk: 'Catatan bersifat opsional.',
  },
  tolak: {
    judul: 'Tolak pengajuan',
    keterangan: 'Pengajuan berhenti; pegawai perlu membuat pengajuan baru bila ingin mengulang.',
    label: 'Tolak pengajuan',
    kelas: 'btn bahaya',
    petunjuk: 'Jelaskan alasan penolakan (min. 5 karakter) agar pegawai memahaminya.',
  },
}

interface ModalKeputusanProps {
  perjalanan: Perjalanan
  jenis: Keputusan
  onTutup: () => void
  onSelesai: (pesan: string) => void
}

export function ModalKeputusan({ perjalanan, jenis, onTutup, onSelesai }: ModalKeputusanProps) {
  const rupa = RUPA[jenis]
  const [catatan, setCatatan] = useState('')
  const { mengirim, galat, galatKolom, jalankan } = useKirim()

  const kirim = async (peristiwa: FormEvent) => {
    peristiwa.preventDefault()
    const isi = catatan.trim()
    const hasil = await jalankan(() =>
      jenis === 'setujui' ? apiSetujuiAtasan(perjalanan.id, isi || undefined) : apiTolakAtasan(perjalanan.id, isi),
    )
    if (hasil) onSelesai(hasil.message)
  }

  return (
    <Modal
      judul={rupa.judul}
      keterangan={rupa.keterangan}
      ukuran="sempit"
      onTutup={onTutup}
      onKirim={kirim}
      kaki={
        <>
          <button type="button" className="btn" onClick={onTutup} disabled={mengirim}>
            Batal
          </button>
          <button
            type="submit"
            className={rupa.kelas}
            disabled={mengirim || (jenis === 'tolak' && catatan.trim().length < 5)}
          >
            {mengirim ? 'Memproses...' : rupa.label}
          </button>
        </>
      }
    >
      <KotakGalat pesan={galat} />
      <div className="kotak-info">
        <strong>{perjalanan.request_number}</strong>
        {perjalanan.requester?.name} · {perjalanan.purpose}
        <br />
        Estimasi biaya {rupiah(perjalanan.estimated_cost)}
      </div>

      <div className="bidang">
        <label htmlFor="catatan-keputusan">
          Catatan{jenis === 'tolak' && <span className="wajib">*</span>}
        </label>
        <textarea
          id="catatan-keputusan"
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder={rupa.petunjuk}
          autoFocus
        />
        <span className="petunjuk">{rupa.petunjuk}</span>
        <PesanKolom pesan={galatKolom.note} />
      </div>
    </Modal>
  )
}
