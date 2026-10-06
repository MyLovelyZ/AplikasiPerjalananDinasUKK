import { useState } from 'react'

import {
  apiAjukanPerjalanan,
  apiBatalkanPerjalanan,
  apiDetailPerjalananAtasan,
  apiDetailPerjalananKeuangan,
  apiDetailPerjalananPegawai,
} from '@/api/endpoint'
import type { DetailPerjalanan, Perjalanan } from '@/api/tipe'
import { Icon } from '@/components/ui/Icon'
import { Muatan } from '@/components/ui/Keadaan'
import { KotakGalat, Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  LABEL_JENIS_DOKUMEN,
  LABEL_JENIS_PENCAIRAN,
  LABEL_JENIS_PERJALANAN,
  LABEL_KATEGORI_BIAYA,
  LABEL_METODE_BAYAR,
  LABEL_PENYELESAIAN,
  LABEL_TAHAP,
  LABEL_TRANSPORTASI,
  RUPA_STATUS_LAPORAN,
  RUPA_STATUS_PENCAIRAN,
  RUPA_STATUS_PERJALANAN,
} from '@/constants/label'
import { PanelKeputusanAtasan, PanelKeputusanKeuangan } from '@/features/trips/components/PanelKeputusan'
import { useKirim } from '@/hooks/useKirim'
import { usePermintaan } from '@/hooks/usePermintaan'
import { rentangTanggal, rupiah, tanggal, ukuranBerkas, waktu } from '@/utils/format'

export type SudutPandang = 'employee' | 'supervisor' | 'finance'

const PENGAMBIL: Record<SudutPandang, (id: number) => Promise<DetailPerjalanan>> = {
  employee: apiDetailPerjalananPegawai,
  supervisor: apiDetailPerjalananAtasan,
  finance: apiDetailPerjalananKeuangan,
}

interface DetailPerjalananModalProps {
  perjalananId: number
  sudut: SudutPandang
  onTutup: () => void
  /** Aksi berhasil: pesan untuk toast, lalu daftar di halaman disegarkan. */
  onBerubah: (pesan: string) => void
  onUbah?: (perjalanan: Perjalanan) => void
  onBukaLaporan?: (perjalanan: Perjalanan) => void
}

/** Langkah yang sedang ditunggu, ditampilkan sebagai titik terakhir pada linimasa. */
function langkahBerikutnya(p: Perjalanan): string | null {
  if (p.status === 'submitted') return 'Menunggu keputusan atasan'
  if (p.status === 'supervisor_approved') return 'Menunggu verifikasi anggaran oleh Keuangan'
  if (p.status === 'approved' && p.expense_report?.status === 'submitted')
    return 'Menunggu verifikasi laporan biaya oleh Keuangan'
  return null
}

