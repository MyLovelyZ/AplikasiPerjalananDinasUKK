import { useRef, useState } from 'react'
import type { FormEvent } from 'react'

import {
  apiAjukanLaporan,
  apiDetailLaporan,
  apiHapusKlaim,
  apiKategoriBiaya,
  apiPencairanDariLaporan,
  apiTambahKlaim,
  apiUnggahBukti,
} from '@/api/endpoint'
import { urlBerkas } from '@/api/klien'
import { Icon } from '@/components/ui/Icon'
import { Muatan } from '@/components/ui/Keadaan'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/auth/useAuth'
import { usePermintaan } from '@/hooks/usePermintaan'
import { FormVerifikasi } from '@/features/reports/components/FormVerifikasi'
import { hariIni, manusiawi, rupiah, tanggalPendek } from '@/utils/format'
import type { Laporan } from '@/api/tipe'

interface LaporanModalProps {
  laporanId: number
  onTutup: () => void
  onBerubah: (pesan: string) => void
  onGalat: (penyebab: unknown) => void
}

/** Kalimat penjelas tiga cabang "Status Selisih Biaya?" pada flowchart. */
function kalimatSelisih(laporan: Laporan) {
  const nominal = rupiah(Math.abs(Number(laporan.selisih)))
  switch (laporan.jenis_selisih) {
    case 'KURANG_BAYAR':
      return `Realisasi melebihi uang muka. Perusahaan perlu membayar ${nominal} sebagai reimbursement.`
    case 'LEBIH_BAYAR':
      return `Uang muka lebih besar dari realisasi. Sisa ${nominal} perlu dikembalikan ke perusahaan.`
    default:
      return 'Realisasi sama persis dengan uang muka, tidak ada dana yang perlu berpindah.'
  }
}

/**
 * Layar laporan pertanggungjawaban — flowchart langkah 6 s.d. 9.
 *
 * Menampung tiga peran sekaligus:
 *   pemohon  : menambah klaim, mengunggah nota, mengajukan laporan
 *   keuangan : memverifikasi klaim satu per satu lalu menutup laporan
 *   siapa pun: membaca hasil akhirnya
 */
