import { useState } from 'react'

import { apiDaftarPerjalanan } from '@/api/endpoint'
import type { StatusPerjalanan } from '@/api/tipe'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Muatan } from '@/components/ui/Keadaan'
import { PageHeader } from '@/components/ui/PageHeader'
import { Paginasi } from '@/components/ui/Paginasi'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { RUPA_STATUS_PERJALANAN } from '@/constants/label'
import { useHalaman } from '@/hooks/useHalaman'
import { usePermintaan } from '@/hooks/usePermintaan'
import { rentangTanggal, rupiah } from '@/utils/format'

interface TripsPageProps {
  pencarian: string
  onBuatPerjalanan: () => void
  onBukaPerjalanan: (id: number) => void
  penandaSegar: number
}

export function TripsPage({ pencarian, onBuatPerjalanan, onBukaPerjalanan, penandaSegar }: TripsPageProps) {
  const [status, setStatus] = useState<StatusPerjalanan | ''>('')
  const [halaman, setHalaman] = useHalaman(status, pencarian)

  const { data, memuat, galat, muatUlang } = usePermintaan(
    () => apiDaftarPerjalanan({ page: halaman, per_page: 12, status, search: pencarian }),
    [halaman, status, pencarian, penandaSegar],
  )

  return (
    <>
      <PageHeader
        eyebrow="Pengajuan"
        title="Perjalanan Saya"
        description="Riwayat pengajuan perjalanan dinas Anda beserta status terkininya."
        action={
          <button type="button" className="btn utama" onClick={onBuatPerjalanan}>
            <Icon name="plus" size={17} />
            Ajukan Perjalanan
          </button>
        }
      />

      <section className="panel">
        <div className="bilah-alat">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusPerjalanan | '')}
            aria-label="Saring berdasarkan status"
          >
            <option value="">Semua status</option>
            {Object.entries(RUPA_STATUS_PERJALANAN).map(([nilai, rupa]) => (
              <option key={nilai} value={nilai}>
                {rupa.label}
              </option>
            ))}
          </select>

          {pencarian && <span className="status biru">Pencarian: “{pencarian}”</span>}

          <button type="button" className="btn kecil dorong" onClick={muatUlang}>
            <Icon name="segarkan" size={15} />
            Segarkan
          </button>
        </div>

        <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={6}>
          {(hasil) =>
            hasil.data.length === 0 ? (
              <Kosong
                ikon="plane"
                judul="Tidak ada perjalanan"
                pesan={
                  pencarian || status
                    ? 'Tidak ada data yang cocok dengan penyaring saat ini.'
                    : 'Belum ada pengajuan perjalanan dinas. Mulai dengan membuat pengajuan baru.'
                }
                aksi={
                  !pencarian && !status ? (
                    <button type="button" className="btn kecil utama" onClick={onBuatPerjalanan}>
                      <Icon name="plus" size={15} />
                      Ajukan sekarang
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <div className="pembungkus-tabel">
                  <table className="tabel">
                    <thead>
                      <tr>
                        <th>Nomor</th>
                        <th>Tujuan &amp; keperluan</th>
                        <th>Tanggal</th>
                        <th className="kanan">Estimasi</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {hasil.data.map((p) => (
                        <tr key={p.id}>
                          <td className="sel-utama angka">{p.request_number}</td>
                          <td>
                            <div className="sel-utama">{p.destination}</div>
                            <div className="sel-sekunder">{p.purpose}</div>
                          </td>
                          <td>
                            <div className="sel-utama">{rentangTanggal(p.departure_date, p.return_date)}</div>
                            <div className="sel-sekunder">{p.duration_days} hari</div>
                          </td>
                          <td className="kanan angka">{rupiah(p.estimated_cost)}</td>
                          <td>
                            <StatusBadge {...RUPA_STATUS_PERJALANAN[p.status]} />
                          </td>
                          <td className="kanan">
                            <button type="button" className="btn kecil" onClick={() => onBukaPerjalanan(p.id)}>
                              Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Paginasi meta={hasil.meta} satuan="pengajuan" onPindah={setHalaman} />
              </>
            )
          }
        </Muatan>
      </section>
    </>
  )
}