export function DetailPerjalananModal({
  perjalananId,
  sudut,
  onTutup,
  onBerubah,
  onUbah,
  onBukaLaporan,
}: DetailPerjalananModalProps) {
  const { data, memuat, galat, muatUlang } = usePermintaan(() => PENGAMBIL[sudut](perjalananId), [
    perjalananId,
    sudut,
  ])
  const aksi = useKirim()
  const [konfirmasiBatal, setKonfirmasiBatal] = useState(false)

  const selesai = (pesan: string) => {
    onBerubah(pesan)
    muatUlang()
  }

  const ajukan = async (id: number) => {
    const hasil = await aksi.jalankan(() => apiAjukanPerjalanan(id))
    if (hasil) selesai(hasil.message)
  }

  const batalkan = async (id: number) => {
    const hasil = await aksi.jalankan(() => apiBatalkanPerjalanan(id))
    setKonfirmasiBatal(false)
    if (hasil) selesai(hasil.message)
  }

  const p = data?.data

  return (
    <Modal
      judul={p ? `${p.request_number} · ${p.purpose}` : 'Detail perjalanan dinas'}
      keterangan={
        p ? (
          <StatusBadge {...RUPA_STATUS_PERJALANAN[p.status]} />
        ) : (
          'Memuat data...'
        )
      }
      ukuran="lebar"
      onTutup={onTutup}
      sisipan={
        p && (
          <div className="ringkas-detail">
            <div>
              <span>Tujuan</span>
              <strong>{p.destination}</strong>
            </div>
            <div>
              <span>Tanggal</span>
              <strong>{rentangTanggal(p.departure_date, p.return_date)}</strong>
            </div>
            <div>
              <span>Estimasi biaya</span>
              <strong>{rupiah(p.estimated_cost)}</strong>
            </div>
            <div>
              <span>{p.advance_approved === null ? 'Uang muka diminta' : 'Uang muka disetujui'}</span>
              <strong>{rupiah(p.advance_approved ?? p.advance_requested)}</strong>
            </div>
          </div>
        )
      }
      kaki={
        <>
          {sudut === 'employee' && p && (
            <>
              {(p.status === 'approved' || p.status === 'completed') && onBukaLaporan && (
                <button type="button" className="btn lembut" onClick={() => onBukaLaporan(p)}>
                  <Icon name="file" size={15} />
                  Laporan biaya
                </button>
              )}
              {p.is_cancellable &&
                (konfirmasiBatal ? (
                  <>
                    <span className="kiri">Batalkan pengajuan ini?</span>
                    <button type="button" className="btn" onClick={() => setKonfirmasiBatal(false)}>
                      Tidak
                    </button>
                    <button
                      type="button"
                      className="btn bahaya"
                      disabled={aksi.mengirim}
                      onClick={() => batalkan(p.id)}
                    >
                      Ya, batalkan
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn bahaya" onClick={() => setKonfirmasiBatal(true)}>
                    Batalkan
                  </button>
                ))}
              {p.is_editable && onUbah && !konfirmasiBatal && (
                <button type="button" className="btn" onClick={() => onUbah(p)}>
                  <Icon name="revisi" size={15} />
                  Ubah
                </button>
              )}
              {p.status === 'draft' && !konfirmasiBatal && (
                <button type="button" className="btn utama" disabled={aksi.mengirim} onClick={() => ajukan(p.id)}>
                  <Icon name="kirim" size={15} />
                  {aksi.mengirim ? 'Mengirim...' : 'Ajukan ke atasan'}
                </button>
              )}
            </>
          )}
          <button type="button" className="btn" onClick={onTutup}>
            Tutup
          </button>
        </>
      }
    >
      <KotakGalat pesan={aksi.galat} />

      <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={8}>
        {(detail) => <IsiDetail detail={detail} sudut={sudut} onSelesai={selesai} />}
      </Muatan>
    </Modal>
  )
}

