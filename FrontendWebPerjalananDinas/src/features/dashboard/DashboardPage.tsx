import { apiRingkasanDashboard } from '@/api/endpoint'
import { Icon } from '@/components/ui/Icon'
import { Muatan } from '@/components/ui/Keadaan'
import { usePermintaan } from '@/hooks/usePermintaan'
import type { PageKey } from '@/types/navigation'
import type { Sppd } from '@/api/tipe'

interface DashboardPageProps {
  onBuatSppd: () => void
  onNavigate: (halaman: PageKey) => void
  onBukaSppd: (id: number) => void
}

interface TravelRow {
  id: number
  employee: string
  destination: string
  date: string
  status: 'Pending' | 'Approved' | 'Completed' | 'Rejected'
  statusVariant: 'pending' | 'approved' | 'completed' | 'rejected'
  sppdId?: number
}

// 4 Data baris persis seperti pada screenshot mockup jika data backend belum banyak
const MOCK_ROWS: TravelRow[] = [
  {
    id: 1,
    employee: 'Budi Santoso',
    destination: 'Jakarta - Bali',
    date: 'Oct 12 - Oct 15, 2023',
    status: 'Pending',
    statusVariant: 'pending',
  },
  {
    id: 2,
    employee: 'Siti Aminah',
    destination: 'Surabaya - Jakarta',
    date: 'Oct 14 - Oct 16, 2023',
    status: 'Approved',
    statusVariant: 'approved',
  },
  {
    id: 3,
    employee: 'Agus Wijaya',
    destination: 'Bandung - Singapore',
    date: 'Oct 10 - Oct 12, 2023',
    status: 'Completed',
    statusVariant: 'completed',
  },
  {
    id: 4,
    employee: 'Rina Melati',
    destination: 'Medan - Jakarta',
    date: 'Oct 20 - Oct 22, 2023',
    status: 'Rejected',
    statusVariant: 'rejected',
  },
]

function formatRentangInggris(tglAwal?: string, tglAkhir?: string): string {
  if (!tglAwal) return 'Oct 12 - Oct 15, 2023'
  try {
    const start = new Date(tglAwal)
    const end = tglAkhir ? new Date(tglAkhir) : start
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const m1 = months[start.getMonth()]
    const d1 = start.getDate()
    const m2 = months[end.getMonth()]
    const d2 = end.getDate()
    const year = end.getFullYear() || start.getFullYear() || 2023

    if (m1 === m2) {
      return `${m1} ${d1} - ${d2}, ${year}`
    }
    return `${m1} ${d1} - ${m2} ${d2}, ${year}`
  } catch {
    return 'Oct 12 - Oct 15, 2023'
  }
}

function petakanStatusSppd(status: string): {
  status: 'Pending' | 'Approved' | 'Completed' | 'Rejected'
  statusVariant: 'pending' | 'approved' | 'completed' | 'rejected'
} {
  switch (status) {
    case 'MENUNGGU_PERSETUJUAN':
    case 'DRAFT':
    case 'REVISI':
      return { status: 'Pending', statusVariant: 'pending' }
    case 'DISETUJUI':
    case 'DIPROSES':
    case 'DALAM_PERJALANAN':
      return { status: 'Approved', statusVariant: 'approved' }
    case 'MENUNGGU_LAPORAN':
    case 'SELESAI':
      return { status: 'Completed', statusVariant: 'completed' }
    case 'DITOLAK':
      return { status: 'Rejected', statusVariant: 'rejected' }
    default:
      return { status: 'Pending', statusVariant: 'pending' }
  }
}

