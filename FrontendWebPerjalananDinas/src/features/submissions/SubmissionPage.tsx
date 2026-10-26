import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'

import { apiBuatPerjalanan, apiOpsiPerjalanan } from '@/api/endpoint'
import type { BarisBiaya } from '@/api/endpoint'
import type { JenisDokumen, KategoriBiaya, OpsiFormPerjalanan } from '@/api/tipe'
import { Icon } from '@/components/ui/Icon'
import { Muatan } from '@/components/ui/Keadaan'
import { KotakGalat, PesanKolom } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { LABEL_JENIS_DOKUMEN, LABEL_JENIS_PERJALANAN, LABEL_KATEGORI_BIAYA, LABEL_TRANSPORTASI, opsiBerlabel } from '@/constants/label'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { useKirim } from '@/hooks/useKirim'
import { usePermintaan } from '@/hooks/usePermintaan'
import { useAplikasi } from '@/layouts/konteksAplikasi'
import type { IconName } from '@/types/icon'
import { hariIni, rentangTanggal, rupiah, ukuranBerkas } from '@/utils/format'

const LANGKAH = ['Detail perjalanan', 'Estimasi biaya', 'Dokumen & kirim'] as const

const IKON_KATEGORI: Partial<Record<KategoriBiaya, IconName>> = {
  transportation: 'plane',
  accommodation: 'bed',
  daily_allowance: 'wallet',
  meals: 'utensils',
}

interface BarisLokal {
  description: string
  quantity: number
  unit_price: number
}

interface BerkasBaru {
  id: number
  type: JenisDokumen
  file: File
}

let kunciBerikut = 1

/** /employee/requests/new — wizard pengajuan perjalanan dinas. Opsi isian diambil dari GET /employee/requests/create. */
export function SubmissionPage() {
  const opsi = usePermintaan(() => apiOpsiPerjalanan(), [])

  return (
    <>
      <PageHeader
        eyebrow="Pengajuan"
        title="Ajukan Perjalanan Dinas"
        description="Lengkapi tiga langkah berikut. Pengajuan bisa disimpan sebagai draf atau langsung dikirim ke supervisor."
      />
      <Muatan data={opsi.data} memuat={opsi.memuat} galat={opsi.galat} onCobaLagi={opsi.muatUlang} barisRangka={8}>
        {(isi) => <Wizard opsi={isi} />}
      </Muatan>
    </>
  )
}

