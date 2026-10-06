import { Link, useSearchParams } from 'react-router'

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
import { useAplikasi } from '@/layouts/konteksAplikasi'
import { rentangTanggal, rupiah } from '@/utils/format'

const TAHUN_INI = new Date().getFullYear()
const PILIHAN_TAHUN = [TAHUN_INI + 1, TAHUN_INI, TAHUN_INI - 1, TAHUN_INI - 2]

/** /employee/requests — penyaring status dan tahun disimpan di URL (?status=&year=). */
export function TripsPage() {
  const { pencarian, penandaSegar } = useAplikasi()
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') ?? '') as StatusPerjalanan | ''
  const tahun = Number(params.get('year')) || undefined
  const [halaman, setHalaman] = useHalaman(status, tahun, pencarian)

  const ubahPenyaring = (kunci: 'status' | 'year', nilai: string) =>
    setParams(
      (lama) => {
        const baru = new URLSearchParams(lama)
        if (nilai) baru.set(kunci, nilai)
        else baru.delete(kunci)
        return baru
      },
      { replace: true },
    )

  const { data, memuat, galat, muatUlang } = usePermintaan(
    () => apiDaftarPerjalanan({ page: halaman, per_page: 12, status, year: tahun, search: pencarian }),
    [halaman, status, tahun, pencarian, penandaSegar],
  )

  return (
    <>
      <PageHeader
        eyebrow="Pengajuan"
        title="Perjalanan Saya"
        description="Riwayat pengajuan perjalanan dinas Anda beserta status terkininya."
        action={
          <Link className="btn utama" to="/employee/requests/new">
            <Icon name="plus" size={17} />
            Ajukan Perjalanan
          </Link>
        }
      />

      <section className="panel">
        <div className="bilah-alat">
          <select
            value={status}
            onChange={(e) => ubahPenyaring('status', e.target.value)}
            aria-label="Saring berdasarkan status"
          >
            <option value="">Semua status</option>
            {Object.entries(RUPA_STATUS_PERJALANAN).map(([nilai, rupa]) => (
              <option key={nilai} value={nilai}>
                {rupa.label}
              </option>
            ))}
          </select>

          <select
            value={tahun ?? ''}
            onChange={(e) => ubahPenyaring('year', e.target.value)}
            aria-label="Saring berdasarkan tahun keberangkatan"
          >
            <option value="">Semua tahun</option>
            {PILIHAN_TAHUN.map((t) => (
              <option key={t} value={t}>
                {t}
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
                  pencarian || status || tahun
                    ? 'Tidak ada data yang cocok dengan penyaring saat ini.'
                    : 'Belum ada pengajuan perjalanan dinas. Mulai dengan membuat pengajuan baru.'
                }
                aksi={
                  !pencarian && !status && !tahun ? (
                    <Link className="btn kecil utama" to="/employee/requests/new">
                      <Icon name="plus" size={15} />
                      Ajukan sekarang
                    </Link>
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
                            <Link className="btn kecil" to={`/employee/requests/${p.id}`}>
                              Detail
                            </Link>
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
