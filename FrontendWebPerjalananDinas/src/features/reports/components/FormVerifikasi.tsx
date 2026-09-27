import { useState } from 'react'
import type { FormEvent } from 'react'

import { apiRevisiLaporan, apiVerifikasiLaporan } from '@/api/endpoint'
import type { KeputusanKlaim } from '@/api/endpoint'
import { Icon } from '@/components/ui/Icon'
import { rupiah } from '@/utils/format'
import type { Laporan } from '@/api/tipe'

interface FormVerifikasiProps {
  laporan: Laporan
  onSelesai: (pesan: string) => void
  onBatal: () => void
  onGalat: (penyebab: unknown) => void
}

/**
 * Verifikasi nota oleh Tim Keuangan — flowchart langkah 8.
 *
 * Setiap klaim diputuskan sendiri-sendiri; jumlah yang disetujui boleh lebih
 * kecil dari yang diajukan (status DISETUJUI_SEBAGIAN). Total realisasi yang
 * tampil di bawah dihitung ulang seketika supaya petugas melihat akibat
 * keputusannya terhadap selisih sebelum menyimpan.
 */
export function FormVerifikasi({ laporan, onSelesai, onBatal, onGalat }: FormVerifikasiProps) {
  const klaim = laporan.klaim ?? []

  const [keputusan, setKeputusan] = useState<Record<number, KeputusanKlaim>>(() =>
    Object.fromEntries(
      klaim.map((k) => [
        k.id,
        {
          klaim_id: k.id,
          status: 'DISETUJUI' as const,
          jumlah_disetujui: Number(k.jumlah_diajukan),
        },
      ]),
    ),
  )
  const [catatan, setCatatan] = useState('')
  const [mengirim, setMengirim] = useState(false)

  const ubah = (id: number, perubahan: Partial<KeputusanKlaim>) =>
    setKeputusan((peta) => ({ ...peta, [id]: { ...peta[id], ...perubahan } }))

  /** Mengubah status juga menyesuaikan nominalnya, agar keduanya selaras. */
  const gantiStatus = (id: number, status: KeputusanKlaim['status'], diajukan: number) => {
    if (status === 'DITOLAK') return ubah(id, { status, jumlah_disetujui: 0 })
    if (status === 'DISETUJUI') return ubah(id, { status, jumlah_disetujui: diajukan })
    return ubah(id, { status })
  }

  const totalRealisasi = Object.values(keputusan).reduce(
    (jumlah, k) => (k.status === 'DITOLAK' ? jumlah : jumlah + Number(k.jumlah_disetujui || 0)),
    0,
  )
  const selisih = totalRealisasi - Number(laporan.total_uang_muka)

  const kirim = async (peristiwa: FormEvent) => {
    peristiwa.preventDefault()
    setMengirim(true)
    try {
      const { pesan } = await apiVerifikasiLaporan(laporan.id, {
        catatan: catatan.trim() || undefined,
        klaim: Object.values(keputusan),
      })
      onSelesai(pesan)
    } catch (penyebab: unknown) {
      onGalat(penyebab)
      setMengirim(false)
    }
  }

  const kembalikan = async () => {
    const alasan = window.prompt('Catatan revisi untuk pemohon:')
    if (!alasan?.trim()) return

    setMengirim(true)
    try {
      const { pesan } = await apiRevisiLaporan(laporan.id, alasan.trim())
      onSelesai(pesan)
    } catch (penyebab: unknown) {
      onGalat(penyebab)
      setMengirim(false)
    }
  }

  return (
    <form onSubmit={kirim} className="panel" style={{ borderColor: 'var(--biru-terang)' }}>
      <div className="panel-head">
        <div>
          <h2>Verifikasi Nota</h2>
          <p>Tentukan jumlah yang disetujui untuk setiap klaim biaya</p>
        </div>
      </div>

      <div className="pembungkus-tabel">
        <table className="tabel" style={{ minWidth: 600 }}>
          <thead>
            <tr>
              <th>Klaim</th>
              <th className="kanan">Diajukan</th>
              <th>Keputusan</th>
              <th className="kanan">Disetujui</th>
            </tr>
          </thead>
          <tbody>
            {klaim.map((baris) => {
              const nilai = keputusan[baris.id]
              const diajukan = Number(baris.jumlah_diajukan)

              return (
                <tr key={baris.id}>
                  <td>
                    <div className="sel-utama">{baris.kategoriBiaya?.nama ?? '—'}</div>
                    <div className="sel-sekunder">{baris.deskripsi}</div>
                    {!(baris.bukti ?? []).length && baris.kategoriBiaya?.wajib_bukti && (
                      <span className="tanda-plafon">
                        <Icon name="peringatan" size={11} />
                        Tanpa nota
                      </span>
                    )}
                  </td>
                  <td className="kanan angka">{rupiah(diajukan)}</td>
                  <td>
                    <select
                      value={nilai.status}
                      onChange={(e) =>
                        gantiStatus(baris.id, e.target.value as KeputusanKlaim['status'], diajukan)
                      }
                      style={{
                        height: 32,
                        padding: '0 8px',
                        border: '1px solid var(--garis-tegas)',
                        borderRadius: 8,
                        fontSize: 12.5,
                        background: 'var(--putih)',
                      }}
                    >
                      <option value="DISETUJUI">Disetujui penuh</option>
                      <option value="DISETUJUI_SEBAGIAN">Disetujui sebagian</option>
                      <option value="DITOLAK">Ditolak</option>
                    </select>
                  </td>
                  <td className="kanan">
                    <input
                      type="number"
                      min={0}
                      max={diajukan}
                      step={1000}
                      value={nilai.jumlah_disetujui}
                      disabled={nilai.status !== 'DISETUJUI_SEBAGIAN'}
                      onChange={(e) =>
                        ubah(baris.id, { jumlah_disetujui: Number(e.target.value) })
                      }
                      style={{
                        height: 32,
                        width: 130,
                        padding: '0 9px',
                        border: '1px solid var(--garis-tegas)',
                        borderRadius: 8,
                        fontSize: 12.5,
                        textAlign: 'right',
                        background:
                          nilai.status === 'DISETUJUI_SEBAGIAN'
                            ? 'var(--putih)'
                            : 'var(--latar-lembut)',
                      }}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="panel-body">
        <div className="ringkas-detail" style={{ borderRadius: 10, overflow: 'hidden' }}>
          <div>
            <span>Uang muka</span>
            <strong>{rupiah(laporan.total_uang_muka)}</strong>
          </div>
          <div>
            <span>Total realisasi</span>
            <strong>{rupiah(totalRealisasi)}</strong>
          </div>
          <div>
            <span>{selisih >= 0 ? 'Perusahaan menambah' : 'Karyawan mengembalikan'}</span>
            <strong style={{ color: selisih === 0 ? 'var(--hijau)' : 'var(--biru)' }}>
              {rupiah(Math.abs(selisih))}
            </strong>
          </div>
        </div>

        <div className="bidang" style={{ marginTop: 14 }}>
          <label htmlFor="catatan-verifikasi">Catatan verifikasi</label>
          <textarea
            id="catatan-verifikasi"
            placeholder="Opsional — catatan untuk arsip dan pemohon"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button type="button" className="btn" onClick={onBatal} disabled={mengirim}>
            Batal
          </button>
          <button type="button" className="btn bahaya" onClick={kembalikan} disabled={mengirim}>
            <Icon name="revisi" size={15} />
            Kembalikan untuk revisi
          </button>
          <button type="submit" className="btn utama" disabled={mengirim || klaim.length === 0}>
            <Icon name="check" size={15} />
            {mengirim ? 'Menyimpan...' : 'Simpan verifikasi'}
          </button>
        </div>
      </div>
    </form>
  )
}
