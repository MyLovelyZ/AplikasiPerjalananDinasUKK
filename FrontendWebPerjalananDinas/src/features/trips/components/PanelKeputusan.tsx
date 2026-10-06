import { useState } from 'react'

import {
  apiSetujuiAtasan,
  apiTolakAtasan,
  apiTolakKeuangan,
  apiVerifikasiKeuangan,
} from '@/api/endpoint'
import type { PemeriksaanAnggaran, Perjalanan } from '@/api/tipe'
import { Icon } from '@/components/ui/Icon'
import { KotakGalat, PesanKolom } from '@/components/ui/Modal'
import { LABEL_KATEGORI_BIAYA } from '@/constants/label'
import { useKirim } from '@/hooks/useKirim'
import { rupiah, tanggalPendek } from '@/utils/format'

interface PanelProps {
  perjalanan: Perjalanan
  onSelesai: (pesan: string) => void
}

const CATATAN_MIN = 5

function KepalaPanel({ judul, keterangan }: { judul: string; keterangan: string }) {
  return (
    <div className="panel-head">
      <div>
        <h2>{judul}</h2>
        <p>{keterangan}</p>
      </div>
      <span className="status kuning">Perlu keputusan</span>
    </div>
  )
}

function BidangCatatan({
  nilai,
  onUbah,
  petunjuk,
  galat,
}: {
  nilai: string
  onUbah: (nilai: string) => void
  petunjuk: string
  galat?: string
}) {
  return (
    <div className="bidang">
      <label htmlFor="catatan-keputusan">Catatan</label>
      <textarea id="catatan-keputusan" value={nilai} onChange={(e) => onUbah(e.target.value)} placeholder={petunjuk} />
      <span className="petunjuk">{petunjuk}</span>
      <PesanKolom pesan={galat} />
    </div>
  )
}

export function PanelKeputusanAtasan({ perjalanan, onSelesai }: PanelProps) {
  const [catatan, setCatatan] = useState('')
  const { mengirim, galat, galatKolom, jalankan } = useKirim()

  const putuskan = async (setuju: boolean) => {
    const isi = catatan.trim()
    const hasil = await jalankan(() =>
      setuju ? apiSetujuiAtasan(perjalanan.id, isi || undefined) : apiTolakAtasan(perjalanan.id, isi),
    )
    if (hasil) onSelesai(hasil.message)
  }

  return (
    <section className="panel" style={{ borderColor: 'var(--biru-terang)' }}>
      <KepalaPanel judul="Keputusan Atasan" keterangan="Setujui untuk meneruskan ke Keuangan, atau tolak dengan alasan." />
      <div className="panel-body" style={{ display: 'grid', gap: 12 }}>
        <KotakGalat pesan={galat} />
        <BidangCatatan
          nilai={catatan}
          onUbah={setCatatan}
          petunjuk="Opsional saat menyetujui; wajib (min. 5 karakter) saat menolak."
          galat={galatKolom.note}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn bahaya"
            disabled={mengirim || catatan.trim().length < CATATAN_MIN}
            onClick={() => putuskan(false)}
          >
            <Icon name="tolak" size={15} />
            Tolak
          </button>
          <button type="button" className="btn sukses" disabled={mengirim} onClick={() => putuskan(true)}>
            <Icon name="check" size={15} />
            {mengirim ? 'Memproses...' : 'Setujui'}
          </button>
        </div>
      </div>
    </section>
  )
}

export function PanelKeputusanKeuangan({
  perjalanan,
  pemeriksaan,
  onSelesai,
}: PanelProps & { pemeriksaan: PemeriksaanAnggaran | null }) {
  return perjalanan.finance_stage === 'finance' ? (
    <VerifikasiAnggaran perjalanan={perjalanan} pemeriksaan={pemeriksaan} onSelesai={onSelesai} />
  ) : (
    <VerifikasiLaporan perjalanan={perjalanan} onSelesai={onSelesai} />
  )
}

