import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { apiBuatSppd, apiKategoriBiaya, apiLokasi, apiOpsiSppd } from '@/api/endpoint'
import type { BaruRincianBiaya } from '@/api/endpoint'
import { GalatApi } from '@/api/klien'
import { Icon } from '@/components/ui/Icon'
import { Memuat } from '@/components/ui/Keadaan'
import { usePermintaan } from '@/hooks/usePermintaan'
import { hariIni, manusiawi, rupiah } from '@/utils/format'
import type { Sppd } from '@/api/tipe'

interface FormulirSppdModalProps {
  onTutup: () => void
  /** Dipanggil setelah draf tersimpan, membawa SPPD yang baru dibuat. */
  onTersimpan: (sppd: Sppd, pesan: string) => void
}

interface BarisBiaya extends BaruRincianBiaya {
  /** Kunci lokal untuk React; tidak dikirim ke backend. */
  kunci: number
}

const barisKosong = (kunci: number): BarisBiaya => ({
  kunci,
  kategori_biaya_id: 0,
  deskripsi: '',
  kuantitas: 1,
  harga_satuan: 0,
})

/**
 * Formulir pengajuan SPPD — kotak "2. Input Form SPPD Digital" pada flowchart.
 *
 * Simpanan pertama selalu menghasilkan DRAFT. Pengiriman ke alur persetujuan
 * dilakukan terpisah lewat tombol "Ajukan" pada halaman detail, sehingga
 * pemohon punya kesempatan melengkapi dokumen sebelum atasan menerimanya.
 */