export function LaporanModal({ laporanId, onTutup, onBerubah, onGalat }: LaporanModalProps) {
  const { boleh, profil } = useAuth()
  const { data, memuat, galat, muatUlang } = usePermintaan(
    () => apiDetailLaporan(laporanId),
    [laporanId],
  )
  const kategori = usePermintaan(() => apiKategoriBiaya(), [])

  const [sedangAksi, setSedangAksi] = useState<string | null>(null)
  const [formKlaimTerbuka, setFormKlaimTerbuka] = useState(false)
  const [modeVerifikasi, setModeVerifikasi] = useState(false)

  // Satu input berkas tersembunyi dipakai bergantian oleh semua baris klaim;
  // klaim mana yang sedang diunggahi disimpan pada state.
  const inputBerkasRef = useRef<HTMLInputElement>(null)
  const [klaimUnggah, setKlaimUnggah] = useState<number | null>(null)

  const [kategoriBaru, setKategoriBaru] = useState('')
  const [tanggalKlaim, setTanggalKlaim] = useState(hariIni())
  const [deskripsiKlaim, setDeskripsiKlaim] = useState('')
  const [jumlahKlaim, setJumlahKlaim] = useState('')

  const jalankan = async (nama: string, aksi: () => Promise<{ pesan: string }>) => {
    setSedangAksi(nama)
    try {
      const { pesan } = await aksi()
      onBerubah(pesan)
      muatUlang()
    } catch (penyebab: unknown) {
      onGalat(penyebab)
    } finally {
      setSedangAksi(null)
    }
  }

  const tambahKlaim = async (peristiwa: FormEvent) => {
    peristiwa.preventDefault()
    await jalankan('klaim', () =>
      apiTambahKlaim(laporanId, {
        kategori_biaya_id: Number(kategoriBaru),
        tanggal_transaksi: tanggalKlaim,
        deskripsi: deskripsiKlaim.trim(),
        jumlah_diajukan: Number(jumlahKlaim),
      }),
    )
    setFormKlaimTerbuka(false)
    setKategoriBaru('')
    setDeskripsiKlaim('')
    setJumlahKlaim('')
  }

  const pilihBerkas = (klaimId: number) => {
    setKlaimUnggah(klaimId)
    inputBerkasRef.current?.click()
  }

  const unggahBerkas = async (berkas: File | undefined) => {
    if (!berkas || klaimUnggah === null) return
    await jalankan('unggah', () => apiUnggahBukti(laporanId, klaimUnggah, berkas))
    setKlaimUnggah(null)
    if (inputBerkasRef.current) inputBerkasRef.current.value = ''
  }

  return (
    <div className="lapisan-modal" role="dialog" aria-modal="true" aria-label="Laporan pertanggungjawaban">
      <div className="modal lebar">
        <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={6}>
          {(laporan) => {
            const milikSaya =
              String(laporan.perjalanan?.karyawan_id) === String(profil?.karyawan?.id)
            const dapatDisunting = ['DRAFT', 'REVISI'].includes(laporan.status)
            const klaim = laporan.klaim ?? []
            const totalDiajukan = klaim.reduce((n, k) => n + Number(k.jumlah_diajukan), 0)

            // Aturan D-2: klaim pada kategori bernota wajib punya lampiran.
            const klaimTanpaNota = klaim.filter(
              (k) => k.kategoriBiaya?.wajib_bukti && !(k.bukti ?? []).length,
            )

            return (
              <>
                <div className="modal-head">
                  <div>
                    <h2>{laporan.nomor_laporan}</h2>
                    <p>
                      {laporan.perjalanan?.nomor_sppd} · {laporan.perjalanan?.keperluan}
                    </p>
                    <div style={{ marginTop: 7 }}>
                      <StatusBadge
                        label={manusiawi(laporan.status)}
                        warna={
                          laporan.status === 'DIVERIFIKASI'
                            ? 'hijau'
                            : laporan.status === 'DIAJUKAN'
                              ? 'kuning'
                              : laporan.status === 'REVISI'
                                ? 'ungu'
                                : 'netral'
                        }
                      />
                    </div>
                  </div>
                  <button type="button" className="tombol-tutup" onClick={onTutup} aria-label="Tutup">
                    ×
                  </button>
                </div>

                <div className="ringkas-detail">
                  <div>
                    <span>Uang muka diterima</span>
                    <strong>{rupiah(laporan.total_uang_muka)}</strong>
                  </div>
                  <div>
                    <span>Total realisasi</span>
                    <strong>{rupiah(laporan.total_realisasi)}</strong>
                  </div>
                  <div>
                    <span>Selisih</span>
                    <strong>{rupiah(Math.abs(Number(laporan.selisih)))}</strong>
                  </div>
                  <div>
                    <span>Tanggal lapor</span>
                    <strong style={{ fontSize: 13.5 }}>
                      {tanggalPendek(laporan.tanggal_lapor)}
                    </strong>
                  </div>
                </div>

                <div className="modal-body">
                  {laporan.status === 'DIVERIFIKASI' && (
                    <div className="kotak-info">
                      <strong>Hasil verifikasi</strong>
                      {kalimatSelisih(laporan)}
                      {laporan.catatan_verifikator && (
                        <>
                          <br />
                          Catatan: {laporan.catatan_verifikator}
                        </>
                      )}
                    </div>
                  )}

                  {laporan.status === 'REVISI' && laporan.catatan_verifikator && (
                    <div className="peringatan-plafon">
                      <Icon name="revisi" size={16} />
                      <span>
                        Dikembalikan Tim Keuangan: {laporan.catatan_verifikator}
                      </span>
                    </div>
                  )}

                  {dapatDisunting && klaimTanpaNota.length > 0 && (
                    <div className="peringatan-plafon">
                      <Icon name="peringatan" size={16} />
                      <span>
                        {klaimTanpaNota.length} klaim belum melampirkan nota padahal
                        kategorinya mewajibkan bukti. Laporan belum bisa diajukan.
                      </span>
                    </div>
                  )}

                  <section className="panel">
                    <div className="panel-head">
                      <div>
                        <h2>Ringkasan Kegiatan</h2>
                        <p>Uraian yang disusun pemohon</p>
                      </div>
                    </div>
                    <div className="panel-body">
                      <p style={{ fontSize: 13, color: 'var(--tinta-sedang)' }}>
                        {laporan.ringkasan_kegiatan}
                      </p>
                      {laporan.hasil_capaian && (
                        <p style={{ fontSize: 13, color: 'var(--redup)', marginTop: 9 }}>
                          <b>Capaian:</b> {laporan.hasil_capaian}
                        </p>
                      )}
                    </div>
                  </section>

                  {/* ── Klaim biaya & nota ── */}
                  <section className="panel">
                    <div className="panel-head">
                      <div>
                        <h2>Klaim Biaya &amp; Nota</h2>
                        <p>
                          {klaim.length} klaim · total diajukan {rupiah(totalDiajukan)}
                        </p>
                      </div>
                      {milikSaya && dapatDisunting && (
                        <button
                          type="button"
                          className="btn kecil lembut"
                          onClick={() => setFormKlaimTerbuka((buka) => !buka)}
                        >
                          <Icon name="plus" size={15} />
                          Tambah klaim
                        </button>
                      )}
                    </div>

                    {formKlaimTerbuka && (
                      <form
                        onSubmit={tambahKlaim}
                        className="panel-body"
                        style={{ borderBottom: '1px solid var(--garis)', background: 'var(--latar-lembut)' }}
                      >
                        <div className="baris-bidang">
                          <div className="bidang">
                            <label htmlFor="kategori-klaim">Kategori</label>
                            <select
                              id="kategori-klaim"
                              value={kategoriBaru}
                              onChange={(e) => setKategoriBaru(e.target.value)}
                              required
                            >
                              <option value="">— Pilih —</option>
                              {(kategori.data ?? []).map((k) => (
                                <option key={k.id} value={k.id}>
                                  {k.nama}
                                  {k.wajib_bukti ? ' (wajib nota)' : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="bidang">
                            <label htmlFor="tanggal-klaim">Tanggal transaksi</label>
                            <input
                              id="tanggal-klaim"
                              type="date"
                              value={tanggalKlaim}
                              onChange={(e) => setTanggalKlaim(e.target.value)}
                              required
                            />
                          </div>

                          <div className="bidang">
                            <label htmlFor="jumlah-klaim">Jumlah diajukan</label>
                            <input
                              id="jumlah-klaim"
                              type="number"
                              min={0}
                              step={1000}
                              value={jumlahKlaim}
                              onChange={(e) => setJumlahKlaim(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div className="bidang" style={{ marginTop: 12 }}>
                          <label htmlFor="deskripsi-klaim">Keterangan</label>
                          <input
                            id="deskripsi-klaim"
                            placeholder="mis. Tiket kereta Jakarta - Surabaya"
                            value={deskripsiKlaim}
                            onChange={(e) => setDeskripsiKlaim(e.target.value)}
                            required
                          />
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn kecil"
                            onClick={() => setFormKlaimTerbuka(false)}
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            className="btn kecil utama"
                            disabled={sedangAksi === 'klaim' || !kategoriBaru || !jumlahKlaim}
                          >
                            Simpan klaim
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="pembungkus-tabel">
                      <table className="tabel" style={{ minWidth: 640 }}>
                        <thead>
                          <tr>
                            <th>Kategori &amp; keterangan</th>
                            <th>Tanggal</th>
                            <th className="kanan">Diajukan</th>
                            <th className="kanan">Disetujui</th>
                            <th>Nota</th>
                            {milikSaya && dapatDisunting && <th />}
                          </tr>
                        </thead>
                        <tbody>
                          {klaim.map((baris) => {
                            const bukti = baris.bukti ?? []
                            const wajibNota = baris.kategoriBiaya?.wajib_bukti

                            return (
                              <tr key={baris.id}>
                                <td>
                                  <div className="sel-utama">
                                    {baris.kategoriBiaya?.nama ?? '—'}
                                  </div>
                                  <div className="sel-sekunder">{baris.deskripsi}</div>
                                  {baris.melebihi_plafon && (
                                    <span className="tanda-plafon" style={{ marginTop: 3 }}>
                                      <Icon name="peringatan" size={11} />
                                      Melampaui plafon
                                    </span>
                                  )}
                                </td>
                                <td className="sel-sekunder">
                                  {tanggalPendek(baris.tanggal_transaksi)}
                                </td>
                                <td className="kanan angka">{rupiah(baris.jumlah_diajukan)}</td>
                                <td className="kanan angka sel-utama">
                                  {baris.jumlah_disetujui === null
                                    ? '—'
                                    : rupiah(baris.jumlah_disetujui)}
                                  <div>
                                    <StatusBadge
                                      label={manusiawi(baris.status)}
                                      warna={
                                        baris.status === 'DISETUJUI'
                                          ? 'hijau'
                                          : baris.status === 'DITOLAK'
                                            ? 'merah'
                                            : baris.status === 'DISETUJUI_SEBAGIAN'
                                              ? 'kuning'
                                              : 'netral'
                                      }
                                    />
                                  </div>
                                </td>
                                <td>
                                  {bukti.length === 0 ? (
                                    <span className={wajibNota ? 'status merah' : 'status netral'}>
                                      {wajibNota ? 'Wajib, belum ada' : 'Tidak wajib'}
                                    </span>
                                  ) : (
                                    bukti.map((b) => (
                                      <a
                                        key={b.id}
                                        href={urlBerkas(b.path_file)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn-tautan"
                                        style={{ display: 'block' }}
                                      >
                                        <Icon name="file" size={13} />
                                        {b.nama_file.slice(0, 22)}
                                      </a>
                                    ))
                                  )}
                                </td>
                                {milikSaya && dapatDisunting && (
                                  <td className="kanan">
                                    <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                                      <button
                                        type="button"
                                        className="btn kecil"
                                        onClick={() => pilihBerkas(baris.id)}
                                        disabled={sedangAksi !== null}
                                      >
                                        <Icon name="unggah" size={14} />
                                        Nota
                                      </button>
                                      <button
                                        type="button"
                                        className="btn kecil bahaya"
                                        disabled={sedangAksi !== null}
                                        onClick={() =>
                                          jalankan('hapus-klaim', () =>
                                            apiHapusKlaim(laporanId, baris.id),
                                          )
                                        }
                                      >
                                        <Icon name="sampah" size={14} />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            )
                          })}

                          {klaim.length === 0 && (
                            <tr>
                              <td colSpan={6} className="sel-sekunder" style={{ textAlign: 'center' }}>
                                Belum ada klaim biaya pada laporan ini.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* Berkas dipilih lewat input tersembunyi ini. */}
                  <input
                    ref={inputBerkasRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => unggahBerkas(e.target.files?.[0])}
                  />

                  {modeVerifikasi && (
                    <FormVerifikasi
                      laporan={laporan}
                      onSelesai={(pesan) => {
                        setModeVerifikasi(false)
                        onBerubah(pesan)
                        muatUlang()
                      }}
                      onBatal={() => setModeVerifikasi(false)}
                      onGalat={onGalat}
                    />
                  )}
                </div>

                <div className="modal-kaki">
                  <span className="kiri">
                    {klaim.length} klaim · {rupiah(totalDiajukan)} diajukan
                  </span>

                  {milikSaya && dapatDisunting && (
                    <button
                      type="button"
                      className="btn utama"
                      disabled={sedangAksi !== null || klaim.length === 0}
                      onClick={() => jalankan('ajukan', () => apiAjukanLaporan(laporan.id))}
                    >
                      <Icon name="kirim" size={15} />
                      {sedangAksi === 'ajukan' ? 'Mengirim...' : 'Ajukan ke Keuangan'}
                    </button>
                  )}

                  {boleh('laporan.verifikasi') &&
                    laporan.status === 'DIAJUKAN' &&
                    !modeVerifikasi && (
                      <button
                        type="button"
                        className="btn utama"
                        onClick={() => setModeVerifikasi(true)}
                      >
                        <Icon name="check" size={15} />
                        Verifikasi nota
                      </button>
                    )}

                  {boleh('pencairan.proses') &&
                    laporan.status === 'DIVERIFIKASI' &&
                    laporan.jenis_selisih !== 'NIHIL' &&
                    !(laporan.pencairan ?? []).some((p) => p.laporan_id === laporan.id) && (
                      <button
                        type="button"
                        className="btn sukses"
                        disabled={sedangAksi !== null}
                        onClick={() =>
                          jalankan('pencairan', () => apiPencairanDariLaporan(laporan.id))
                        }
                      >
                        <Icon name="wallet" size={15} />
                        {laporan.jenis_selisih === 'KURANG_BAYAR'
                          ? 'Proses reimbursement'
                          : 'Catat pengembalian'}
                      </button>
                    )}

                  <button type="button" className="btn" onClick={onTutup}>
                    Tutup
                  </button>
                </div>
              </>
            )
          }}
        </Muatan>
      </div>
    </div>
  )
}
