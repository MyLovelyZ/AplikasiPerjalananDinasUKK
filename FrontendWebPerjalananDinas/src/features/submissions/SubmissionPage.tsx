import { useRef, useState } from 'react'
import type { FormEvent } from 'react'

import { apiBuatSppd, apiKategoriBiaya, apiLokasi } from '@/api/endpoint'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/auth/useAuth'
import { usePermintaan } from '@/hooks/usePermintaan'
import { hariIni, rupiah } from '@/utils/format'
import type { PageKey } from '@/types/navigation'

interface SubmissionPageProps {
  onBuatSppd?: () => void
  onBukaSppd?: (id: number) => void
  penandaSegar?: number
  onSukses?: (pesan: string) => void
  onNavigate?: (halaman: PageKey) => void
}

interface UploadedFileItem {
  id: number
  name: string
  size: string
  type: 'pdf' | 'img'
}

export function SubmissionPage({ onBukaSppd, onSukses, onNavigate }: SubmissionPageProps) {
  const { profil } = useAuth()
  const lokasi = usePermintaan(() => apiLokasi(), [])
  const kategori = usePermintaan(() => apiKategoriBiaya(), [])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Tahap wizard: 1 (Trip Details), 2 (Cost Estimate), 3 (Documents)
  const [langkah, setLangkah] = useState<1 | 2 | 3>(1)

  // Step 1: Trip Details
  const [tujuan, setTujuan] = useState('Jakarta, Indonesia')
  const [kategoriPerjalanan, setKategoriPerjalanan] = useState('LUAR_KOTA')
  const [tanggalBerangkat, setTanggalBerangkat] = useState(hariIni())
  const [tanggalKembali, setTanggalKembali] = useState(hariIni())
  const [keperluan, setKeperluan] = useState(
    'Koordinasi teknis implementasi sistem operasional terpadu dan peninjauan langsung lapangan.',
  )

  // Step 2: Estimasi Biaya
  const [modaTransportasi, setModaTransportasi] = useState('Pesawat Terbang')
  const [biayaTransport, setBiayaTransport] = useState(2500000)
  const [namaHotel, setNamaHotel] = useState('Hotel Grand Mercure')
  const [durasiHotel, setDurasiHotel] = useState(2)
  const [biayaHotel, setBiayaHotel] = useState(3000000)
  const [uangSaku, setUangSaku] = useState(1200000)
  const [biayaLainnya, setBiayaLainnya] = useState(500000)

  // Step 3: Dokumen Pendukung
  const [daftarFile, setDaftarFile] = useState<UploadedFileItem[]>([
    { id: 1, name: 'Invitation_Letter_Q3.pdf', size: '1.2 MB', type: 'pdf' },
    { id: 2, name: 'Event_Schedule_Draft.jpg', size: '645 KB', type: 'img' },
  ])
  const [pernyataanAkurat, setPernyataanAkurat] = useState(true)

  const [mengirim, setMengirim] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)

  // Total Estimasi
  const totalEstimasi =
    Number(biayaTransport || 0) +
    Number(biayaHotel || 0) +
    Number(uangSaku || 0) +
    Number(biayaLainnya || 0)

  const namaJabatan = profil?.karyawan?.jabatan?.nama_jabatan ?? 'Manager'

  // Tambah file baru dari input file
  const handlePilihFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const file = files[0]
    const ext = file.name.split('.').pop()?.toLowerCase()
    const tipe: 'pdf' | 'img' = ext === 'pdf' ? 'pdf' : 'img'
    const ukuranKb = Math.round(file.size / 1024)
    const ukuranTeks = ukuranKb > 1024 ? `${(ukuranKb / 1024).toFixed(1)} MB` : `${ukuranKb} KB`

    setDaftarFile((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: file.name,
        size: ukuranTeks,
        type: tipe,
      },
    ])
  }

  const hapusFile = (id: number) => {
    setDaftarFile((prev) => prev.filter((f) => f.id !== id))
  }

  // Kirim data ke API backend
  const kirimPermintaan = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (!pernyataanAkurat) {
      setGalat('Silakan centang pernyataan kepatuhan kebijakan sebelum mengirim.')
      return
    }

    setGalat(null)
    setMengirim(true)

    // Cari lokasi id jika cocok
    const lokasiCocok = (lokasi.data ?? []).find(
      (l) => l.nama_kota.toLowerCase() === tujuan.toLowerCase().split(',')[0].trim(),
    )

    // Temukan kategori biaya
    const katList = kategori.data ?? []
    const katTransport = katList.find((k) => k.nama_kategori.toLowerCase().includes('transport'))?.id ?? 1
    const katHotel = katList.find((k) => k.nama_kategori.toLowerCase().includes('penginapan'))?.id ?? 2
    const katSaku = katList.find((k) => k.nama_kategori.toLowerCase().includes('uang'))?.id ?? 3

    const rincianBiaya = [
      {
        kategori_biaya_id: katTransport,
        deskripsi: `Tiket ${modaTransportasi}`,
        kuantitas: 1,
        harga_satuan: biayaTransport,
      },
      {
        kategori_biaya_id: katHotel,
        deskripsi: namaHotel || 'Akomodasi Hotel',
        kuantitas: durasiHotel || 1,
        harga_satuan: Math.round(biayaHotel / (durasiHotel || 1)),
      },
      {
        kategori_biaya_id: katSaku,
        deskripsi: 'Uang Saku & Operasional Lainnya',
        kuantitas: 1,
        harga_satuan: uangSaku + biayaLainnya,
      },
    ]

    try {
      const hasil = await apiBuatSppd({
        jenis_perjalanan: kategoriPerjalanan,
        moda_transportasi: modaTransportasi.toUpperCase().includes('PESAWAT')
          ? 'PESAWAT'
          : modaTransportasi.toUpperCase().includes('KERETA')
            ? 'KERETA'
            : 'MOBIL_DINAS',
        keperluan,
        tanggal_berangkat: tanggalBerangkat,
        tanggal_kembali: tanggalKembali,
        lokasi_tujuan_id: lokasiCocok?.id,
        tujuan_lainnya: lokasiCocok ? undefined : tujuan,
        uang_muka_diminta: Math.round(totalEstimasi * 0.8),
        rincian_biaya: rincianBiaya,
      })

      if (onSukses) {
        onSukses('Permintaan perjalanan dinas baru berhasil diajukan!')
      }
      if (hasil?.data?.id && onBukaSppd) {
        onBukaSppd(hasil.data.id)
      } else if (onNavigate) {
        onNavigate('Perjalanan Saya')
      }
    } catch (penyebab: unknown) {
      // Jika terjadi galat API/koneksi saat tes, tetap berikan pesan ramah
      const pesanGalat =
        penyebab instanceof Error
          ? penyebab.message
          : 'Gagal menghubungi server backend. Pastikan API berjalan.'
      setGalat(pesanGalat)
    } finally {
      setMengirim(false)
    }
  }

  return (
    <div className="travel-wizard-page">
      {/* ── Stepper Bar (3 Tahap) ────────────────────────────────────────── */}
      <div className="travel-stepper">
        {/* Step 1: Trip Details */}
        <div
          className={`travel-step-item ${langkah === 1 ? 'active' : langkah > 1 ? 'completed' : ''}`}
          onClick={() => setLangkah(1)}
        >
          <div className="travel-step-circle">
            {langkah > 1 ? <Icon name="check" size={16} /> : '1'}
          </div>
          <span className="travel-step-label">Trip Details</span>
        </div>

        <div className={`travel-step-line ${langkah > 1 ? 'completed' : ''}`} />

        {/* Step 2: Cost Estimate */}
        <div
          className={`travel-step-item ${langkah === 2 ? 'active' : langkah > 2 ? 'completed' : ''}`}
          onClick={() => setLangkah(2)}
        >
          <div className="travel-step-circle">
            {langkah > 2 ? <Icon name="check" size={16} /> : '2'}
          </div>
          <span className="travel-step-label">Cost Estimate</span>
        </div>

        <div className={`travel-step-line ${langkah > 2 ? 'completed' : ''}`} />

        {/* Step 3: Documents */}
        <div
          className={`travel-step-item ${langkah === 3 ? 'active' : ''}`}
          onClick={() => setLangkah(3)}
        >
          <div className="travel-step-circle">3</div>
          <span className="travel-step-label">Documents</span>
        </div>
      </div>

      {galat && (
        <div className="kotak-galat" role="alert" style={{ marginBottom: 12 }}>
          <Icon name="peringatan" size={16} />
          <span>{galat}</span>
        </div>
      )}

      {/* ── TAHAP 1: TRIP DETAILS ───────────────────────────────────────── */}
      {langkah === 1 && (
        <div className="travel-wizard-grid">
          {/* Kolom Kiri: Form Trip Details */}
          <div className="travel-card">
            <div className="travel-card-head">
              <h2 className="travel-card-title">Trip Details</h2>
              <p className="travel-card-subtitle">
                Please provide the foundational details for your travel request.
              </p>
            </div>

            <div className="travel-form-row">
              <div className="travel-form-group">
                <label className="travel-label">Destination City / Country</label>
                <div className="travel-input-box">
                  <span className="travel-input-icon">
                    <Icon name="pin" size={18} />
                  </span>
                  <input
                    type="text"
                    placeholder="e.g., Jakarta, Indonesia"
                    value={tujuan}
                    onChange={(e) => setTujuan(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="travel-form-group">
                <label className="travel-label">Travel Category</label>
                <div className="travel-input-box">
                  <span className="travel-input-icon">
                    <Icon name="plane" size={18} />
                  </span>
                  <select
                    value={kategoriPerjalanan}
                    onChange={(e) => setKategoriPerjalanan(e.target.value)}
                  >
                    <option value="LUAR_KOTA">Domestic Business (Luar Kota)</option>
                    <option value="LUAR_NEGERI">International (Luar Negeri)</option>
                    <option value="DALAM_KOTA">Local Area (Dalam Kota)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="travel-form-row">
              <div className="travel-form-group">
                <label className="travel-label">Departure Date</label>
                <div className="travel-input-box">
                  <span className="travel-input-icon">
                    <Icon name="calendar" size={18} />
                  </span>
                  <input
                    type="date"
                    value={tanggalBerangkat}
                    onChange={(e) => setTanggalBerangkat(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="travel-form-group">
                <label className="travel-label">Return Date</label>
                <div className="travel-input-box">
                  <span className="travel-input-icon">
                    <Icon name="calendar" size={18} />
                  </span>
                  <input
                    type="date"
                    value={tanggalKembali}
                    onChange={(e) => setTanggalKembali(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="travel-form-group">
              <label className="travel-label">Business Purpose</label>
              <textarea
                className="travel-textarea"
                placeholder="Briefly describe the business objective of this trip..."
                value={keperluan}
                onChange={(e) => setKeperluan(e.target.value)}
                required
              />
            </div>

            <div className="travel-wizard-actions">
              <button
                type="button"
                className="btn-wizard-cancel"
                onClick={() => onNavigate?.('Dashboard')}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-wizard-next"
                onClick={() => setLangkah(2)}
              >
                <span>Next Step</span>
                <Icon name="arrow" size={16} />
              </button>
            </div>
          </div>

          {/* Kolom Kanan: Policy Guidelines */}
          <div className="policy-guidelines-card">
            <div className="policy-head">
              <Icon name="shield" size={18} />
              <span>Policy Guidelines</span>
            </div>

            <div className="policy-badge">
              Current Grade: Level 3 ({namaJabatan})
            </div>

            <p className="policy-subtext">
              Based on your employee grade, the following travel allowances apply:
            </p>

            <div className="policy-item">
              <div className="policy-item-title" style={{ color: '#0284c7' }}>
                <Icon name="plane" size={16} />
                <span>Flight Class</span>
              </div>
              <p className="policy-item-desc">
                Economy Class for flights under 4 hours. Business Class allowed for International &gt; 4 hrs.
              </p>
            </div>

            <div className="policy-item">
              <div className="policy-item-title" style={{ color: '#00897b' }}>
                <Icon name="bed" size={16} />
                <span>Accommodation</span>
              </div>
              <p className="policy-item-desc">
                Max 4-star hotel. Daily cap: Rp 1.000.000 (Domestic), Rp 2.500.000 (International).
              </p>
            </div>

            <div className="policy-item">
              <div className="policy-item-title" style={{ color: '#16a34a' }}>
                <Icon name="utensils" size={16} />
                <span>Per Diem</span>
              </div>
              <p className="policy-item-desc">
                Rp 300.000 / day for meals and incidentals.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAHAP 2: ESTIMASI BIAYA ─────────────────────────────────────── */}
      {langkah === 2 && (
        <div className="travel-wizard-grid">
          {/* Kolom Kiri: 3 Kartu Biaya */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Kartu 1: Transportasi */}
            <div className="travel-card">
              <div className="cost-card-header">
                <div className="cost-card-title">
                  <Icon name="plane" size={18} />
                  <span>Transportasi</span>
                </div>
              </div>

              <div className="travel-form-row">
                <div className="travel-form-group">
                  <label className="travel-label">Moda Transportasi</label>
                  <div className="travel-input-box">
                    <select
                      value={modaTransportasi}
                      onChange={(e) => setModaTransportasi(e.target.value)}
                    >
                      <option value="Pesawat Terbang">Pesawat Terbang</option>
                      <option value="Kereta Api">Kereta Api</option>
                      <option value="Mobil Dinas">Mobil Dinas</option>
                      <option value="Kendaraan Pribadi">Kendaraan Pribadi</option>
                      <option value="Bus / Travel">Bus / Travel</option>
                    </select>
                  </div>
                </div>

                <div className="travel-form-group">
                  <label className="travel-label">Estimasi Biaya (IDR)</label>
                  <div className="travel-input-box">
                    <input
                      type="number"
                      value={biayaTransport}
                      onChange={(e) => setBiayaTransport(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Kartu 2: Akomodasi */}
            <div className="travel-card">
              <div className="cost-card-header">
                <div className="cost-card-title">
                  <Icon name="bed" size={18} />
                  <span>Akomodasi</span>
                </div>
                <button
                  type="button"
                  className="cost-search-link"
                  onClick={() => alert('Fitur pencarian hotel rekanan PT. Citra Mandiri')}
                >
                  🔍 Cari Hotel
                </button>
              </div>

              <div className="travel-form-group">
                <label className="travel-label">Nama Hotel (Opsional)</label>
                <div className="travel-input-box">
                  <input
                    type="text"
                    placeholder="Masukkan nama hotel"
                    value={namaHotel}
                    onChange={(e) => setNamaHotel(e.target.value)}
                  />
                </div>
              </div>

              <div className="travel-form-row">
                <div className="travel-form-group">
                  <label className="travel-label">Durasi (Malam)</label>
                  <div className="travel-input-box">
                    <input
                      type="number"
                      min={1}
                      value={durasiHotel}
                      onChange={(e) => setDurasiHotel(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="travel-form-group">
                  <label className="travel-label">Estimasi Total Akomodasi (IDR)</label>
                  <div className="travel-input-box">
                    <input
                      type="number"
                      value={biayaHotel}
                      onChange={(e) => setBiayaHotel(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Kartu 3: Uang Saku & Lainnya */}
            <div className="travel-card">
              <div className="cost-card-header">
                <div className="cost-card-title">
                  <Icon name="wallet" size={18} />
                  <span>Uang Saku &amp; Lainnya</span>
                </div>
              </div>

              <div className="travel-form-row">
                <div className="travel-form-group">
                  <label className="travel-label">Uang Saku (Auto-calc: 4 Hari)</label>
                  <div className="travel-input-box">
                    <input
                      type="number"
                      value={uangSaku}
                      onChange={(e) => setUangSaku(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="travel-form-group">
                  <label className="travel-label">Biaya Lainnya (Taksi, dll)</label>
                  <div className="travel-input-box">
                    <input
                      type="number"
                      value={biayaLainnya}
                      onChange={(e) => setBiayaLainnya(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Panduan Polis (Dark) & Ringkasan Total */}
          <div>
            {/* Card Panduan Polis Gelap */}
            <div className="dark-policy-card">
              <div className="dark-policy-head">
                <Icon name="shield" size={18} />
                <span>Panduan Polis</span>
              </div>

              <div className="dark-grade-badge">
                <small>GRADE AKTIF</small>
                <strong>Managerial (G4)</strong>
              </div>

              <table className="dark-policy-table">
                <tbody>
                  <tr>
                    <td>Pesawat</td>
                    <td>Kelas Ekonomi</td>
                  </tr>
                  <tr>
                    <td>Hotel (Max/Malam)</td>
                    <td>Rp 1.000.000</td>
                  </tr>
                  <tr>
                    <td>Uang Saku/Hari</td>
                    <td>Rp 300.000</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Card Total Estimasi */}
            <div className="total-summary-card">
              <h3 className="total-summary-title">Total Estimasi</h3>

              <table className="total-summary-table">
                <tbody>
                  <tr>
                    <td>Transportasi</td>
                    <td>{rupiah(biayaTransport)}</td>
                  </tr>
                  <tr>
                    <td>Akomodasi</td>
                    <td>{rupiah(biayaHotel)}</td>
                  </tr>
                  <tr>
                    <td>Uang Saku</td>
                    <td>{rupiah(uangSaku)}</td>
                  </tr>
                  <tr>
                    <td>Lainnya</td>
                    <td>{rupiah(biayaLainnya)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="total-grand-row">
                <div className="total-grand-label">Grand Total</div>
                <div className="total-grand-value">{rupiah(totalEstimasi)}</div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn-wizard-back"
                  style={{ flex: 1 }}
                  onClick={() => setLangkah(1)}
                >
                  Kembali
                </button>
                <button
                  type="button"
                  className="btn-wizard-submit"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setLangkah(3)}
                >
                  Lanjut
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAHAP 3: DOKUMEN PENDUKUNG ──────────────────────────────────── */}
      {langkah === 3 && (
        <div className="travel-card">
          <div className="travel-card-head">
            <h2 className="travel-card-title">Dokumen Pendukung</h2>
            <p className="travel-card-subtitle">
              Upload supporting documents for your travel request. (Invitation Letter, Event Schedule, or Official Assignment Letter).
            </p>
          </div>

          {/* Area Drag & Drop Box */}
          <div
            className="dropzone-box"
            onClick={() => fileInputRef.current?.click()}
            style={{ cursor: 'pointer' }}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handlePilihFile}
            />
            <div className="dropzone-icon-circle">
              <Icon name="cloudUpload" size={26} />
            </div>
            <div className="dropzone-title">Drag and drop your files here</div>
            <div className="dropzone-hint">
              Files supported: PDF, JPG, PNG (Max 5MB per file)
            </div>
            <button
              type="button"
              className="btn-browse-file"
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
            >
              Browse Files
            </button>
          </div>

          {/* List File Terunggah */}
          <span className="uploaded-files-label">UPLOADED FILES</span>

          {daftarFile.map((file) => (
            <div className="uploaded-file-item" key={file.id}>
              <div className="uploaded-file-left">
                <div className={`file-type-badge ${file.type}`}>
                  <Icon name="file" size={18} />
                </div>
                <div>
                  <div className="file-info-name">{file.name}</div>
                  <div className="file-info-size">{file.size}</div>
                </div>
              </div>
              <button
                type="button"
                className="btn-delete-file"
                aria-label={`Hapus ${file.name}`}
                onClick={() => hapusFile(file.id)}
              >
                <Icon name="sampah" size={17} />
              </button>
            </div>
          ))}

          {/* Kotak Centang Pernyataan */}
          <label className="declaration-box">
            <input
              type="checkbox"
              checked={pernyataanAkurat}
              onChange={(e) => setPernyataanAkurat(e.target.checked)}
            />
            <span>
              I declare that all information provided is accurate and follows company policy.
            </span>
          </label>

          {/* Tombol Aksi Bawah */}
          <div className="travel-wizard-actions">
            <button
              type="button"
              className="btn-wizard-back"
              onClick={() => setLangkah(2)}
            >
              Back
            </button>
            <button
              type="button"
              className="btn-wizard-submit"
              disabled={mengirim || !pernyataanAkurat}
              onClick={() => kirimPermintaan()}
            >
              <span>{mengirim ? 'Submitting...' : 'Submit Request'}</span>
              <Icon name="arrow" size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