export function FormulirSppdModal({ onTutup, onTersimpan }: FormulirSppdModalProps) {
  const opsi = usePermintaan(() => apiOpsiSppd(), [])
  const lokasi = usePermintaan(() => apiLokasi(), [])
  const kategori = usePermintaan(() => apiKategoriBiaya(), [])

  const [jenisPerjalanan, setJenisPerjalanan] = useState('LUAR_KOTA')
  const [moda, setModa] = useState('PESAWAT')
  const [keperluan, setKeperluan] = useState('')
  const [agenda, setAgenda] = useState('')
  const [lokasiId, setLokasiId] = useState('')
  const [tujuanLainnya, setTujuanLainnya] = useState('')
  const [berangkat, setBerangkat] = useState(hariIni())
  const [kembali, setKembali] = useState(hariIni())
  const [uangMuka, setUangMuka] = useState('0')
  const [catatan, setCatatan] = useState('')
  const [rincian, setRincian] = useState<BarisBiaya[]>([barisKosong(1)])

  const [galat, setGalat] = useState<string | null>(null)
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({})
  const [mengirim, setMengirim] = useState(false)

  const petaKategori = useMemo(
    () => Object.fromEntries((kategori.data ?? []).map((k) => [String(k.id), k])),
    [kategori.data],
  )

  const total = rincian.reduce(
    (jumlah, baris) => jumlah + Number(baris.kuantitas || 0) * Number(baris.harga_satuan || 0),
    0,
  )

  // Zona lokasi menentukan plafon yang dipakai backend, jadi memilih kota
  // sekaligus menyetel jenis perjalanan agar keduanya tidak bertentangan.
  const pilihLokasi = (nilai: string) => {
    setLokasiId(nilai)
    const kota = (lokasi.data ?? []).find((l) => String(l.id) === nilai)
    if (kota) setJenisPerjalanan(kota.zona)
  }

  const ubahBaris = (kunci: number, perubahan: Partial<BarisBiaya>) => {
    setRincian((daftar) =>
      daftar.map((baris) => (baris.kunci === kunci ? { ...baris, ...perubahan } : baris)),
    )
  }

  const tambahBaris = () =>
    setRincian((daftar) => [...daftar, barisKosong(Math.max(0, ...daftar.map((b) => b.kunci)) + 1)])

  const hapusBaris = (kunci: number) =>
    setRincian((daftar) => (daftar.length === 1 ? daftar : daftar.filter((b) => b.kunci !== kunci)))

  const kirim = async (peristiwa: FormEvent) => {
    peristiwa.preventDefault()
    setGalat(null)
    setGalatKolom({})

    // Pemeriksaan ringan di sisi klien; backend tetap memeriksa ulang.
    if (!lokasiId && !tujuanLainnya.trim()) {
      setGalat('Pilih kota tujuan dari daftar, atau tulis tujuan lain.')
      return
    }
    if (new Date(kembali) < new Date(berangkat)) {
      setGalat('Tanggal kembali tidak boleh lebih awal dari tanggal berangkat.')
      return
    }

    const barisTerisi = rincian.filter((b) => b.kategori_biaya_id > 0 && Number(b.harga_satuan) > 0)
    if (!barisTerisi.length) {
      setGalat('Isi minimal satu rincian estimasi biaya dengan kategori dan harga.')
      return
    }

    setMengirim(true)
    try {
      const { data, pesan } = await apiBuatSppd({
        jenis_perjalanan: jenisPerjalanan,
        moda_transportasi: moda,
        keperluan: keperluan.trim(),
        agenda: agenda.trim() || undefined,
        tanggal_berangkat: berangkat,
        tanggal_kembali: kembali,
        lokasi_tujuan_id: lokasiId ? Number(lokasiId) : undefined,
        tujuan_lainnya: lokasiId ? undefined : tujuanLainnya.trim(),
        uang_muka_diminta: Number(uangMuka) || 0,
        catatan_pemohon: catatan.trim() || undefined,
        // `kunci` hanya penanda baris di sisi klien, tidak ikut dikirim.
        rincian_biaya: barisTerisi.map((baris) => ({
          kategori_biaya_id: baris.kategori_biaya_id,
          deskripsi: baris.deskripsi?.trim() || undefined,
          kuantitas: Number(baris.kuantitas),
          harga_satuan: Number(baris.harga_satuan),
        })),
      })

      onTersimpan(data, pesan)
    } catch (penyebab: unknown) {
      if (penyebab instanceof GalatApi) {
        setGalat(penyebab.message)
        setGalatKolom(
          Object.fromEntries(penyebab.pesanKolom.map((g) => [g.kolom, g.pesan])),
        )
      } else {
        setGalat('Tidak dapat menghubungi server. Coba lagi sesaat lagi.')
      }
    } finally {
      setMengirim(false)
    }
  }

  const sedangMemuatOpsi = opsi.memuat || lokasi.memuat || kategori.memuat

  return (
    <div className="lapisan-modal" role="dialog" aria-modal="true" aria-label="Formulir pengajuan">
      <div className="modal lebar">
        <div className="modal-head">
          <div>
            <h2>Ajukan Perjalanan Dinas</h2>
            <p>Lengkapi formulir berikut. Data tersimpan sebagai draf terlebih dahulu.</p>
          </div>
          <button type="button" className="tombol-tutup" onClick={onTutup} aria-label="Tutup">
            ×
          </button>
        </div>

        <form onSubmit={kirim} style={{ display: 'contents' }}>
          <div className="modal-body">
            {galat && (
              <div className="kotak-galat" role="alert">
                <Icon name="peringatan" size={16} />
                <span>{galat}</span>
              </div>
            )}

            {sedangMemuatOpsi ? (
              <Memuat baris={5} />
            ) : (
              <>
                <div className="bidang">
                  <label htmlFor="keperluan">
                    Keperluan perjalanan<span className="wajib">*</span>
                  </label>
                  <input
                    id="keperluan"
                    placeholder="mis. Audit sistem di kantor cabang Surabaya"
                    value={keperluan}
                    onChange={(e) => setKeperluan(e.target.value)}
                    maxLength={200}
                    required
                  />
                  {galatKolom.keperluan && (
                    <span className="pesan-galat">{galatKolom.keperluan}</span>
                  )}
                </div>

                <div className="baris-bidang">
                  <div className="bidang">
                    <label htmlFor="lokasi">Kota tujuan</label>
                    <select id="lokasi" value={lokasiId} onChange={(e) => pilihLokasi(e.target.value)}>
                      <option value="">— Tujuan lain —</option>
                      {(lokasi.data ?? []).map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nama_kota} ({manusiawi(l.zona)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bidang">
                    <label htmlFor="jenis">Jenis perjalanan</label>
                    <select
                      id="jenis"
                      value={jenisPerjalanan}
                      onChange={(e) => setJenisPerjalanan(e.target.value)}
                      disabled={Boolean(lokasiId)}
                    >
                      {(opsi.data?.jenis_perjalanan ?? []).map((j) => (
                        <option key={j} value={j}>
                          {manusiawi(j)}
                        </option>
                      ))}
                    </select>
                    <span className="petunjuk">
                      {lokasiId ? 'Mengikuti zona kota tujuan.' : 'Menentukan plafon biaya.'}
                    </span>
                  </div>

                  <div className="bidang">
                    <label htmlFor="moda">Moda transportasi</label>
                    <select id="moda" value={moda} onChange={(e) => setModa(e.target.value)}>
                      {(opsi.data?.moda_transportasi ?? []).map((m) => (
                        <option key={m} value={m}>
                          {manusiawi(m)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {!lokasiId && (
                  <div className="bidang">
                    <label htmlFor="tujuan-lain">
                      Tujuan lain<span className="wajib">*</span>
                    </label>
                    <input
                      id="tujuan-lain"
                      placeholder="Tulis kota atau lokasi tujuan"
                      value={tujuanLainnya}
                      onChange={(e) => setTujuanLainnya(e.target.value)}
                      maxLength={120}
                    />
                  </div>
                )}

                <div className="baris-bidang">
                  <div className="bidang">
                    <label htmlFor="berangkat">
                      Tanggal berangkat<span className="wajib">*</span>
                    </label>
                    <input
                      id="berangkat"
                      type="date"
                      value={berangkat}
                      onChange={(e) => {
                        setBerangkat(e.target.value)
                        if (new Date(kembali) < new Date(e.target.value)) setKembali(e.target.value)
                      }}
                      required
                    />
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
                    <span className="petunjuk">Maksimal 80% dari estimasi biaya.</span>
                  </div>
                </div>

                <div className="bidang">
                  <label htmlFor="agenda">Agenda kegiatan</label>
                  <textarea
                    id="agenda"
                    placeholder="Uraikan agenda selama perjalanan"
                    value={agenda}
                    onChange={(e) => setAgenda(e.target.value)}
                  />
                </div>

                {/* ── Rincian estimasi biaya ── */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <label style={{ fontSize: 12.5, fontWeight: 600 }}>
                        Rincian estimasi biaya<span className="wajib">*</span>
                      </label>
                      <p style={{ fontSize: 11.5, color: 'var(--redup)' }}>
                        Rincian yang melampaui plafon tetap dapat diajukan, tetapi akan
                        ditandai untuk penyetuju.
                      </p>
                    </div>
                    <button type="button" className="btn kecil lembut" onClick={tambahBaris}>
                      <Icon name="plus" size={15} />
                      Tambah baris
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {rincian.map((baris) => {
                      const master = petaKategori[String(baris.kategori_biaya_id)]
                      const subtotal = Number(baris.kuantitas || 0) * Number(baris.harga_satuan || 0)

                      return (
                        <div className="baris-rincian" key={baris.kunci}>
                          <div className="bidang">
                            <label>Kategori</label>
                            <select
                              value={baris.kategori_biaya_id || ''}
                              onChange={(e) =>
                                ubahBaris(baris.kunci, { kategori_biaya_id: Number(e.target.value) })
                              }
                            >
                              <option value="">— Pilih —</option>
                              {(kategori.data ?? []).map((k) => (
                                <option key={k.id} value={k.id}>
                                  {k.nama}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="bidang">
                            <label>Keterangan</label>
                            <input
                              placeholder="mis. Tiket pesawat PP"
                              value={baris.deskripsi ?? ''}
                              onChange={(e) => ubahBaris(baris.kunci, { deskripsi: e.target.value })}
                            />
                          </div>

                          <div className="bidang">
                            <label>Jumlah{master ? ` (${master.satuan})` : ''}</label>
                            <input
                              type="number"
                              min={0.01}
                              step={1}
                              value={baris.kuantitas}
                              onChange={(e) =>
                                ubahBaris(baris.kunci, { kuantitas: Number(e.target.value) })
                              }
                            />
                          </div>

                          <div className="bidang">
                            <label>Harga satuan</label>
                            <input
                              type="number"
                              min={0}
                              step={10000}
                              value={baris.harga_satuan}
                              onChange={(e) =>
                                ubahBaris(baris.kunci, { harga_satuan: Number(e.target.value) })
                              }
                            />
                            <span className="subtotal">{rupiah(subtotal)}</span>
                          </div>

                          <button
                            type="button"
                            className="tombol-hapus-baris"
                            onClick={() => hapusBaris(baris.kunci)}
                            aria-label="Hapus baris biaya"
                            disabled={rincian.length === 1}
                          >
                            <Icon name="sampah" size={16} />
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  <div className="total-formulir" style={{ marginTop: 12 }}>
                    <span>Total estimasi biaya</span>
                    <strong>{rupiah(total)}</strong>
                  </div>
                </div>

                <div className="bidang">
                  <label htmlFor="catatan">Catatan untuk penyetuju</label>
                  <textarea
                    id="catatan"
                    placeholder="Opsional — hal yang perlu diketahui atasan"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="modal-kaki">
            <span className="kiri">Total {rupiah(total)}</span>
            <button type="button" className="btn" onClick={onTutup}>
              Batal
            </button>
            <button
              type="submit"
              className="btn utama"
              disabled={mengirim || sedangMemuatOpsi || !keperluan.trim()}
            >
              {mengirim ? 'Menyimpan...' : 'Simpan sebagai Draf'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
