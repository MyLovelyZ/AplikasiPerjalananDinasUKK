import { useState } from 'react'
import type { FormEvent } from 'react'

import { apiBuatPerjalanan, apiOpsiPerjalanan, apiUbahPerjalanan } from '@/api/endpoint'
import type { BarisBiaya, FormulirPerjalanan } from '@/api/endpoint'
import type { JenisDokumen, Perjalanan } from '@/api/tipe'
import { Icon } from '@/components/ui/Icon'
import { Memuat } from '@/components/ui/Keadaan'
import { KotakGalat, Modal, PesanKolom } from '@/components/ui/Modal'
import {
  LABEL_JENIS_DOKUMEN,
  LABEL_JENIS_PERJALANAN,
  LABEL_KATEGORI_BIAYA,
  LABEL_TRANSPORTASI,
  opsiDari,
} from '@/constants/label'
import { useKirim } from '@/hooks/useKirim'
import { usePermintaan } from '@/hooks/usePermintaan'
import { hariIni, rupiah, ukuranBerkas } from '@/utils/format'

interface FormulirPerjalananModalProps {
  /** Diisi saat mengubah pengajuan yang sudah ada. */
  perjalanan?: Perjalanan
  onTutup: () => void
  onTersimpan: (perjalanan: Perjalanan, pesan: string) => void
}

interface BarisLokal extends BarisBiaya {
  kunci: number
}

interface DokumenBaru {
  kunci: number
  type: JenisDokumen
  file: File
}

let kunciBerikut = 1
const kunciBaru = () => kunciBerikut++

const barisKosong = (): BarisLokal => ({
  kunci: kunciBaru(),
  category: '',
  description: '',
  quantity: 1,
  unit_price: 0,
})

