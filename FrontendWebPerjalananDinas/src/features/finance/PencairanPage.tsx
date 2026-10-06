import { useState } from 'react'
import type { FormEvent } from 'react'

import { apiBayarPencairan, apiDaftarPencairan } from '@/api/endpoint'
import type { JenisPencairan, MetodeBayar, Pencairan, StatusPencairan } from '@/api/tipe'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Muatan } from '@/components/ui/Keadaan'
import { KotakGalat, Modal, PesanKolom } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Paginasi } from '@/components/ui/Paginasi'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  LABEL_JENIS_PENCAIRAN,
  LABEL_METODE_BAYAR,
  RUPA_STATUS_PENCAIRAN,
  opsiDari,
} from '@/constants/label'
import { useHalaman } from '@/hooks/useHalaman'
import { useKirim } from '@/hooks/useKirim'
import { usePermintaan } from '@/hooks/usePermintaan'
import { hariIni, rupiah, tanggal } from '@/utils/format'

interface PencairanPageProps {
  pencarian: string
  onSukses: (pesan: string) => void
  onBukaPerjalanan: (id: number) => void
  penandaSegar: number
}

export function PencairanPage({ pencarian, onSukses, onBukaPerjalanan, penandaSegar }: PencairanPageProps) {
  const [status, setStatus] = useState<StatusPencairan | ''>('pending')
  const [jenis, setJenis] = useState<JenisPencairan | ''>('')
  const [halaman, setHalaman] = useHalaman(status, jenis, pencarian)
  const [dibayar, setDibayar] = useState<Pencairan | null>(null)

  const { data, memuat, galat, muatUlang } = usePermintaan(
    () => apiDaftarPencairan({ status, type: jenis, search: pencarian, page: halaman }),
    [status, jenis, pencarian, halaman, penandaSegar],
  )

  return (
    <>
      <PageHeader
        eyebrow="Keuangan"
        title="Pencairan"
        description="Uang muka, reimbursement, dan pengembalian kelebihan uang muka. Pembayaran terakhir sebuah perjalanan otomatis menyelesaikannya."
      />

      <section className="panel">
        <div className="bilah-alat">
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusPencairan | '')} aria-label="Status">
            <option value="">Semua status</option>
            {Object.entries(RUPA_STATUS_PENCAIRAN).map(([nilai, rupa]) => (
              <option key={nilai} value={nilai}>
                {rupa.label}
              </option>
            ))}
          </select>
          <select value={jenis} onChange={(e) => setJenis(e.target.value as JenisPencairan | '')} aria-label="Jenis">
            <option value="">Semua jenis</option>
            {opsiDari(LABEL_JENIS_PENCAIRAN).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {pencarian && <span className="status biru">Pencarian: “{pencarian}”</span>}
          <button type="button" className="btn kecil dorong" onClick={muatUlang}>
            <Icon name="segarkan" size={15} />
            Segarkan
          </button>
        </div>

        <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={6}>
          {(hasil) =>
            hasil.data.length === 0 ? (
              <Kosong ikon="wallet" judul="Tidak ada pencairan" pesan="Tidak ada pencairan yang cocok dengan penyaring." />
            ) : (
              <>
                <div className="pembungkus-tabel">
                  <table className="tabel">
                    <thead>
                      <tr>
                        <th>Perjalanan</th>
                        <th>Penerima</th>
                        <th>Jenis</th>
                        <th className="kanan">Jumlah</th>
                        <th>Status</th>
                        <th>Pembayaran</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {hasil.data.map((d) => (
                        <tr key={d.id}>
                          <td>
                            <button
                              type="button"
                              className="btn-tautan angka"
                              onClick={() => onBukaPerjalanan(d.travel_request_id)}
                            >
                              {d.travel_request?.request_number ?? `#${d.travel_request_id}`}
                            </button>
                            <div className="sel-sekunder">{d.travel_request?.destination}</div>
                          </td>
                          <td>
                            <div className="sel-utama">{d.travel_request?.requester?.name ?? '—'}</div>
                            <div className="sel-sekunder">
                              {d.bank_name ? `${d.bank_name} · ${d.bank_account_number ?? ''}` : 'Rekening belum diisi'}
                            </div>
                          </td>
                          <td>{LABEL_JENIS_PENCAIRAN[d.type]}</td>
                          <td className="kanan angka sel-utama">{rupiah(d.amount)}</td>
                          <td>
                            <StatusBadge {...RUPA_STATUS_PENCAIRAN[d.status]} />
                          </td>
                          <td>
                            {d.status === 'paid' ? (
                              <>
                                <div className="sel-utama">{d.method ? LABEL_METODE_BAYAR[d.method] : '—'}</div>
                                <div className="sel-sekunder">
                                  {tanggal(d.paid_at)}
                                  {d.reference_number ? ` · ${d.reference_number}` : ''}
                                </div>
                              </>
                            ) : (
                              <span className="sel-sekunder">—</span>
                            )}
                          </td>
                          <td className="kanan">
                            {d.status === 'pending' && (
                              <button type="button" className="btn kecil utama" onClick={() => setDibayar(d)}>
                                {d.type === 'refund' ? 'Catat diterima' : 'Bayar'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Paginasi meta={hasil.meta} satuan="pencairan" onPindah={setHalaman} />
              </>
            )
          }
        </Muatan>
      </section>

      {dibayar && (
        <ModalBayar
          pencairan={dibayar}
          onTutup={() => setDibayar(null)}
          onSelesai={(pesan) => {
            setDibayar(null)
            onSukses(pesan)
          }}
        />
      )}
    </>
  )
}

function ModalBayar({
  pencairan,
  onTutup,
  onSelesai,
}: {
  pencairan: Pencairan
  onTutup: () => void
  onSelesai: (pesan: string) => void
}) {
  const [metode, setMetode] = useState<MetodeBayar>('transfer')
  const [referensi, setReferensi] = useState('')
  const [tanggalBayar, setTanggalBayar] = useState(hariIni())
  const [catatan, setCatatan] = useState('')
  const { mengirim, galat, galatKolom, jalankan } = useKirim()
  const pengembalian = pencairan.type === 'refund'

  const kirim = async (peristiwa: FormEvent) => {
    peristiwa.preventDefault()
    const hasil = await jalankan(() =>
      apiBayarPencairan(pencairan.id, {
        method: metode,
        reference_number: referensi.trim() || undefined,
        paid_at: tanggalBayar,
        notes: catatan.trim() || undefined,
      }),
    )
    if (hasil) onSelesai(hasil.message)
  }

  return (
    <Modal
      judul={pengembalian ? 'Catat pengembalian diterima' : 'Catat pembayaran'}
      keterangan={`${LABEL_JENIS_PENCAIRAN[pencairan.type]} untuk ${pencairan.travel_request?.request_number ?? 'perjalanan'}`}
      ukuran="sempit"
      onTutup={onTutup}
      onKirim={kirim}
      kaki={
        <>
          <button type="button" className="btn" onClick={onTutup} disabled={mengirim}>
            Batal
          </button>
          <button type="submit" className="btn sukses" disabled={mengirim}>
            {mengirim ? 'Menyimpan...' : 'Tandai dibayar'}
          </button>
        </>
      }
    >
      <KotakGalat pesan={galat} />

      <div className="kotak-info">
        <strong>{rupiah(pencairan.amount)}</strong>
        {pencairan.travel_request?.requester?.name ?? '—'}
        {pencairan.bank_name &&
          ` · ${pencairan.bank_name} ${pencairan.bank_account_number ?? ''} a.n. ${pencairan.bank_account_name ?? '-'}`}
      </div>

      <div className="baris-bidang">
        <div className="bidang">
          <label htmlFor="metode">Metode</label>
          <select id="metode" value={metode} onChange={(e) => setMetode(e.target.value as MetodeBayar)}>
            {opsiDari(LABEL_METODE_BAYAR).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="bidang">
          <label htmlFor="tanggal-bayar">Tanggal</label>
          <input
            id="tanggal-bayar"
            type="date"
            max={hariIni()}
            value={tanggalBayar}
            onChange={(e) => setTanggalBayar(e.target.value)}
          />
          <PesanKolom pesan={galatKolom.paid_at} />
        </div>
      </div>

      <div className="bidang">
        <label htmlFor="referensi">Nomor referensi</label>
        <input
          id="referensi"
          placeholder="mis. nomor transaksi bank"
          maxLength={60}
          value={referensi}
          onChange={(e) => setReferensi(e.target.value)}
        />
      </div>

      <div className="bidang">
        <label htmlFor="catatan-bayar">Catatan</label>
        <textarea id="catatan-bayar" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
      </div>
    </Modal>
  )
}
