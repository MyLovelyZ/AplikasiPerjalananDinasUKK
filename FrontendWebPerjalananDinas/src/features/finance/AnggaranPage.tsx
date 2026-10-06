import { useState } from 'react'
import type { FormEvent } from 'react'

import { apiBuatAnggaran, apiDaftarAnggaran, apiOpsiAnggaran } from '@/api/endpoint'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Memuat, Muatan } from '@/components/ui/Keadaan'
import { KotakGalat, Modal, PesanKolom } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Paginasi } from '@/components/ui/Paginasi'
import { StatCard } from '@/components/ui/StatCard'
import { NAMA_BULAN } from '@/constants/label'
import { useHalaman } from '@/hooks/useHalaman'
import { useKirim } from '@/hooks/useKirim'
import { usePermintaan } from '@/hooks/usePermintaan'
import { rupiah, rupiahRingkas } from '@/utils/format'

interface AnggaranPageProps {
  onSukses: (pesan: string) => void
  penandaSegar: number
}

const TAHUN_INI = new Date().getFullYear()

const kelasBilah = (persen: number) => (persen >= 100 ? 'lewat' : persen >= 80 ? 'penuh' : '')

export function AnggaranPage({ onSukses, penandaSegar }: AnggaranPageProps) {
  const [tahun, setTahun] = useState(TAHUN_INI)
  const [halaman, setHalaman] = useHalaman(tahun)
  const [formTerbuka, setFormTerbuka] = useState(false)

  const { data, memuat, galat, muatUlang } = usePermintaan(
    () => apiDaftarAnggaran({ year: tahun, page: halaman }),
    [tahun, halaman, penandaSegar],
  )

  return (
    <>
      <PageHeader
        eyebrow="Keuangan"
        title="Anggaran"
        description="Pagu perjalanan dinas per departemen, tahunan atau bulanan. Biaya perjalanan dikomitkan saat Keuangan menyetujuinya."
        action={
          <button type="button" className="btn utama" onClick={() => setFormTerbuka(true)}>
            <Icon name="plus" size={17} />
            Alokasikan Anggaran
          </button>
        }
      />

      {data && (
        <div className="grid-stat">
          <StatCard icon="wallet" title="Total pagu" value={rupiahRingkas(data.summary.amount)} note={`Tahun ${data.summary.year}`} />
          <StatCard
            icon="check"
            warna="kuning"
            title="Terkomit"
            value={rupiahRingkas(data.summary.committed_amount)}
            note="Perjalanan yang sudah disetujui"
          />
          <StatCard
            icon="chart"
            warna="ungu"
            title="Terealisasi"
            value={rupiahRingkas(data.summary.spent_amount)}
            note="Pengeluaran terverifikasi"
          />
          <StatCard
            icon="grid"
            warna="hijau"
            title="Sisa"
            value={rupiahRingkas(data.summary.remaining_amount)}
            note="Pagu dikurangi komitmen"
          />
        </div>
      )}

      <section className="panel">
        <div className="bilah-alat">
          <select value={tahun} onChange={(e) => setTahun(Number(e.target.value))} aria-label="Tahun">
            {[TAHUN_INI - 1, TAHUN_INI, TAHUN_INI + 1].map((t) => (
              <option key={t} value={t}>
                Tahun {t}
              </option>
            ))}
          </select>
          <button type="button" className="btn kecil dorong" onClick={muatUlang}>
            <Icon name="segarkan" size={15} />
            Segarkan
          </button>
        </div>

        <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={6}>
          {(hasil) =>
            hasil.data.length === 0 ? (
              <Kosong
                ikon="wallet"
                judul={`Belum ada anggaran ${tahun}`}
                pesan="Alokasikan anggaran agar pengajuan departemen dapat diverifikasi."
              />
            ) : (
              <>
                <div className="pembungkus-tabel">
                  <table className="tabel">
                    <thead>
                      <tr>
                        <th>Departemen</th>
                        <th>Periode</th>
                        <th className="kanan">Pagu</th>
                        <th className="kanan">Terkomit</th>
                        <th className="kanan">Sisa</th>
                        <th style={{ width: 180 }}>Serapan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasil.data.map((a) => {
                        const persen = a.utilization_percentage ?? 0
                        return (
                          <tr key={a.id}>
                            <td>
                              <div className="sel-utama">{a.department?.name ?? '—'}</div>
                              {a.notes && <div className="sel-sekunder">{a.notes}</div>}
                            </td>
                            <td>{a.month ? `${NAMA_BULAN[a.month - 1]} ${a.year}` : `Tahunan ${a.year}`}</td>
                            <td className="kanan angka">{rupiah(a.amount)}</td>
                            <td className="kanan angka">{rupiah(a.committed_amount)}</td>
                            <td className="kanan angka sel-utama">{rupiah(a.remaining_amount)}</td>
                            <td>
                              <div className="bilah" title={`${persen}%`}>
                                <i className={kelasBilah(persen)} style={{ width: `${Math.min(100, persen)}%` }} />
                              </div>
                              <small className="sel-sekunder">{persen}%</small>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <Paginasi meta={hasil.meta} satuan="anggaran" onPindah={setHalaman} />
              </>
            )
          }
        </Muatan>
      </section>

      {formTerbuka && (
        <ModalAnggaran
          tahunAwal={tahun}
          onTutup={() => setFormTerbuka(false)}
          onSelesai={(pesan) => {
            setFormTerbuka(false)
            onSukses(pesan)
          }}
        />
      )}
    </>
  )
}

function ModalAnggaran({
  tahunAwal,
  onTutup,
  onSelesai,
}: {
  tahunAwal: number
  onTutup: () => void
  onSelesai: (pesan: string) => void
}) {
  const opsi = usePermintaan(() => apiOpsiAnggaran(), [])
  const [departemen, setDepartemen] = useState('')
  const [tahun, setTahun] = useState(tahunAwal)
  const [bulan, setBulan] = useState('')
  const [jumlah, setJumlah] = useState('')
  const [catatan, setCatatan] = useState('')
  const { mengirim, galat, galatKolom, jalankan } = useKirim()

  const kirim = async (peristiwa: FormEvent) => {
    peristiwa.preventDefault()
    const hasil = await jalankan(() =>
      apiBuatAnggaran({
        department_id: Number(departemen),
        year: tahun,
        month: bulan ? Number(bulan) : null,
        amount: Number(jumlah),
        notes: catatan.trim() || undefined,
      }),
    )
    if (hasil) onSelesai(hasil.message)
  }

  return (
    <Modal
      judul="Alokasikan anggaran"
      keterangan="Tanpa bulan berarti anggaran berlaku setahun penuh."
      ukuran="sempit"
      onTutup={onTutup}
      onKirim={kirim}
      kaki={
        <>
          <button type="button" className="btn" onClick={onTutup} disabled={mengirim}>
            Batal
          </button>
          <button type="submit" className="btn utama" disabled={mengirim || !departemen || !jumlah}>
            {mengirim ? 'Menyimpan...' : 'Simpan'}
          </button>
        </>
      }
    >
      <KotakGalat pesan={galat} />
      {opsi.memuat && !opsi.data ? (
        <Memuat baris={4} />
      ) : (
        <>
          <div className="bidang">
            <label htmlFor="departemen">
              Departemen<span className="wajib">*</span>
            </label>
            <select id="departemen" value={departemen} onChange={(e) => setDepartemen(e.target.value)} required>
              <option value="">— Pilih —</option>
              {(opsi.data?.departments ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
            <PesanKolom pesan={galatKolom.department_id} />
          </div>
          <div className="baris-bidang">
            <div className="bidang">
              <label htmlFor="tahun">Tahun</label>
              <select id="tahun" value={tahun} onChange={(e) => setTahun(Number(e.target.value))}>
                {(opsi.data?.years ?? [tahunAwal]).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="bidang">
              <label htmlFor="bulan">Bulan</label>
              <select id="bulan" value={bulan} onChange={(e) => setBulan(e.target.value)}>
                <option value="">Setahun penuh</option>
                {NAMA_BULAN.map((nama, indeks) => (
                  <option key={nama} value={indeks + 1}>
                    {nama}
                  </option>
                ))}
              </select>
              <PesanKolom pesan={galatKolom.month} />
            </div>
          </div>
          <div className="bidang">
            <label htmlFor="jumlah">
              Jumlah pagu (Rp)<span className="wajib">*</span>
            </label>
            <input
              id="jumlah"
              type="number"
              min={1}
              step={1000000}
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value)}
              required
            />
            <PesanKolom pesan={galatKolom.amount} />
          </div>
          <div className="bidang">
            <label htmlFor="catatan-anggaran">Catatan</label>
            <textarea id="catatan-anggaran" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </div>
        </>
      )}
    </Modal>
  )
}