export function FormulirPerjalananModal({ perjalanan, onTutup, onTersimpan }: FormulirPerjalananModalProps) {
  const opsi = usePermintaan(() => apiOpsiPerjalanan(), [])
  const { mengirim, galat, galatKolom, jalankan, setGalat } = useKirim()
  const modeUbah = perjalanan !== undefined

  const [purpose, setPurpose] = useState(perjalanan?.purpose ?? '')
  const [destination, setDestination] = useState(perjalanan?.destination ?? '')
  const [tripType, setTripType] = useState<string>(perjalanan?.trip_type ?? 'domestic')
  const [transportation, setTransportation] = useState<string>(perjalanan?.transportation ?? 'plane')
  const [berangkat, setBerangkat] = useState(perjalanan?.departure_date ?? hariIni())
  const [kembali, setKembali] = useState(perjalanan?.return_date ?? hariIni())
  const [uangMuka, setUangMuka] = useState(String(perjalanan?.advance_requested ?? 0))
  const [description, setDescription] = useState(perjalanan?.description ?? '')
  const [notes, setNotes] = useState(perjalanan?.notes ?? '')
  const [biaya, setBiaya] = useState<BarisLokal[]>(() =>
    perjalanan?.cost_estimates?.length
      ? perjalanan.cost_estimates.map((c) => ({
          kunci: kunciBaru(),
          category: c.category,
          description: c.description ?? '',
          quantity: c.quantity,
          unit_price: c.unit_price,
        }))
      : [barisKosong()],
  )
  const [dokumenBaru, setDokumenBaru] = useState<DokumenBaru[]>([])
  const [dokumenDihapus, setDokumenDihapus] = useState<number[]>([])
  const [jenisDokumen, setJenisDokumen] = useState<JenisDokumen>('assignment_letter')

  const total = biaya.reduce((jumlah, b) => jumlah + Number(b.quantity || 0) * Number(b.unit_price || 0), 0)

  const ubahBaris = (kunci: number, perubahan: Partial<BarisLokal>) =>
    setBiaya((daftar) => daftar.map((b) => (b.kunci === kunci ? { ...b, ...perubahan } : b)))

  const pilihBerkas = (berkas: FileList | null) => {
    if (!berkas) return
    const batasKb = opsi.data?.max_document_size_kb ?? 5120
    const terlaluBesar = Array.from(berkas).find((f) => f.size > batasKb * 1024)
    if (terlaluBesar) {
      setGalat(`Berkas "${terlaluBesar.name}" melebihi batas ${batasKb / 1024} MB.`)
      return
    }
    setDokumenBaru((daftar) => [
      ...daftar,
      ...Array.from(berkas).map((file) => ({ kunci: kunciBaru(), type: jenisDokumen, file })),
    ])
  }

  const simpan = async (ajukan: boolean) => {
    const barisTerisi = biaya.filter((b) => b.category && Number(b.quantity) > 0)
    if (barisTerisi.length === 0) {
      setGalat('Isi minimal satu rincian estimasi biaya beserta kategorinya.')
      return
    }

    const isi: FormulirPerjalanan = {
      purpose: purpose.trim(),
      destination: destination.trim(),
      trip_type: tripType,
      transportation,
      departure_date: berangkat,
      return_date: kembali,
      advance_requested: Number(uangMuka) || 0,
      description: description.trim(),
      notes: notes.trim(),
      costs: barisTerisi.map(({ category, description: ket, quantity, unit_price }) => ({
        category,
        description: ket.trim(),
        quantity: Number(quantity),
        unit_price: Number(unit_price),
      })),
      documents: dokumenBaru.map(({ type, file }) => ({ type, file })),
      submit: ajukan,
    }

    const hasil = await jalankan(() =>
      modeUbah
        ? apiUbahPerjalanan(perjalanan.id, { ...isi, remove_document_ids: dokumenDihapus })
        : apiBuatPerjalanan(isi),
    )
    if (hasil) onTersimpan(hasil.data, hasil.message)
  }

  const kirim = (peristiwa: FormEvent) => {
    peristiwa.preventDefault()
    void simpan(false)
  }

  const masihDraf = !modeUbah || perjalanan.status === 'draft'
  const dokumenLama = (perjalanan?.documents ?? []).filter((d) => !dokumenDihapus.includes(d.id))

  return (
    <Modal
      judul={modeUbah ? `Ubah ${perjalanan.request_number}` : 'Ajukan Perjalanan Dinas'}
      keterangan={
        opsi.data?.approver
          ? `Pengajuan akan dikirim ke atasan Anda: ${opsi.data.approver.name}.`
          : 'Lengkapi formulir berikut, lalu simpan sebagai draf atau langsung ajukan.'
      }
      ukuran="lebar"
      onTutup={onTutup}
      onKirim={kirim}
      kaki={
        <>
          <span className="kiri">Total estimasi {rupiah(total)}</span>
          <button type="button" className="btn" onClick={onTutup}>
            Batal
          </button>
          <button type="submit" className={masihDraf ? 'btn' : 'btn utama'} disabled={mengirim || opsi.memuat}>
            {mengirim ? 'Menyimpan...' : masihDraf ? 'Simpan draf' : 'Simpan perubahan'}
          </button>
          {masihDraf && (
            <button type="button" className="btn utama" disabled={mengirim || opsi.memuat} onClick={() => simpan(true)}>
              <Icon name="kirim" size={15} />
              Simpan & ajukan
            </button>
          )}
        </>
      }
    >
      <KotakGalat pesan={galat} />
      <PesanKolom pesan={galatKolom.submit} />

      {opsi.memuat && !opsi.data ? (
        <Memuat baris={6} />
      ) : (
        <>
          <div className="bidang">
            <label htmlFor="purpose">
              Keperluan perjalanan<span className="wajib">*</span>
            </label>
            <input
              id="purpose"
              placeholder="mis. Audit sistem di kantor cabang Surabaya"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              maxLength={200}
              required
            />
            <PesanKolom pesan={galatKolom.purpose} />
          </div>

          <div className="baris-bidang">
            <div className="bidang">
              <label htmlFor="destination">
                Kota / lokasi tujuan<span className="wajib">*</span>
              </label>
              <input
                id="destination"
                placeholder="mis. Surabaya"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                maxLength={150}
                required
              />
              <PesanKolom pesan={galatKolom.destination} />
            </div>

            <div className="bidang">
              <label htmlFor="trip-type">Jenis perjalanan</label>
              <select id="trip-type" value={tripType} onChange={(e) => setTripType(e.target.value)}>
                {opsiDari(LABEL_JENIS_PERJALANAN).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="bidang">
              <label htmlFor="transportation">Transportasi</label>
              <select id="transportation" value={transportation} onChange={(e) => setTransportation(e.target.value)}>
                {opsiDari(LABEL_TRANSPORTASI).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="baris-bidang">
            <div className="bidang">
              <label htmlFor="berangkat">
                Tanggal berangkat<span className="wajib">*</span>
              </label>
              <input
                id="berangkat"
                type="date"
                min={hariIni()}
                value={berangkat}
                onChange={(e) => {
                  setBerangkat(e.target.value)
                  if (kembali < e.target.value) setKembali(e.target.value)
                }}
                required
              />
              <PesanKolom pesan={galatKolom.departure_date} />
            </div>

            <div className="bidang">
              <label htmlFor="kembali">
                Tanggal kembali<span className="wajib">*</span>
              </label>
              <input
                id="kembali"
                type="date"
                min={berangkat}
                value={kembali}
                onChange={(e) => setKembali(e.target.value)}
                required
              />
              <PesanKolom pesan={galatKolom.return_date} />
            </div>

            <div className="bidang">
              <label htmlFor="uang-muka">Uang muka diminta</label>
              <input
                id="uang-muka"
                type="number"
                min={0}
                step={50000}
                value={uangMuka}
                onChange={(e) => setUangMuka(e.target.value)}
              />
              <span className="petunjuk">Maksimal sebesar total estimasi biaya.</span>
              <PesanKolom pesan={galatKolom.advance_requested} />
            </div>
          </div>

          <div className="bidang">
            <label htmlFor="description">Uraian kegiatan</label>
            <textarea
              id="description"
              placeholder="Uraikan agenda selama perjalanan"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600 }}>
                Rincian estimasi biaya<span className="wajib">*</span>
              </label>
              <button type="button" className="btn kecil lembut" onClick={() => setBiaya((d) => [...d, barisKosong()])}>
                <Icon name="plus" size={15} />
                Tambah baris
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {biaya.map((baris, indeks) => (
                <div className="baris-rincian" key={baris.kunci}>
                  <div className="bidang">
                    <label>Kategori</label>
                    <select
                      value={baris.category}
                      onChange={(e) => ubahBaris(baris.kunci, { category: e.target.value as BarisBiaya['category'] })}
                    >
                      <option value="">— Pilih —</option>
                      {opsiDari(LABEL_KATEGORI_BIAYA).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <PesanKolom pesan={galatKolom[`costs.${indeks}.category`]} />
                  </div>

                  <div className="bidang">
                    <label>Keterangan</label>
                    <input
                      placeholder="mis. Tiket pesawat PP"
                      value={baris.description}
                      maxLength={150}
                      onChange={(e) => ubahBaris(baris.kunci, { description: e.target.value })}
                    />
                  </div>

                  <div className="bidang">
                    <label>Jumlah</label>
                    <input
                      type="number"
                      min={0.01}
                      step="any"
                      value={baris.quantity}
                      onChange={(e) => ubahBaris(baris.kunci, { quantity: Number(e.target.value) })}
                    />
                  </div>

                  <div className="bidang">
                    <label>Harga satuan</label>
                    <input
                      type="number"
                      min={0}
                      step={10000}
                      value={baris.unit_price}
                      onChange={(e) => ubahBaris(baris.kunci, { unit_price: Number(e.target.value) })}
                    />
                    <span className="subtotal">{rupiah(baris.quantity * baris.unit_price)}</span>
                  </div>

                  <button
                    type="button"
                    className="tombol-hapus-baris"
                    onClick={() => setBiaya((d) => d.filter((b) => b.kunci !== baris.kunci))}
                    aria-label="Hapus baris biaya"
                    disabled={biaya.length === 1}
                  >
                    <Icon name="sampah" size={16} />
                  </button>
                </div>
              ))}
            </div>

            <PesanKolom pesan={galatKolom.costs} />
            <div className="total-formulir" style={{ marginTop: 12 }}>
              <span>Total estimasi biaya</span>
              <strong>{rupiah(total)}</strong>
            </div>
          </div>

          <div className="bidang">
            <label>Dokumen pendukung</label>
            {(dokumenLama.length > 0 || dokumenBaru.length > 0) && (
              <div className="daftar" style={{ border: '1px solid var(--garis)', borderRadius: 9, marginBottom: 8 }}>
                {dokumenLama.map((d) => (
                  <div className="daftar-baris" key={`lama-${d.id}`}>
                    <span className="isi">
                      <b>{d.original_name}</b>
                      <small>
                        {LABEL_JENIS_DOKUMEN[d.type]} · {ukuranBerkas(d.size)}
                      </small>
                    </span>
                    <button
                      type="button"
                      className="tombol-hapus-baris"
                      aria-label={`Hapus ${d.original_name}`}
                      onClick={() => setDokumenDihapus((daftar) => [...daftar, d.id])}
                    >
                      <Icon name="sampah" size={16} />
                    </button>
                  </div>
                ))}
                {dokumenBaru.map((d) => (
                  <div className="daftar-baris" key={d.kunci}>
                    <span className="isi">
                      <b>{d.file.name}</b>
                      <small>
                        {LABEL_JENIS_DOKUMEN[d.type]} · {ukuranBerkas(d.file.size)} · baru
                      </small>
                    </span>
                    <button
                      type="button"
                      className="tombol-hapus-baris"
                      aria-label={`Batal unggah ${d.file.name}`}
                      onClick={() => setDokumenBaru((daftar) => daftar.filter((x) => x.kunci !== d.kunci))}
                    >
                      <Icon name="sampah" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select
                aria-label="Jenis dokumen"
                value={jenisDokumen}
                onChange={(e) => setJenisDokumen(e.target.value as JenisDokumen)}
                style={{ maxWidth: 220 }}
              >
                {opsiDari(LABEL_JENIS_DOKUMEN).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <label className="btn kecil lembut" style={{ cursor: 'pointer' }}>
                <Icon name="unggah" size={15} />
                Pilih berkas
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  hidden
                  onChange={(e) => {
                    pilihBerkas(e.target.files)
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
            <span className="petunjuk">PDF, gambar, atau Word; maksimal 5 MB per berkas.</span>
            {Object.entries(galatKolom)
              .filter(([kolom]) => kolom.startsWith('documents'))
              .map(([kolom, pesan]) => (
                <PesanKolom key={kolom} pesan={pesan} />
              ))}
          </div>

          <div className="bidang">
            <label htmlFor="notes">Catatan untuk atasan</label>
            <textarea
              id="notes"
              placeholder="Opsional — hal yang perlu diketahui atasan"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </>
      )}
    </Modal>
  )
}
