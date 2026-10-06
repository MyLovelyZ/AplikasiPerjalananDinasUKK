import { apiDaftarPerjalanan } from '@/api/endpoint'
import type { Perjalanan } from '@/api/tipe'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Muatan } from '@/components/ui/Keadaan'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { RUPA_STATUS_LAPORAN, RUPA_STATUS_PERJALANAN } from '@/constants/label'
import { usePermintaan } from '@/hooks/usePermintaan'
import { hariIni, rentangTanggal, rupiah } from '@/utils/format'

interface ReportsPageProps {
  pencarian: string
  onBukaLaporan: (perjalananId: number) => void
  penandaSegar: number
}

/** Laporan hanya relevan untuk perjalanan yang sudah disetujui Keuangan atau sudah selesai. */
async function ambilPerjalananBerlaporan(search: string) {
  const [disetujui, selesai] = await Promise.all([
    apiDaftarPerjalanan({ status: 'approved', search, per_page: 100 }),
    apiDaftarPerjalanan({ status: 'completed', search, per_page: 100 }),
  ])
  return [...disetujui.data, ...selesai.data]
}

const perluDilaporkan = (p: Perjalanan) =>
  p.status === 'approved' &&
  p.return_date < hariIni() &&
  (!p.expense_report || p.expense_report.status === 'draft' || p.expense_report.status === 'returned')

export function ReportsPage({ pencarian, onBukaLaporan, penandaSegar }: ReportsPageProps) {
  const { data, memuat, galat, muatUlang } = usePermintaan(() => ambilPerjalananBerlaporan(pencarian), [
    pencarian,
    penandaSegar,
  ])

  const jumlahTertunda = (data ?? []).filter(perluDilaporkan).length

  return (
    <>
      <PageHeader
        eyebrow="Pertanggungjawaban"
        title="Laporan Biaya"
        description="Laporkan pengeluaran setelah perjalanan selesai, lengkap dengan bukti nota."
      />

      {jumlahTertunda > 0 && (
        <div className="peringatan-plafon" style={{ marginBottom: 16, borderRadius: 9 }}>
          <Icon name="clock" size={16} />
          <span>
            <b>{jumlahTertunda} perjalanan</b> sudah selesai tetapi laporannya belum diajukan.
          </span>
        </div>
      )}

      <section className="panel">
        <div className="bilah-alat">
          {pencarian && <span className="status biru">Pencarian: “{pencarian}”</span>}
          <button type="button" className="btn kecil dorong" onClick={muatUlang}>
            <Icon name="segarkan" size={15} />
            Segarkan
          </button>
        </div>

        <Muatan
          data={data}
          memuat={memuat}
          galat={galat}
          onCobaLagi={muatUlang}
          barisRangka={5}
          kosong={
            <Kosong
              ikon="file"
              judul="Belum ada perjalanan yang perlu dilaporkan"
              pesan="Perjalanan muncul di sini setelah disetujui Keuangan."
            />
          }
        >
          {(daftar) => (
            <div className="pembungkus-tabel">
              <table className="tabel">
                <thead>
                  <tr>
                    <th>Nomor</th>
                    <th>Tujuan &amp; keperluan</th>
                    <th>Tanggal</th>
                    <th className="kanan">Estimasi</th>
                    <th>Perjalanan</th>
                    <th>Laporan</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {daftar.map((p) => (
                    <tr key={p.id}>
                      <td className="sel-utama angka">{p.request_number}</td>
                      <td>
                        <div className="sel-utama">{p.destination}</div>
                        <div className="sel-sekunder">{p.purpose}</div>
                      </td>
                      <td>{rentangTanggal(p.departure_date, p.return_date)}</td>
                      <td className="kanan angka">{rupiah(p.estimated_cost)}</td>
                      <td>
                        <StatusBadge {...RUPA_STATUS_PERJALANAN[p.status]} />
                      </td>
                      <td>
                        {p.expense_report ? (
                          <StatusBadge {...RUPA_STATUS_LAPORAN[p.expense_report.status]} />
                        ) : (
                          <StatusBadge label={perluDilaporkan(p) ? 'Perlu dilaporkan' : 'Belum dibuat'} warna={perluDilaporkan(p) ? 'kuning' : 'netral'} />
                        )}
                      </td>
                      <td className="kanan">
                        <button type="button" className="btn kecil" onClick={() => onBukaLaporan(p.id)}>
                          {p.expense_report?.is_editable !== false && p.status === 'approved' ? 'Isi laporan' : 'Lihat'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Muatan>
      </section>
    </>
  )
}