function VerifikasiAnggaran({
  perjalanan,
  pemeriksaan,
  onSelesai,
}: PanelProps & { pemeriksaan: PemeriksaanAnggaran | null }) {
  const [catatan, setCatatan] = useState('')
  const [uangMuka, setUangMuka] = useState(String(perjalanan.advance_requested))
  const { mengirim, galat, galatKolom, jalankan } = useKirim()

  const setujui = async () => {
    const hasil = await jalankan(() =>
      apiVerifikasiKeuangan(perjalanan.id, {
        advance_approved: Number(uangMuka) || 0,
        note: catatan.trim() || undefined,
      }),
    )
    if (hasil) onSelesai(hasil.message)
  }

  const tolak = async () => {
    const hasil = await jalankan(() => apiTolakKeuangan(perjalanan.id, catatan.trim()))
    if (hasil) onSelesai(hasil.message)
  }

  return (
    <section className="panel" style={{ borderColor: 'var(--biru-terang)' }}>
      <KepalaPanel
        judul="Verifikasi Anggaran"
        keterangan="Menyetujui berarti biaya perjalanan dikomitkan ke anggaran departemen."
      />
      <div className="panel-body" style={{ display: 'grid', gap: 12 }}>
        <KotakGalat pesan={galat ?? galatKolom.budget ?? null} />

        {pemeriksaan && (
          <div className={pemeriksaan.is_sufficient ? 'kotak-info' : 'peringatan-plafon'}>
            {!pemeriksaan.is_sufficient && <Icon name="peringatan" size={16} />}
            <span>
              <strong>
                {pemeriksaan.budget
                  ? `Anggaran ${pemeriksaan.budget.department?.name ?? ''} · ${pemeriksaan.budget.period_label}`
                  : 'Anggaran belum dialokasikan'}
              </strong>{' '}
              Sisa {rupiah(pemeriksaan.remaining_amount)}, dibutuhkan {rupiah(pemeriksaan.required_amount)}.{' '}
              {pemeriksaan.is_sufficient ? 'Anggaran mencukupi.' : 'Anggaran tidak mencukupi.'}
            </span>
          </div>
        )}

        <div className="baris-bidang">
          <div className="bidang">
            <label htmlFor="uang-muka-disetujui">Uang muka disetujui</label>
            <input
              id="uang-muka-disetujui"
              type="number"
              min={0}
              max={perjalanan.estimated_cost}
              step={50000}
              value={uangMuka}
              onChange={(e) => setUangMuka(e.target.value)}
            />
            <span className="petunjuk">
              Diminta {rupiah(perjalanan.advance_requested)} · maksimal {rupiah(perjalanan.estimated_cost)}
            </span>
            <PesanKolom pesan={galatKolom.advance_approved} />
          </div>
        </div>

        <BidangCatatan
          nilai={catatan}
          onUbah={setCatatan}
          petunjuk="Opsional saat menyetujui; wajib (min. 5 karakter) saat menolak."
          galat={galatKolom.note}
        />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn bahaya"
            disabled={mengirim || catatan.trim().length < CATATAN_MIN}
            onClick={tolak}
          >
            <Icon name="tolak" size={15} />
            Tolak
          </button>
          <button
            type="button"
            className="btn sukses"
            disabled={mengirim || pemeriksaan?.is_sufficient === false}
            onClick={setujui}
          >
            <Icon name="check" size={15} />
            {mengirim ? 'Memproses...' : 'Setujui & komit anggaran'}
          </button>
        </div>
      </div>
    </section>
  )
}