function Wizard({ opsi }: { opsi: OpsiFormPerjalanan }) {
  const { sukses } = useAplikasi()
  const navigate = useNavigate()
  const { mengirim, galat, galatKolom, jalankan, setGalat } = useKirim()
  const inputBerkas = useRef<HTMLInputElement>(null)

  const [langkah, setLangkah] = useState(0)

  // Langkah 1: detail perjalanan
  const [purpose, setPurpose] = useState('')
  const [destination, setDestination] = useState('')
  const [tripType, setTripType] = useState<string>(opsi.trip_types[0]?.value ?? 'domestic')
  const [transportation, setTransportation] = useState<string>(opsi.transportations[0]?.value ?? 'plane')
  const [berangkat, setBerangkat] = useState(hariIni())
  const [kembali, setKembali] = useState(hariIni())
  const [description, setDescription] = useState('')

  // Langkah 2: satu baris estimasi per kategori biaya dari backend
  const [biaya, setBiaya] = useState<Record<string, BarisLokal>>(() =>
    Object.fromEntries(opsi.expense_categories.map((k) => [k.value, { description: '', quantity: 1, unit_price: 0 }])),
  )
  const [uangMuka, setUangMuka] = useState('')

  // Langkah 3: dokumen dan catatan
  const [jenisDokumen, setJenisDokumen] = useState<JenisDokumen>(opsi.document_types[0]?.value ?? 'other')
  const [berkas, setBerkas] = useState<BerkasBaru[]>([])
  const [notes, setNotes] = useState('')
  const [pernyataan, setPernyataan] = useState(false)

  const subtotal = (b: BarisLokal) => Number(b.quantity || 0) * Number(b.unit_price || 0)
  const total = Object.values(biaya).reduce((jumlah, b) => jumlah + subtotal(b), 0)
  const durasi =
    kembali >= berangkat ? Math.round((Date.parse(kembali) - Date.parse(berangkat)) / 86_400_000) + 1 : 0
  const batasKb = opsi.max_document_size_kb

  const ubahBiaya = (kategori: string, perubahan: Partial<BarisLokal>) =>
    setBiaya((semua) => ({ ...semua, [kategori]: { ...semua[kategori], ...perubahan } }))

  const tambahBerkas = (daftar: FileList | null) => {
    if (!daftar || daftar.length === 0) return
    const baru = Array.from(daftar)
    const terlaluBesar = baru.find((f) => f.size > batasKb * 1024)
    if (terlaluBesar) {
      setGalat(`Berkas "${terlaluBesar.name}" melebihi batas ${batasKb / 1024} MB.`)
      return
    }
    setBerkas((lama) => [...lama, ...baru.map((file) => ({ id: kunciBerikut++, type: jenisDokumen, file }))])
  }

  const lanjutDariDetail = (e: FormEvent) => {
    e.preventDefault()
    setLangkah(1)
  }

  const lanjutDariBiaya = () => {
    if (total <= 0) {
      setGalat('Isi minimal satu estimasi biaya.')
      return
    }
    setGalat(null)
    setLangkah(2)
  }

  const simpan = async (ajukan: boolean) => {
    if (ajukan && !pernyataan) {
      setGalat('Centang pernyataan terlebih dahulu sebelum mengajukan.')
      return
    }

    const costs: BarisBiaya[] = opsi.expense_categories
      .map((k) => ({ category: k.value, ...biaya[k.value] }))
      .filter((b) => subtotal(b) > 0)
      .map((b) => ({ ...b, description: b.description.trim() }))

    const hasil = await jalankan(() =>
      apiBuatPerjalanan({
        purpose: purpose.trim(),
        description: description.trim(),
        destination: destination.trim(),
        trip_type: tripType,
        transportation,
        departure_date: berangkat,
        return_date: kembali,
        advance_requested: Number(uangMuka) || 0,
        notes: notes.trim(),
        costs,
        documents: berkas.map(({ type, file }) => ({ type, file })),
        submit: ajukan,
      }),
    )

    if (hasil) {
      sukses(hasil.message)
      navigate(`/employee/requests/${hasil.data.id}`, { replace: true })
    }
  }

  return (
    <>
      <ol className="langkah-wizard">
        {LANGKAH.map((judul, indeks) => (
          <li key={judul} className={indeks === langkah ? 'aktif' : indeks < langkah ? 'selesai' : ''}>
            <button type="button" onClick={() => indeks < langkah && setLangkah(indeks)} disabled={indeks > langkah}>
              <span>{indeks < langkah ? <Icon name="check" size={14} /> : indeks + 1}</span>
              <em>{judul}</em>
            </button>
          </li>
        ))}
      </ol>

      <div className="grid-dua wizard">
        <div className="tumpuk">
          <KotakGalat pesan={galat} />

          {langkah === 0 && (
            <form className="panel" onSubmit={lanjutDariDetail}>
              <PanelHeader title="Detail perjalanan" subtitle="Ke mana, kapan, dan untuk keperluan apa." />
              <div className="panel-body formulir">
                <div className="bidang">
                  <label htmlFor="purpose">
                    Keperluan<span className="wajib">*</span>
                  </label>
                  <input
                    id="purpose"
                    placeholder="mis. Audit sistem di kantor cabang Surabaya"
                    value={purpose}
                    maxLength={200}
                    onChange={(e) => setPurpose(e.target.value)}
                    required
                  />
                  <PesanKolom pesan={galatKolom.purpose} />
                </div>

                <div className="baris-bidang">
                  <div className="bidang">
                    <label htmlFor="destination">
                      Kota tujuan<span className="wajib">*</span>
                    </label>
                    <div className="input-ikon">
                      <Icon name="pin" size={16} />
                      <input
                        id="destination"
                        placeholder="mis. Surabaya"
                        value={destination}
                        maxLength={150}
                        onChange={(e) => setDestination(e.target.value)}
                        required
                      />
                    </div>
                    <PesanKolom pesan={galatKolom.destination} />
                  </div>

                  <div className="bidang">
                    <label htmlFor="trip-type">Jenis perjalanan</label>
                    <select id="trip-type" value={tripType} onChange={(e) => setTripType(e.target.value)}>
                      {opsiBerlabel(opsi.trip_types, LABEL_JENIS_PERJALANAN).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <PesanKolom pesan={galatKolom.trip_type} />
                  </div>

                  <div className="bidang">
                    <label htmlFor="transportation">Transportasi</label>
                    <select id="transportation" value={transportation} onChange={(e) => setTransportation(e.target.value)}>
                      {opsiBerlabel(opsi.transportations, LABEL_TRANSPORTASI).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <PesanKolom pesan={galatKolom.transportation} />
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
                </div>

                <div className="bidang">
                  <label htmlFor="description">Uraian kegiatan</label>
                  <textarea
                    id="description"
                    placeholder="Opsional — agenda selama perjalanan"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="aksi-wizard">
                <button type="button" className="btn" onClick={() => navigate('/employee/requests')}>
                  Batal
                </button>
                <button type="submit" className="btn utama">
                  Lanjut
                  <Icon name="arrow" size={15} />
                </button>
              </div>
            </form>
          )}

          {langkah === 1 && (
            <section className="panel">
              <PanelHeader title="Estimasi biaya" subtitle="Isi kategori yang dibutuhkan saja; kategori bernilai nol diabaikan." />
              <div className="panel-body formulir">
                {opsi.expense_categories.map((k) => {
                  const baris = biaya[k.value]
                  return (
                    <div className="baris-biaya" key={k.value}>
                      <div className="baris-biaya-judul">
                        <span className="stat-icon">
                          <Icon name={IKON_KATEGORI[k.value] ?? 'file'} size={16} />
                        </span>
                        <b>{LABEL_KATEGORI_BIAYA[k.value] ?? k.label}</b>
                      </div>
                      <div className="bidang">
                        <label htmlFor={`ket-${k.value}`}>Keterangan</label>
                        <input
                          id={`ket-${k.value}`}
                          placeholder="Opsional"
                          maxLength={150}
                          value={baris.description}
                          onChange={(e) => ubahBiaya(k.value, { description: e.target.value })}
                        />
                      </div>
                      <div className="bidang">
                        <label htmlFor={`qty-${k.value}`}>Jumlah</label>
                        <input
                          id={`qty-${k.value}`}
                          type="number"
                          min={1}
                          step="any"
                          value={baris.quantity}
                          onChange={(e) => ubahBiaya(k.value, { quantity: Number(e.target.value) })}
                        />
                      </div>
                      <div className="bidang">
                        <label htmlFor={`harga-${k.value}`}>Harga satuan</label>
                        <input
                          id={`harga-${k.value}`}
                          type="number"
                          min={0}
                          step={10000}
                          value={baris.unit_price}
                          onChange={(e) => ubahBiaya(k.value, { unit_price: Number(e.target.value) })}
                        />
                      </div>
                      <div className="baris-biaya-subtotal angka">{rupiah(subtotal(baris))}</div>
                    </div>
                  )
                })}
                <PesanKolom pesan={galatKolom.costs} />

                <div className="total-formulir">
                  <span>Total estimasi biaya</span>
                  <strong>{rupiah(total)}</strong>
                </div>

                <div className="bidang" style={{ maxWidth: 320 }}>
                  <label htmlFor="uang-muka">Uang muka diminta</label>
                  <input
                    id="uang-muka"
                    type="number"
                    min={0}
                    max={total}
                    step={50000}
                    placeholder="0"
                    value={uangMuka}
                    onChange={(e) => setUangMuka(e.target.value)}
                  />
                  <span className="petunjuk">Maksimal sebesar total estimasi biaya.</span>
                  <PesanKolom pesan={galatKolom.advance_requested} />
                </div>
              </div>

              <div className="aksi-wizard">
                <button type="button" className="btn" onClick={() => setLangkah(0)}>
                  Kembali
                </button>
                <button type="button" className="btn utama" onClick={lanjutDariBiaya}>
                  Lanjut
                  <Icon name="arrow" size={15} />
                </button>
              </div>
            </section>
          )}

          {langkah === 2 && (
            <section className="panel">
              <PanelHeader title="Dokumen & kirim" subtitle="Lampirkan undangan, TOR, atau surat tugas bila ada." />
              <div className="panel-body formulir">
                <div className="bidang" style={{ maxWidth: 320 }}>
                  <label htmlFor="jenis-dokumen">Jenis dokumen</label>
                  <select id="jenis-dokumen" value={jenisDokumen} onChange={(e) => setJenisDokumen(e.target.value as JenisDokumen)}>
                    {opsiBerlabel(opsi.document_types, LABEL_JENIS_DOKUMEN).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="zona-unggah"
                  onClick={() => inputBerkas.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    tambahBerkas(e.dataTransfer.files)
                  }}
                >
                  <Icon name="cloudUpload" size={24} />
                  <b>Klik atau seret berkas ke sini</b>
                  <small>PDF, JPG, PNG, atau Word · maksimal {batasKb / 1024} MB per berkas</small>
                </button>
                <input
                  ref={inputBerkas}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  hidden
                  onChange={(e) => {
                    tambahBerkas(e.target.files)
                    e.target.value = ''
                  }}
                />

                {berkas.length > 0 && (
                  <div className="daftar berbingkai">
                    {berkas.map((b) => (
                      <div className="daftar-baris" key={b.id}>
                        <span className="stat-icon">
                          <Icon name="file" size={16} />
                        </span>
                        <span className="isi">
                          <b>{b.file.name}</b>
                          <small>
                            {LABEL_JENIS_DOKUMEN[b.type] ?? b.type} · {ukuranBerkas(b.file.size)}
                          </small>
                        </span>
                        <button
                          type="button"
                          className="tombol-hapus-baris"
                          aria-label={`Hapus ${b.file.name}`}
                          onClick={() => setBerkas((lama) => lama.filter((x) => x.id !== b.id))}
                        >
                          <Icon name="sampah" size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {Object.entries(galatKolom)
                  .filter(([kolom]) => kolom.startsWith('documents'))
                  .map(([kolom, pesan]) => (
                    <PesanKolom key={kolom} pesan={pesan} />
                  ))}

                <div className="bidang">
                  <label htmlFor="notes">Catatan untuk supervisor</label>
                  <textarea
                    id="notes"
                    placeholder="Opsional — hal yang perlu diketahui supervisor"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <label className="centang">
                  <input type="checkbox" checked={pernyataan} onChange={(e) => setPernyataan(e.target.checked)} />
                  <span>Saya menyatakan seluruh data yang diisi benar dan sesuai kebijakan perusahaan.</span>
                </label>
              </div>

              <div className="aksi-wizard">
                <button type="button" className="btn" onClick={() => setLangkah(1)}>
                  Kembali
                </button>
                <div className="aksi-kanan">
                  <button type="button" className="btn" disabled={mengirim} onClick={() => void simpan(false)}>
                    Simpan draf
                  </button>
                  <button type="button" className="btn utama" disabled={mengirim || !pernyataan} onClick={() => void simpan(true)}>
                    <Icon name="kirim" size={15} />
                    {mengirim ? 'Mengirim...' : 'Ajukan'}
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="panel ringkasan-wizard">
          <PanelHeader title="Ringkasan" subtitle="Diperbarui saat Anda mengisi formulir" />
          <dl>
            <div>
              <dt>Supervisor penyetuju</dt>
              <dd>{opsi.approver?.name ?? 'Belum ditentukan'}</dd>
            </div>
            <div>
              <dt>Departemen</dt>
              <dd>{opsi.department?.name ?? '—'}</dd>
            </div>
            <div>
              <dt>Tujuan</dt>
              <dd>{destination.trim() || '—'}</dd>
            </div>
            <div>
              <dt>Tanggal</dt>
              <dd>
                {rentangTanggal(berangkat, kembali)} · {durasi} hari
              </dd>
            </div>
            <div>
              <dt>Dokumen</dt>
              <dd>{berkas.length} berkas</dd>
            </div>
            <div>
              <dt>Uang muka</dt>
              <dd className="angka">{rupiah(Number(uangMuka) || 0)}</dd>
            </div>
          </dl>
          <div className="total-formulir">
            <span>Total estimasi</span>
            <strong>{rupiah(total)}</strong>
          </div>
          {!opsi.approver && (
            <p className="peringatan-plafon">
              <Icon name="peringatan" size={15} />
              Akun Anda belum memiliki supervisor. Hubungi Super Admin agar pengajuan bisa dikirim.
            </p>
          )}
        </aside>
      </div>
    </>
  )
}