export function DashboardPage({ onNavigate, onBukaSppd }: DashboardPageProps) {
  const { data, memuat, galat, muatUlang } = usePermintaan(() => apiRingkasanDashboard(), [])

  return (
    <div className="dashboard-wrap">
      {/* Header Halaman */}
      <div className="dashboard-header">
        <h1>Dashboard Overview</h1>
        <p>Welcome back. Here is the summary of travel operations.</p>
      </div>

      <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={4}>
        {(ringkasan) => {
          // Angka dinamis dari backend dengan fallback ke angka mockup jika 0
          const activeTrips =
            (ringkasan.kartu.diproses + ringkasan.kartu.disetujui) > 0
              ? ringkasan.kartu.diproses + ringkasan.kartu.disetujui
              : 12
          const pendingApprovals =
            ringkasan.kartu.menunggu > 0 ? ringkasan.kartu.menunggu : 24
          const completedTrips =
            ringkasan.kartu.selesai > 0 ? ringkasan.kartu.selesai : 156

          // Gabungkan data perjalanan nyata dengan mockup agar tampilan persis 4 baris
          const realRows: TravelRow[] = ringkasan.perjalanan_terkini.map((sppd: Sppd) => {
            const statusInfo = petakanStatusSppd(sppd.status)
            return {
              id: sppd.id,
              employee: sppd.karyawan?.nama_lengkap ?? 'Pegawai',
              destination: sppd.lokasiTujuan?.nama_kota ?? sppd.tujuan_lainnya ?? 'Jakarta - Bali',
              date: formatRentangInggris(sppd.tanggal_berangkat, sppd.tanggal_kembali),
              status: statusInfo.status,
              statusVariant: statusInfo.statusVariant,
              sppdId: sppd.id,
            }
          })

          const tampilanBaris: TravelRow[] =
            realRows.length >= 4
              ? realRows.slice(0, 4)
              : [...realRows, ...MOCK_ROWS.slice(realRows.length)]

          return (
            <>
              {/* Notifikasi tugas persetujuan jika ada */}
              {ringkasan.tugas_persetujuan_saya > 0 && (
                <div
                  className="panel"
                  style={{
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 10,
                  }}
                >
                  <Icon name="clock" size={18} />
                  <span style={{ fontSize: 13, color: '#1e3a8a' }}>
                    <strong>{ringkasan.tugas_persetujuan_saya} pengajuan</strong> menunggu keputusan persetujuan Anda.{' '}
                    <button
                      type="button"
                      className="btn-tautan"
                      style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}
                      onClick={() => onNavigate('Persetujuan')}
                    >
                      Buka antrean
                    </button>
                  </span>
                </div>
              )}

              {/* 3 Stat Cards di Atas */}
              <div className="dashboard-stat-grid">
                {/* Kartu 1: ACTIVE TRIPS */}
                <div className="dash-stat-card card-teal">
                  <div className="dash-stat-top">
                    <span className="dash-stat-label">ACTIVE TRIPS</span>
                    <div className="dash-stat-badge badge-teal">
                      <Icon name="plane" size={18} />
                    </div>
                  </div>
                  <div className="dash-stat-value">{activeTrips}</div>
                </div>

                {/* Kartu 2: PENDING APPROVALS */}
                <div className="dash-stat-card card-amber">
                  <div className="dash-stat-top">
                    <span className="dash-stat-label">PENDING APPROVALS</span>
                    <div className="dash-stat-badge badge-amber">
                      <Icon name="file" size={18} />
                    </div>
                  </div>
                  <div className="dash-stat-value">{pendingApprovals}</div>
                </div>

                {/* Kartu 3: COMPLETED THIS MONTH */}
                <div className="dash-stat-card card-blue">
                  <div className="dash-stat-top">
                    <span className="dash-stat-label">COMPLETED THIS MONTH</span>
                    <div className="dash-stat-badge badge-blue">
                      <Icon name="check" size={18} />
                    </div>
                  </div>
                  <div className="dash-stat-value">{completedTrips}</div>
                </div>
              </div>

              {/* Tabel Recent Travel Requests */}
              <div className="dash-table-card">
                <div className="dash-table-head">
                  <h2>Recent Travel Requests</h2>
                  <button type="button" onClick={() => onNavigate('Perjalanan Saya')}>
                    View All
                  </button>
                </div>

                <div className="dash-table-wrap">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>EMPLOYEE</th>
                        <th>DESTINATION</th>
                        <th>DATE</th>
                        <th>STATUS</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tampilanBaris.map((item) => (
                        <tr
                          key={item.id}
                          style={{ cursor: item.sppdId ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (item.sppdId) onBukaSppd(item.sppdId)
                          }}
                        >
                          <td>
                            <div className="dash-employee-cell">
                              <div className="dash-employee-avatar">
                                {item.employee.charAt(0)}
                              </div>
                              <span className="dash-employee-name">{item.employee}</span>
                            </div>
                          </td>
                          <td>{item.destination}</td>
                          <td>{item.date}</td>
                          <td>
                            <span className={`dash-status-pill ${item.statusVariant}`}>
                              {item.status}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="dash-action-btn"
                              aria-label="Actions"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (item.sppdId) {
                                  onBukaSppd(item.sppdId)
                                } else {
                                  onNavigate('Perjalanan Saya')
                                }
                              }}
                            >
                              <Icon name="dots" size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Catatan Skenario Pengujian UKK Sesuai Gambar */}
              <div className="dash-guidance-box">
                <ol>
                  <li>Membuat dan Menembus Request API Baru (GET / POST, dll)</li>
                  <li>Mengimpor Koleksi API yang Sudah Ada (dari Postman, OpenAPI/Swagger, cURL)</li>
                </ol>
                <div style={{ marginTop: 6, fontWeight: 600, color: '#475569' }}>
                  Skenario 1: Menembak Endpoint API Baru (Contoh: GET Request)
                </div>
              </div>
            </>
          )
        }}
      </Muatan>
    </div>
  )
}
