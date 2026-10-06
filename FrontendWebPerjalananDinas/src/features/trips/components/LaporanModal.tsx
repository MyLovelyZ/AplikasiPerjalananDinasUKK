import { useState } from 'react'
import type { FormEvent } from 'react'

import { apiHapusPengeluaran, apiRuangLaporan, apiSimpanLaporan } from '@/api/endpoint'
import type { KategoriBiaya, RuangLaporan } from '@/api/tipe'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Muatan } from '@/components/ui/Keadaan'
import { KotakGalat, Modal, PesanKolom } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  LABEL_KATEGORI_BIAYA,
  LABEL_PENYELESAIAN,
  RUPA_STATUS_LAPORAN,
  RUPA_STATUS_PENGELUARAN,
} from '@/constants/label'
import { useKirim } from '@/hooks/useKirim'
import { usePermintaan } from '@/hooks/usePermintaan'
import { hariIni, rupiah, tanggalPendek } from '@/utils/format'

interface LaporanModalProps {
  perjalananId: number
  onTutup: () => void
  onBerubah: (pesan: string) => void
}

export function LaporanModal({ perjalananId, onTutup, onBerubah }: LaporanModalProps) {
  const { data, memuat, galat, muatUlang } = usePermintaan(() => apiRuangLaporan(perjalananId), [perjalananId])
  const aksi = useKirim()

  const selesai = (pesan: string) => {
    onBerubah(pesan)
    muatUlang()
  }

  const ajukan = async (ringkasan: string) => {
    const hasil = await aksi.jalankan(() =>
      apiSimpanLaporan(perjalananId, { summary: ringkasan.trim() || undefined, submit: true }),
    )
    if (hasil) selesai(hasil.message)
  }

  const p = data?.travel_request
  const laporan = p?.expense_report

  return (
    <Modal
      judul={p ? `Laporan Biaya · ${p.request_number}` : 'Laporan biaya'}
      keterangan={p ? `${p.destination} · ${p.purpose}` : 'Memuat data...'}
      ukuran="lebar"
      onTutup={onTutup}
      sisipan={
        data && (
          <div className="ringkas-detail">
            <div>
              <span>Uang muka diterima</span>
              <strong>{rupiah(data.advance_paid)}</strong>
            </div>
            <div>
              <span>Total diklaim</span>
              <strong>{rupiah(laporan?.total_claimed ?? 0)}</strong>
            </div>
            <div>
              <span>Total disetujui</span>
              <strong>{laporan?.total_approved === null || !laporan ? '—' : rupiah(laporan.total_approved)}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{laporan ? RUPA_STATUS_LAPORAN[laporan.status].label : 'Belum dibuat'}</strong>
            </div>
          </div>
        )
      }
      kaki={
        <button type="button" className="btn" onClick={onTutup}>
          Tutup
        </button>
      }
    >
      <KotakGalat pesan={aksi.galat} />

      <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={6}>
        {(ruang) => (
          <IsiLaporan
            ruang={ruang}
            perjalananId={perjalananId}
            mengirim={aksi.mengirim}
            onAjukan={ajukan}
            onSelesai={selesai}
          />
        )}
      </Muatan>
    </Modal>
  )
}