function VerifikasiLaporan({ perjalanan, onSelesai }: PanelProps) {
  const pengeluaran = perjalanan.expense_report?.expenses ?? []
  const [disetujui, setDisetujui] = useState<Record<number, string>>(() =>
    Object.fromEntries(pengeluaran.map((x) => [x.id, String(x.amount)])),
  )
  const [catatanBaris, setCatatanBaris] = useState<Record<number, string>>({})
  const [catatan, setCatatan] = useState('')
  const { mengirim, galat, galatKolom, jalankan } = useKirim()

  const uangMukaDibayar = (perjalanan.disbursements ?? [])
    .filter((d) => d.type === 'advance' && d.status === 'paid')
    .reduce((jumlah, d) => jumlah + d.amount, 0)
  const uangMukaBelumDibayar = (perjalanan.disbursements ?? []).some(
    (d) => d.type === 'advance' && d.status === 'pending',
  )

  const totalKlaim = pengeluaran.reduce((jumlah, x) => jumlah + x.amount, 0)
  const totalDisetujui = pengeluaran.reduce((jumlah, x) => jumlah + (Number(disetujui[x.id]) || 0), 0)
  const selisih = totalDisetujui - uangMukaDibayar

  const verifikasi = async () => {
    const hasil = await jalankan(() =>
      apiVerifikasiKeuangan(perjalanan.id, {
        note: catatan.trim() || undefined,
        expenses: pengeluaran.map((x) => ({
          id: x.id,
          approved_amount: Number(disetujui[x.id]) || 0,
          note: catatanBaris[x.id]?.trim() || undefined,
        })),
      }),
    )
    if (hasil) onSelesai(hasil.message)
  }

  const kembalikan = async () => {
    const hasil = await jalankan(() => apiTolakKeuangan(perjalanan.id, catatan.trim()))
    if (hasil) onSelesai(hasil.message)
  }

  return (
    <section className="panel" style={{ borderColor: 'var(--biru-terang)' }}>
      <KepalaPanel
        judul="Verifikasi Laporan Biaya"
        keterangan="Setujui tiap pengeluaran penuh, sebagian, atau nol. Selisih dengan uang muka diselesaikan otomatis."
      />

      {perjalanan.expense_report?.summary && (
        <div className="panel-body" style={{ paddingBottom: 0 }}>
          <div className="kotak-info">
            <strong>Ringkasan kegiatan dari pegawai</strong>
            <span style={{ whiteSpace: 'pre-line' }}>{perjalanan.expense_report.summary}</span>
          </div>
        </div>
      )}

      <div className="pembungkus-tabel">
        <table className="tabel" style={{ minWidth: 760 }}>
          <thead>
            <tr>
              <th>Pengeluaran</th>
              <th>Bukti</th>
              <th className="kanan">Diklaim</th>
              <th className="kanan">Disetujui</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            {pengeluaran.map((x, indeks) => (
              <tr key={x.id}>
                <td>
                  <div className="sel-utama">{x.description}</div>
                  <div className="sel-sekunder">
                    {LABEL_KATEGORI_BIAYA[x.category]} · {tanggalPendek(x.expense_date)}
                  </div>
                </td>
                <td>
                  {x.receipt ? (
                    <a className="btn-tautan" href={x.receipt.url} target="_blank" rel="noreferrer">
                      Lihat
                    </a>
                  ) : (
                    <span className="sel-sekunder">Tanpa bukti</span>
                  )}
                </td>
                <td className="kanan angka">{rupiah(x.amount)}</td>
                <td className="kanan">
                  <input
                    type="number"
                    min={0}
                    max={x.amount}
                    aria-label={`Jumlah disetujui untuk ${x.description}`}
                    value={disetujui[x.id] ?? ''}
                    onChange={(e) => setDisetujui((d) => ({ ...d, [x.id]: e.target.value }))}
                    style={{ width: 130, textAlign: 'right' }}
                  />
                  <PesanKolom pesan={galatKolom[`expenses.${indeks}.approved_amount`]} />
                </td>
                <td>
                  <input
                    aria-label={`Catatan untuk ${x.description}`}
                    placeholder="Opsional"
                    value={catatanBaris[x.id] ?? ''}
                    onChange={(e) => setCatatanBaris((c) => ({ ...c, [x.id]: e.target.value }))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ringkas-detail">
        <div>
          <span>Total diklaim</span>
          <strong>{rupiah(totalKlaim)}</strong>
        </div>
        <div>
          <span>Total disetujui</span>
          <strong>{rupiah(totalDisetujui)}</strong>
        </div>
        <div>
          <span>Uang muka dibayar</span>
          <strong>{rupiah(uangMukaDibayar)}</strong>
        </div>
        <div>
          <span>{selisih > 0 ? 'Perusahaan membayar' : selisih < 0 ? 'Pegawai mengembalikan' : 'Selisih'}</span>
          <strong>{rupiah(Math.abs(selisih))}</strong>
        </div>
      </div>

      <div className="panel-body" style={{ display: 'grid', gap: 12 }}>
        <KotakGalat pesan={galat} />

        {uangMukaBelumDibayar && (
          <div className="peringatan-plafon">
            <Icon name="peringatan" size={16} />
            <span>
              Uang muka perjalanan ini belum dibayar. Bayar dulu di menu Pencairan agar selisih dihitung
              dari uang yang benar-benar diterima pegawai.
            </span>
          </div>
        )}

        <BidangCatatan
          nilai={catatan}
          onUbah={setCatatan}
          petunjuk="Opsional saat memverifikasi; wajib (min. 5 karakter) saat mengembalikan ke pegawai."
          galat={galatKolom.note}
        />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn bahaya"
            disabled={mengirim || catatan.trim().length < CATATAN_MIN}
            onClick={kembalikan}
          >
            <Icon name="revisi" size={15} />
            Kembalikan untuk revisi
          </button>
          <button
            type="button"
            className="btn sukses"
            disabled={mengirim || uangMukaBelumDibayar}
            onClick={verifikasi}
          >
            <Icon name="check" size={15} />
            {mengirim ? 'Memproses...' : 'Verifikasi laporan'}
          </button>
        </div>
      </div>
    </section>
  )
}
