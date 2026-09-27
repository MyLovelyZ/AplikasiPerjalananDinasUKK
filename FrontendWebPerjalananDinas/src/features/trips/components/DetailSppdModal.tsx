import { useState } from 'react'

import {
  apiAjukanSppd,
  apiBatalkanSppd,
  apiCairkanUangMuka,
  apiDetailSppd,
  apiHapusSppd,
  apiSelesaiPerjalanan,
} from '@/api/endpoint'
import { Icon } from '@/components/ui/Icon'
import { Muatan } from '@/components/ui/Keadaan'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/auth/useAuth'
import { usePermintaan } from '@/hooks/usePermintaan'
import {
  manusiawi,
  rentangTanggal,
  rupiah,
  rupaStatusSppd,
  tanggal,
  waktu,
  warnaPencairan,
  warnaPersetujuan,
} from '@/utils/format'
import type { Persetujuan, Sppd } from '@/api/tipe'

interface DetailSppdModalProps {
  sppdId: number
  onTutup: () => void
  /** Dipanggil setiap aksi berhasil, agar daftar di belakang ikut disegarkan. */
  onBerubah: (pesan: string) => void
  onGalat: (penyebab: unknown) => void
  /** Membuka layar laporan pertanggungjawaban untuk SPPD ini. */
  onBukaLaporan: (sppd: Sppd) => void
}

/** Ikon linimasa mengikuti keputusan yang diambil pada tahap tersebut. */
function rupaTahap(status: Persetujuan['status']) {
  switch (status) {
    case 'DISETUJUI':
    case 'DIDELEGASIKAN':
      return { ikon: 'check' as const, warna: 'hijau' }
    case 'DITOLAK':
      return { ikon: 'tolak' as const, warna: 'merah' }
    case 'REVISI':
      return { ikon: 'revisi' as const, warna: 'kuning' }
    case 'MENUNGGU':
      return { ikon: 'clock' as const, warna: 'kuning' }
    default:
      return { ikon: 'chevron' as const, warna: '' }
  }
}

/**
 * Layar detail satu SPPD: ringkasan, rincian biaya, dan linimasa persetujuan,
 * lengkap dengan aksi yang tersedia menurut status dan hak akses.
 */