function IsiLaporan({
  ruang,
  perjalananId,
  mengirim,
  onAjukan,
  onSelesai,
}: {
  ruang: RuangLaporan
  perjalananId: number
  mengirim: boolean
  onAjukan: (ringkasan: string) => void
  onSelesai: (pesan: string) => void
}) {
  const laporan = ruang.travel_request.expense_report
  const pengeluaran = laporan?.expenses ?? []
  const [ringkasan, setRingkasan] = useState(laporan?.summary ?? '')
  const hapus = useKirim()
  const sudahBerangkat = ruang.travel_request.departure_date <= hariIni()

  const hapusPengeluaran = async (id: number) => {
    const hasil = await hapus.jalankan(() => apiHapusPengeluaran(perjalananId, id))
    if (hasil) onSelesai(hasil.message)
  }

  return (
    <>
      {laporan?.status === 'returned' && laporan.verification_note && (
        <div className="peringatan-plafon">
          <Icon name="revisi" size={16} />
          <span>
            <b>Dikembalikan oleh Keuangan:</b> {laporan.verification_note}
          </span>
        </div>
      )}

      {laporan?.status === 'verified' && laporan.settlement_type && (
        <div className="kotak-info">
          <strong>Laporan terverifikasi</strong>
          {LABEL_PENYELESAIAN[laporan.settlement_type]}
          {laporan.difference ? ` sebesar ${rupiah(Math.abs(laporan.difference))}.` : '.'}
          {laporan.verification_note ? ` Catatan: ${laporan.verification_note}` : ''}
        </div>
      )}

      {!ruang.can_manage && !laporan && (
        <div className="kotak-info">
          <strong>Laporan belum dapat diisi</strong>
          Laporan biaya hanya dapat disusun untuk perjalanan yang sudah disetujui Keuangan.
        </div>
      )}

      <KotakGalat pesan={hapus.galat} />

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Pengeluaran</h2>
            <p>{pengeluaran.length} pengeluaran tercatat</p>
          </div>
          {laporan && <StatusBadge {...RUPA_STATUS_LAPORAN[laporan.status]} />}
        </div>

        {pengeluaran.length === 0 ? (
          <Kosong
            ikon="file"
            judul="Belum ada pengeluaran"
            pesan={ruang.can_manage ? 'Tambahkan pengeluaran beserta bukti nota di bawah.' : 'Tidak ada pengeluaran yang dilaporkan.'}
          />
        ) : (
          <div className="pembungkus-tabel">
            <table className="tabel" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>Pengeluaran</th>
                  <th>Bukti</th>
                  <th className="kanan">Diklaim</th>
                  <th className="kanan">Disetujui</th>
                  <th>Status</th>
                  {ruang.can_manage && <th />}
                </tr>
              </thead>
              <tbody>
                {pengeluaran.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <div className="sel-utama">{x.description}</div>
                      <div className="sel-sekunder">
                        {LABEL_KATEGORI_BIAYA[x.category]} · {tanggalPendek(x.expense_date)}
                      </div>
                      {x.verification_note && <div className="sel-sekunder">Catatan: {x.verification_note}</div>}
                    </td>
                    <td>
                      {x.receipt ? (
                        <a className="btn-tautan" href={x.receipt.url} target="_blank" rel="noreferrer">
                          Lihat
                        </a>
                      ) : (
                        <span className="sel-sekunder">—</span>
                      )}
                    </td>
                    <td className="kanan angka">{rupiah(x.amount)}</td>
                    <td className="kanan angka">{x.approved_amount === null ? '—' : rupiah(x.approved_amount)}</td>
                    <td>
                      <StatusBadge {...RUPA_STATUS_PENGELUARAN[x.status]} />
                    </td>
                    {ruang.can_manage && (
                      <td className="kanan">
                        <button
                          type="button"
                          className="tombol-hapus-baris"
                          aria-label={`Hapus ${x.description}`}
                          disabled={hapus.mengirim}
                          onClick={() => hapusPengeluaran(x.id)}
                        >
                          <Icon name="sampah" size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {ruang.can_manage && (
        <>
          <FormPengeluaran perjalananId={perjalananId} kategori={ruang.expense_categories} onSelesai={onSelesai} />

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Ajukan ke Keuangan</h2>
                <p>Setelah diajukan, laporan tidak dapat diubah kecuali dikembalikan Keuangan.</p>
              </div>
            </div>
            <div className="panel-body" style={{ display: 'grid', gap: 12 }}>
              {!sudahBerangkat && (
                <div className="kotak-info">
                  <strong>Belum dapat diajukan</strong>
                  Pengeluaran boleh dicatat sekarang, tetapi laporan baru dapat diajukan setelah tanggal
                  keberangkatan ({tanggalPendek(ruang.travel_request.departure_date)}).
                </div>
              )}
              <div className="bidang">
                <label htmlFor="ringkasan">
                  Ringkasan kegiatan<span className="wajib">*</span>
                </label>
                <textarea
                  id="ringkasan"
                  placeholder="Hasil dan capaian selama perjalanan dinas"
                  value={ringkasan}
                  maxLength={5000}
                  onChange={(e) => setRingkasan(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn utama"
                  disabled={mengirim || pengeluaran.length === 0 || !ringkasan.trim() || !sudahBerangkat}
                  onClick={() => onAjukan(ringkasan)}
                >
                  <Icon name="kirim" size={15} />
                  {mengirim ? 'Mengirim...' : 'Ajukan laporan'}
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  )
}

function FormPengeluaran({
  perjalananId,
  kategori: daftarKategori,
  onSelesai,
}: {
  perjalananId: number
  kategori: RuangLaporan['expense_categories']
  onSelesai: (pesan: string) => void
}) {
  const [kategori, setKategori] = useState<KategoriBiaya>('transportation')
  const wajibNota = daftarKategori.find((k) => k.value === kategori)?.requires_receipt ?? true
  const [tanggal, setTanggal] = useState(hariIni())
  const [keterangan, setKeterangan] = useState('')
  const [jumlah, setJumlah] = useState('')
  const [nota, setNota] = useState<File | null>(null)
  const [kunciInput, setKunciInput] = useState(0)
  const { mengirim, galat, galatKolom, jalankan } = useKirim()

  const tambah = async (peristiwa: FormEvent) => {
    peristiwa.preventDefault()
    const hasil = await jalankan(() =>
      apiSimpanLaporan(perjalananId, {
        expenses: [
          {
            category: kategori,
            expense_date: tanggal,
            description: keterangan.trim(),
            amount: Number(jumlah),
            receipt: nota ?? undefined,
          },
        ],
      }),
    )
    if (!hasil) return

    setKeterangan('')
    setJumlah('')
    setNota(null)
    setKunciInput((k) => k + 1)
    onSelesai(hasil.message)
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Tambah Pengeluaran</h2>
          <p>Lampirkan foto atau PDF nota; maksimal 5 MB.</p>
        </div>
      </div>
      <form className="panel-body" style={{ display: 'grid', gap: 12 }} onSubmit={tambah}>
        <KotakGalat pesan={galat} />
        <div className="baris-bidang">
          <div className="bidang">
            <label htmlFor="kategori-pengeluaran">Kategori</label>
            <select
              id="kategori-pengeluaran"
              value={kategori}
              onChange={(e) => setKategori(e.target.value as KategoriBiaya)}
            >
              {daftarKategori.map((o) => (
                <option key={o.value} value={o.value}>
                  {LABEL_KATEGORI_BIAYA[o.value]}
                </option>
              ))}
            </select>
          </div>
          <div className="bidang">
            <label htmlFor="tanggal-pengeluaran">Tanggal transaksi</label>
            <input
              id="tanggal-pengeluaran"
              type="date"
              max={hariIni()}
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
            />
            <PesanKolom pesan={galatKolom['expenses.0.expense_date']} />
          </div>
          <div className="bidang">
            <label htmlFor="jumlah-pengeluaran">Jumlah (Rp)</label>
            <input
              id="jumlah-pengeluaran"
              type="number"
              min={1}
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value)}
              required
            />
            <PesanKolom pesan={galatKolom['expenses.0.amount']} />
          </div>
        </div>
        <div className="baris-bidang">
          <div className="bidang">
            <label htmlFor="keterangan-pengeluaran">Keterangan</label>
            <input
              id="keterangan-pengeluaran"
              placeholder="mis. Hotel 2 malam"
              maxLength={200}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              required
            />
            <PesanKolom pesan={galatKolom['expenses.0.description']} />
          </div>
          <div className="bidang">
            <label htmlFor="nota">
              Bukti nota{wajibNota && <span className="wajib">*</span>}
            </label>
            <input
              key={kunciInput}
              id="nota"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={(e) => setNota(e.target.files?.[0] ?? null)}
            />
            <span className="petunjuk">
              {wajibNota ? 'Wajib untuk kategori ini.' : 'Uang harian tidak memerlukan nota.'}
            </span>
            <PesanKolom pesan={galatKolom['expenses.0.receipt']} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            className="btn lembut"
            disabled={mengirim || !keterangan.trim() || !jumlah || (wajibNota && !nota)}
          >
            <Icon name="plus" size={15} />
            {mengirim ? 'Menyimpan...' : 'Tambah pengeluaran'}
          </button>
        </div>
      </form>
    </section>
  )
}