function IsiDetail({
  detail,
  sudut,
  onSelesai,
}: {
  detail: DetailPerjalanan
  sudut: SudutPandang
  onSelesai: (pesan: string) => void
}) {
  const p = detail.data
  const laporan = p.expense_report
  const menunggu = langkahBerikutnya(p)

  return (
    <>
      {sudut === 'supervisor' && detail.can_review && <PanelKeputusanAtasan perjalanan={p} onSelesai={onSelesai} />}

      {sudut === 'finance' && p.finance_stage && (
        <PanelKeputusanKeuangan perjalanan={p} pemeriksaan={detail.budget_check ?? null} onSelesai={onSelesai} />
      )}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Informasi Perjalanan</h2>
            <p>Data pokok yang diisi pemohon</p>
          </div>
        </div>
        <div className="panel-body" style={{ display: 'grid', gap: 9 }}>
          {p.requester && (
            <div className="pasangan">
              <span>Pemohon</span>
              <b>
                {p.requester.name}
                {p.department ? ` · ${p.department.name}` : ''}
              </b>
            </div>
          )}
          <div className="pasangan">
            <span>Jenis perjalanan</span>
            <b>{LABEL_JENIS_PERJALANAN[p.trip_type]}</b>
          </div>
          <div className="pasangan">
            <span>Transportasi</span>
            <b>{LABEL_TRANSPORTASI[p.transportation]}</b>
          </div>
          <div className="pasangan">
            <span>Lama perjalanan</span>
            <b>{p.duration_days} hari</b>
          </div>
          {p.submitted_at && (
            <div className="pasangan">
              <span>Diajukan pada</span>
              <b>{waktu(p.submitted_at)}</b>
            </div>
          )}
          {p.budget && (
            <div className="pasangan">
              <span>Dibebankan ke anggaran</span>
              <b>{p.budget.period_label}</b>
            </div>
          )}
          {p.description && (
            <div className="pasangan" style={{ alignItems: 'flex-start' }}>
              <span>Uraian kegiatan</span>
              <b style={{ maxWidth: '62%', fontWeight: 500, whiteSpace: 'pre-line' }}>{p.description}</b>
            </div>
          )}
          {p.notes && (
            <div className="pasangan" style={{ alignItems: 'flex-start' }}>
              <span>Catatan pemohon</span>
              <b style={{ maxWidth: '62%', fontWeight: 500, whiteSpace: 'pre-line' }}>{p.notes}</b>
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Rincian Estimasi Biaya</h2>
            <p>{p.cost_estimates?.length ?? 0} baris biaya</p>
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
              {(p.cost_estimates ?? []).map((baris) => (
                <tr key={baris.id}>
                  <td className="sel-utama">{LABEL_KATEGORI_BIAYA[baris.category]}</td>
                  <td className="sel-sekunder">{baris.description ?? '—'}</td>
                  <td className="kanan angka">{baris.quantity}</td>
                  <td className="kanan angka">{rupiah(baris.unit_price)}</td>
                  <td className="kanan angka sel-utama">{rupiah(baris.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {(p.documents ?? []).length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Dokumen Pendukung</h2>
              <p>Tautan berlaku 30 menit sejak halaman dibuka</p>
            </div>
          </div>
          <div className="daftar">
            {(p.documents ?? []).map((dok) => (
              <a key={dok.id} className="daftar-baris" href={dok.url} target="_blank" rel="noreferrer">
                <span className="isi">
                  <b>{dok.original_name}</b>
                  <small>
                    {LABEL_JENIS_DOKUMEN[dok.type]} · {ukuranBerkas(dok.size)}
                  </small>
                </span>
                <Icon name="download" size={16} />
              </a>
            ))}
          </div>
        </section>
      )}

      {((p.approvals ?? []).length > 0 || menunggu) && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Riwayat Persetujuan</h2>
              <p>Keputusan atasan dan Keuangan</p>
            </div>
          </div>
          <div className="linimasa">
            {(p.approvals ?? []).map((keputusan) => {
              const setuju = keputusan.decision === 'approved'
              return (
                <div className="linimasa-item" key={keputusan.id}>
                  <div className={`linimasa-titik ${setuju ? 'hijau' : 'merah'}`}>
                    <Icon name={setuju ? 'check' : 'tolak'} size={14} />
                  </div>
                  <div className="linimasa-isi">
                    <b>
                      {LABEL_TAHAP[keputusan.stage]} · {setuju ? 'Disetujui' : 'Ditolak'}
                    </b>
                    <small>
                      {keputusan.approver?.name ?? '—'} · {waktu(keputusan.decided_at)}
                    </small>
                    {keputusan.note && <div className="catatan">{keputusan.note}</div>}
                  </div>
                </div>
              )
            })}
            {menunggu && (
              <div className="linimasa-item">
                <div className="linimasa-titik kuning">
                  <Icon name="clock" size={14} />
                </div>
                <div className="linimasa-isi">
                  <b>{menunggu}</b>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {laporan && !(sudut === 'finance' && p.finance_stage === 'expense_report') && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Laporan Biaya</h2>
              <p>Pertanggungjawaban setelah perjalanan</p>
            </div>
            <StatusBadge {...RUPA_STATUS_LAPORAN[laporan.status]} />
          </div>
          <div className="panel-body" style={{ display: 'grid', gap: 9 }}>
            <div className="pasangan">
              <span>Total diklaim</span>
              <b>{rupiah(laporan.total_claimed)}</b>
            </div>
            {laporan.total_approved !== null && (
              <div className="pasangan">
                <span>Total disetujui</span>
                <b>{rupiah(laporan.total_approved)}</b>
              </div>
            )}
            {laporan.settlement_type && (
              <div className="pasangan">
                <span>Penyelesaian</span>
                <b>
                  {LABEL_PENYELESAIAN[laporan.settlement_type]}
                  {laporan.difference ? ` (${rupiah(Math.abs(laporan.difference))})` : ''}
                </b>
              </div>
            )}
            {laporan.verification_note && (
              <div className="pasangan" style={{ alignItems: 'flex-start' }}>
                <span>Catatan verifikator</span>
                <b style={{ maxWidth: '62%', fontWeight: 500 }}>{laporan.verification_note}</b>
              </div>
            )}
          </div>
        </section>
      )}

      {(p.disbursements ?? []).length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Pencairan Dana</h2>
              <p>Uang muka, reimbursement, dan pengembalian</p>
            </div>
          </div>
          <div className="daftar">
            {(p.disbursements ?? []).map((cair) => (
              <div className="daftar-baris" key={cair.id}>
                <span className="isi">
                  <b>{LABEL_JENIS_PENCAIRAN[cair.type]}</b>
                  <small>
                    {cair.method ? LABEL_METODE_BAYAR[cair.method] : 'Belum dibayar'}
                    {cair.paid_at ? ` · ${tanggal(cair.paid_at)}` : ''}
                    {cair.reference_number ? ` · Ref ${cair.reference_number}` : ''}
                  </small>
                </span>
                <b className="angka">{rupiah(cair.amount)}</b>
                <StatusBadge {...RUPA_STATUS_PENCAIRAN[cair.status]} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