export function DetailSppdModal({
  sppdId,
  onTutup,
  onBerubah,
  onGalat,
  onBukaLaporan,
}: DetailSppdModalProps) {
  const { boleh, profil } = useAuth()
  const { data, memuat, galat, muatUlang } = usePermintaan(() => apiDetailSppd(sppdId), [sppdId])
  const [sedangAksi, setSedangAksi] = useState<string | null>(null)

  /** Menjalankan satu aksi, mengurus status tombol dan penyegaran data. */
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

  const batalkan = async (sppd: Sppd) => {
    const alasan = window.prompt('Alasan pembatalan:')
    if (!alasan?.trim()) return
    await jalankan('batal', () => apiBatalkanSppd(sppd.id, alasan.trim()))
  }

  const hapus = async (sppd: Sppd) => {
    if (!window.confirm(`Hapus draf ${sppd.nomor_sppd}? Tindakan ini tidak dapat dibatalkan.`)) {
      return
    }
    setSedangAksi('hapus')
    try {
      const { pesan } = await apiHapusSppd(sppd.id)
      onBerubah(pesan)
      onTutup()
    } catch (penyebab: unknown) {
      onGalat(penyebab)
    } finally {
      setSedangAksi(null)
    }
  }

  return (
    <div className="lapisan-modal" role="dialog" aria-modal="true" aria-label="Detail SPPD">
      <div className="modal lebar">
        <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={6}>
          {(sppd) => {
            const rupa = rupaStatusSppd(sppd.status)
            const milikSaya = String(sppd.karyawan_id) === String(profil?.karyawan?.id)
            const adaPelanggaran = (sppd.rincianBiaya ?? []).some((r) => r.melebihi_plafon)

            return (
              <>
                <div className="modal-head">
                  <div>
                    <h2>{sppd.nomor_sppd}</h2>
                    <p>{sppd.keperluan}</p>
                    <div style={{ marginTop: 7 }}>
                      <StatusBadge label={rupa.label} warna={rupa.warna} />
                    </div>
                  </div>
                  <button type="button" className="tombol-tutup" onClick={onTutup} aria-label="Tutup">
                    ×
                  </button>
                </div>

                <div className="ringkas-detail">
                  <div>
                    <span>Tujuan</span>
                    <strong>
                      {sppd.lokasiTujuan?.nama_kota ?? sppd.tujuan_lainnya ?? '—'}
                    </strong>
                  </div>
                  <div>
                    <span>Tanggal</span>
                    <strong style={{ fontSize: 13.5 }}>
                      {rentangTanggal(sppd.tanggal_berangkat, sppd.tanggal_kembali)}
                    </strong>
                  </div>
                  <div>
                    <span>Estimasi biaya</span>
                    <strong>{rupiah(sppd.estimasi_biaya)}</strong>
                  </div>
                  <div>
                    <span>Uang muka</span>
                    <strong>
                      {rupiah(
                        Number(sppd.uang_muka_disetujui) > 0
                          ? sppd.uang_muka_disetujui
                          : sppd.uang_muka_diminta,
                      )}
                    </strong>
                  </div>
                </div>

                <div className="modal-body">
                  {adaPelanggaran && (
                    <div className="peringatan-plafon">
                      <Icon name="peringatan" size={16} />
                      <span>
                        Sebagian rincian biaya melampaui plafon travel policy. Pengajuan
                        tetap dapat diproses, tetapi penyetuju akan melihat penandanya.
                      </span>
                    </div>
                  )}

                  {/* ── Informasi pokok ── */}
                  <section className="panel">
                    <div className="panel-head">
                      <div>
                        <h2>Informasi Perjalanan</h2>
                        <p>Data pokok yang diisi pemohon</p>
                      </div>
                    </div>
                    <div className="panel-body" style={{ display: 'grid', gap: 9 }}>
                      <div className="pasangan">
                        <span>Pemohon</span>
                        <b>
                          {sppd.pemohon?.nama_lengkap ?? '—'} · {sppd.departemen?.nama ?? '—'}
                        </b>
                      </div>
                      <div className="pasangan">
                        <span>Jenis perjalanan</span>
                        <b>{manusiawi(sppd.jenis_perjalanan)}</b>
                      </div>
                      <div className="pasangan">
                        <span>Moda transportasi</span>
                        <b>{manusiawi(sppd.moda_transportasi)}</b>
                      </div>
                      <div className="pasangan">
                        <span>Lama perjalanan</span>
                        <b>{sppd.jumlah_hari} hari</b>
                      </div>
                      {sppd.tanggal_pengajuan && (
                        <div className="pasangan">
                          <span>Diajukan pada</span>
                          <b>{tanggal(sppd.tanggal_pengajuan)}</b>
                        </div>
                      )}
                      {sppd.agenda && (
                        <div className="pasangan" style={{ alignItems: 'flex-start' }}>
                          <span>Agenda</span>
                          <b style={{ maxWidth: '60%', fontWeight: 500 }}>{sppd.agenda}</b>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* ── Rincian biaya ── */}
                  <section className="panel">
                    <div className="panel-head">
                      <div>
                        <h2>Rincian Estimasi Biaya</h2>
                        <p>{(sppd.rincianBiaya ?? []).length} baris biaya</p>
                      </div>
                    </div>
                    <div className="pembungkus-tabel">
                      <table className="tabel" style={{ minWidth: 560 }}>
                        <thead>
                          <tr>
                            <th>Kategori</th>
                            <th>Keterangan</th>
                            <th className="kanan">Jumlah</th>
                            <th className="kanan">Harga satuan</th>
                            <th className="kanan">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(sppd.rincianBiaya ?? []).map((baris) => (
                            <tr key={baris.id}>
                              <td className="sel-utama">
                                {baris.kategoriBiaya?.nama ?? '—'}
                                {baris.melebihi_plafon && (
                                  <div style={{ marginTop: 3 }}>
                                    <span className="tanda-plafon">
                                      <Icon name="peringatan" size={11} />
                                      Melampaui plafon
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="sel-sekunder">{baris.deskripsi ?? '—'}</td>
                              <td className="kanan angka">
                                {Number(baris.kuantitas)} {baris.satuan}
                              </td>
                              <td className="kanan angka">{rupiah(baris.harga_satuan)}</td>
                              <td className="kanan angka sel-utama">{rupiah(baris.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* ── Linimasa persetujuan ── */}
                  {(sppd.persetujuan ?? []).length > 0 && (
                    <section className="panel">
                      <div className="panel-head">
                        <div>
                          <h2>Alur Persetujuan</h2>
                          <p>
                            {sppd.tahap_saat_ini > 0
                              ? `Sedang pada tahap ke-${sppd.tahap_saat_ini}`
                              : 'Belum berjalan'}
                          </p>
                        </div>
                      </div>
                      <div className="linimasa">
                        {(sppd.persetujuan ?? []).map((tahap) => {
                          const bentuk = rupaTahap(tahap.status)
                          return (
                            <div className="linimasa-item" key={tahap.id}>
                              <div className={`linimasa-titik ${bentuk.warna}`}>
                                <Icon name={bentuk.ikon} size={14} />
                              </div>
                              <div className="linimasa-isi">
                                <b>
                                  Tahap {tahap.urutan} ·{' '}
                                  {tahap.tahap?.nama_tahap ?? manusiawi(tahap.status)}
                                </b>
                                <small>
                                  {tahap.penyetuju?.nama_lengkap ?? 'Penyetuju'}
                                  {tahap.penyetujuAsli &&
                                    ` (delegasi dari ${tahap.penyetujuAsli.nama_lengkap})`}
                                  {tahap.tanggal_aksi ? ` · ${waktu(tahap.tanggal_aksi)}` : ''}
                                </small>
                                <div style={{ marginTop: 5 }}>
                                  <StatusBadge
                                    label={manusiawi(tahap.status)}
                                    warna={warnaPersetujuan(tahap.status)}
                                  />
                                </div>
                                {tahap.catatan && <div className="catatan">{tahap.catatan}</div>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  )}

                  {/* ── Pencairan dana ── */}
                  {(sppd.pencairan ?? []).length > 0 && (
                    <section className="panel">
                      <div className="panel-head">
                        <div>
                          <h2>Pencairan Dana</h2>
                          <p>Uang muka, reimbursement, dan pengembalian</p>
                        </div>
                      </div>
                      <div className="daftar">
                        {(sppd.pencairan ?? []).map((p) => (
                          <div className="daftar-baris" key={p.id}>
                            <span className="isi">
                              <b>{manusiawi(p.jenis)}</b>
                              <small>
                                {manusiawi(p.metode)}
                                {p.tanggal_pencairan ? ` · ${tanggal(p.tanggal_pencairan)}` : ''}
                                {p.referensi_payroll ? ` · Ref ${p.referensi_payroll}` : ''}
                              </small>
                            </span>
                            <b className="angka">{rupiah(p.jumlah)}</b>
                            <StatusBadge label={manusiawi(p.status)} warna={warnaPencairan(p.status)} />
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>

                <div className="modal-kaki">
                  <span className="kiri">
                    {sppd.laporan
                      ? `Laporan ${sppd.laporan.nomor_laporan}`
                      : 'Belum ada laporan pertanggungjawaban'}
                  </span>

                  {/* Aksi pemohon */}
                  {milikSaya && ['DRAFT', 'REVISI'].includes(sppd.status) && (
                    <button
                      type="button"
                      className="btn utama"
                      disabled={sedangAksi !== null}
                      onClick={() => jalankan('ajukan', () => apiAjukanSppd(sppd.id))}
                    >
                      <Icon name="kirim" size={15} />
                      {sedangAksi === 'ajukan' ? 'Mengirim...' : 'Ajukan'}
                    </button>
                  )}

                  {milikSaya && sppd.status === 'DRAFT' && (
                    <button
                      type="button"
                      className="btn bahaya"
                      disabled={sedangAksi !== null}
                      onClick={() => hapus(sppd)}
                    >
                      <Icon name="sampah" size={15} />
                      Hapus draf
                    </button>
                  )}

                  {milikSaya &&
                    !['DRAFT', 'SELESAI', 'DITOLAK', 'DIBATALKAN'].includes(sppd.status) && (
                      <button
                        type="button"
                        className="btn bahaya"
                        disabled={sedangAksi !== null}
                        onClick={() => batalkan(sppd)}
                      >
                        Batalkan
                      </button>
                    )}

                  {milikSaya && ['DISETUJUI', 'DALAM_PERJALANAN'].includes(sppd.status) && (
                    <button
                      type="button"
                      className="btn sukses"
                      disabled={sedangAksi !== null}
                      onClick={() => jalankan('selesai', () => apiSelesaiPerjalanan(sppd.id))}
                    >
                      <Icon name="check" size={15} />
                      Perjalanan selesai
                    </button>
                  )}

                  {milikSaya && sppd.status === 'MENUNGGU_LAPORAN' && !sppd.laporan && (
                    <button type="button" className="btn utama" onClick={() => onBukaLaporan(sppd)}>
                      <Icon name="file" size={15} />
                      Susun laporan
                    </button>
                  )}

                  {sppd.laporan && (
                    <button type="button" className="btn lembut" onClick={() => onBukaLaporan(sppd)}>
                      <Icon name="file" size={15} />
                      Buka laporan
                    </button>
                  )}

                  {/* Aksi Tim Keuangan */}
                  {boleh('pencairan.proses') &&
                    sppd.status === 'DISETUJUI' &&
                    Number(sppd.uang_muka_disetujui) === 0 &&
                    Number(sppd.uang_muka_diminta) > 0 && (
                      <button
                        type="button"
                        className="btn utama"
                        disabled={sedangAksi !== null}
                        onClick={() =>
                          jalankan('uang-muka', () =>
                            apiCairkanUangMuka(sppd.id, Number(sppd.uang_muka_diminta)),
                          )
                        }
                      >
                        <Icon name="wallet" size={15} />
                        {sedangAksi === 'uang-muka' ? 'Memproses...' : 'Cairkan uang muka'}
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
