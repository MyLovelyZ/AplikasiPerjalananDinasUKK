import { apiRingkasanDashboard } from '@/api/endpoint'
import { useAuth } from '@/auth/useAuth'
import { Icon } from '@/components/ui/Icon'
import { Muatan } from '@/components/ui/Keadaan'
import { usePermintaan } from '@/hooks/usePermintaan'
import { rupiah } from '@/utils/format'
import type { IconName } from '@/types/icon'
import type { PageKey } from '@/types/navigation'
import type { RingkasanDashboard, Sppd } from '@/api/tipe'

interface DashboardPageProps {
  onBuatSppd: () => void
  onNavigate: (halaman: PageKey) => void
  onBukaSppd: (id: number) => void
}

type Peran = 'employee' | 'supervisor' | 'finance' | 'super_admin'

interface KartuStat {
  label: string
  nilai: string | number
  ikon: IconName
  warna: 'card-teal' | 'card-amber' | 'card-blue'
  badge: 'badge-teal' | 'badge-amber' | 'badge-blue'
}

interface AksiCepat {
  label: string
  keterangan: string
  ikon: IconName
  halaman: PageKey
}

/** Judul & deskripsi dashboard per peran. */
const JUDUL: Record<Peran, { judul: string; deskripsi: string }> = {
  employee: {
    judul: 'Dashboard Pegawai',
    deskripsi: 'Ajukan perjalanan dinas, pantau status persetujuan, dan susun laporan (LPJ) Anda.',
  },
  supervisor: {
    judul: 'Dashboard Supervisor',
    deskripsi: 'Tinjau dan putuskan pengajuan SPPD dari tim Anda.',
  },
  finance: {
    judul: 'Dashboard Keuangan',
    deskripsi: 'Cairkan uang muka, verifikasi LPJ, dan selesaikan reimbursement.',
  },
  super_admin: {
    judul: 'Dashboard Administrator',
    deskripsi: 'Ringkasan seluruh operasional perjalanan dinas PT. Citra Mandiri.',
  },
}

/** Tombol pintas yang relevan untuk tiap peran. */
const AKSI: Record<Peran, AksiCepat[]> = {
  employee: [
    { label: 'Ajukan SPPD Baru', keterangan: 'Isi formulir perjalanan dinas', ikon: 'plus', halaman: 'Pengajuan Dinas' },
    { label: 'Perjalanan Saya', keterangan: 'Lihat status pengajuan', ikon: 'plane', halaman: 'Perjalanan Saya' },
    { label: 'Laporan LPJ', keterangan: 'Laporkan realisasi biaya', ikon: 'file', halaman: 'Laporan' },
  ],
  supervisor: [
    { label: 'Antrean Persetujuan', keterangan: 'Setujui / tolak SPPD tim', ikon: 'check', halaman: 'Persetujuan' },
    { label: 'Monitoring Tim', keterangan: 'Pantau perjalanan tim', ikon: 'plane', halaman: 'Perjalanan Saya' },
  ],
  finance: [
    { label: 'Pencairan Dana', keterangan: 'Uang muka & reimbursement', ikon: 'wallet', halaman: 'Keuangan' },
    { label: 'Verifikasi LPJ', keterangan: 'Periksa laporan & nota', ikon: 'file', halaman: 'Laporan' },
  ],
  super_admin: [
    { label: 'Kelola Pegawai', keterangan: 'Data karyawan & peran', ikon: 'pengguna', halaman: 'Pegawai' },
    { label: 'Persetujuan', keterangan: 'Antrean seluruh SPPD', ikon: 'check', halaman: 'Persetujuan' },
    { label: 'Keuangan', keterangan: 'Pencairan dana', ikon: 'wallet', halaman: 'Keuangan' },
    { label: 'Pengaturan', keterangan: 'Konfigurasi sistem', ikon: 'settings', halaman: 'Pengaturan' },
  ],
}

function kartuPerPeran(peran: Peran, r: RingkasanDashboard): KartuStat[] {
  const k = r.kartu
  const ak = r.antrean_keuangan
  switch (peran) {
    case 'employee':
      return [
        { label: 'MENUNGGU PERSETUJUAN', nilai: k.menunggu, ikon: 'clock', warna: 'card-amber', badge: 'badge-amber' },
        { label: 'DISETUJUI / BERJALAN', nilai: k.disetujui + k.diproses, ikon: 'plane', warna: 'card-teal', badge: 'badge-teal' },
        { label: 'SELESAI', nilai: k.selesai, ikon: 'check', warna: 'card-blue', badge: 'badge-blue' },
      ]
    case 'supervisor':
      return [
        { label: 'PERLU KEPUTUSAN ANDA', nilai: r.tugas_persetujuan_saya || k.menunggu, ikon: 'clock', warna: 'card-amber', badge: 'badge-amber' },
        { label: 'SUDAH DISETUJUI', nilai: k.disetujui + k.diproses, ikon: 'check', warna: 'card-teal', badge: 'badge-teal' },
        { label: 'DITOLAK', nilai: k.ditolak, ikon: 'file', warna: 'card-blue', badge: 'badge-blue' },
      ]
    case 'finance':
      return [
        { label: 'UANG MUKA BELUM CAIR', nilai: ak?.uang_muka_belum_dicairkan ?? 0, ikon: 'wallet', warna: 'card-amber', badge: 'badge-amber' },
        { label: 'LPJ MENUNGGU VERIFIKASI', nilai: ak?.laporan_menunggu_verifikasi ?? 0, ikon: 'file', warna: 'card-teal', badge: 'badge-teal' },
        { label: 'TOTAL UANG MUKA', nilai: rupiah(r.biaya?.total_uang_muka ?? 0), ikon: 'chart', warna: 'card-blue', badge: 'badge-blue' },
      ]
    default:
      return [
        { label: 'TOTAL SPPD', nilai: r.total_sppd, ikon: 'plane', warna: 'card-teal', badge: 'badge-teal' },
        { label: 'MENUNGGU PERSETUJUAN', nilai: k.menunggu, ikon: 'clock', warna: 'card-amber', badge: 'badge-amber' },
        { label: 'TOTAL ESTIMASI BIAYA', nilai: rupiah(r.biaya?.total_estimasi ?? 0), ikon: 'chart', warna: 'card-blue', badge: 'badge-blue' },
      ]
  }
}

function labelStatus(status: string): { teks: string; varian: string } {
  switch (status) {
    case 'DISETUJUI':
    case 'DALAM_PERJALANAN':
      return { teks: 'Disetujui', varian: 'approved' }
    case 'MENUNGGU_LAPORAN':
    case 'SELESAI':
      return { teks: 'Selesai', varian: 'completed' }
    case 'DITOLAK':
    case 'DIBATALKAN':
      return { teks: 'Ditolak', varian: 'rejected' }
    default:
      return { teks: 'Menunggu', varian: 'pending' }
  }
}

function rentang(a?: string, b?: string) {
  if (!a) return '—'
  const f = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  try {
    return b && b !== a ? `${f.format(new Date(a))} – ${f.format(new Date(b))}` : f.format(new Date(a))
  } catch {
    return a
  }
}

export function DashboardPage({ onNavigate, onBukaSppd }: DashboardPageProps) {
  const { profil } = useAuth()
  const peran = (profil?.peran?.[0]?.kode ?? 'employee') as Peran
  const info = JUDUL[peran] ?? JUDUL.employee
  const aksi = AKSI[peran] ?? AKSI.employee
  const nama = profil?.karyawan?.nama_lengkap ?? profil?.username ?? ''

  const { data, memuat, galat, muatUlang } = usePermintaan(
    () => apiRingkasanDashboard(),
    [profil?.id],
  )

  const halamanDaftar: PageKey = peran === 'finance' ? 'Keuangan' : peran === 'supervisor' ? 'Persetujuan' : 'Perjalanan Saya'

  return (
    <div className="dashboard-wrap">
      <div className="dashboard-header">
        <h1>{info.judul}</h1>
        <p>
          Halo, <strong>{nama}</strong>. {info.deskripsi}
        </p>
      </div>

      {/* Aksi cepat sesuai peran */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 14,
          marginBottom: 20,
        }}
      >
        {aksi.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => onNavigate(a.halaman)}
            className="panel"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 16px',
              textAlign: 'left',
              cursor: 'pointer',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              background: '#FFFFFF',
            }}
          >
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0C2340',
                color: '#FFFFFF',
                flexShrink: 0,
              }}
            >
              <Icon name={a.ikon} size={18} />
            </span>
            <span>
              <strong style={{ display: 'block', fontSize: 14, color: '#0F172A' }}>{a.label}</strong>
              <small style={{ color: '#64748B', fontSize: 12 }}>{a.keterangan}</small>
            </span>
          </button>
        ))}
      </div>

      <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={4}>
        {(ringkasan) => {
          const kartu = kartuPerPeran(peran, ringkasan)
          const baris: Sppd[] = (ringkasan.perjalanan_terkini ?? []).slice(0, 5)

          return (
            <>
              {peran === 'supervisor' && ringkasan.tugas_persetujuan_saya > 0 && (
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
                    marginBottom: 16,
                  }}
                >
                  <Icon name="clock" size={18} />
                  <span style={{ fontSize: 13, color: '#1e3a8a' }}>
                    <strong>{ringkasan.tugas_persetujuan_saya} pengajuan</strong> menunggu keputusan Anda.{' '}
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

              <div className="dashboard-stat-grid">
                {kartu.map((c) => (
                  <div key={c.label} className={`dash-stat-card ${c.warna}`}>
                    <div className="dash-stat-top">
                      <span className="dash-stat-label">{c.label}</span>
                      <div className={`dash-stat-badge ${c.badge}`}>
                        <Icon name={c.ikon} size={18} />
                      </div>
                    </div>
                    <div className="dash-stat-value">{c.nilai}</div>
                  </div>
                ))}
              </div>

              <div className="dash-table-card">
                <div className="dash-table-head">
                  <h2>{peran === 'employee' ? 'Pengajuan Terbaru Saya' : 'Pengajuan SPPD Terbaru'}</h2>
                  <button type="button" onClick={() => onNavigate(halamanDaftar)}>
                    Lihat Semua
                  </button>
                </div>

                <div className="dash-table-wrap">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>PEGAWAI</th>
                        <th>TUJUAN</th>
                        <th>TANGGAL</th>
                        <th>STATUS</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {baris.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', color: '#64748B', padding: 24 }}>
                            Belum ada pengajuan.
                          </td>
                        </tr>
                      ) : (
                        baris.map((s) => {
                          const st = labelStatus(s.status)
                          const namaPegawai = s.pemohon?.nama_lengkap ?? 'Pegawai'
                          return (
                            <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => onBukaSppd(s.id)}>
                              <td>
                                <div className="dash-employee-cell">
                                  <div className="dash-employee-avatar">{namaPegawai.charAt(0)}</div>
                                  <span className="dash-employee-name">{namaPegawai}</span>
                                </div>
                              </td>
                              <td>{s.lokasiTujuan?.nama_kota ?? s.tujuan_lainnya ?? '—'}</td>
                              <td>{rentang(s.tanggal_berangkat, s.tanggal_kembali)}</td>
                              <td>
                                <span className={`dash-status-pill ${st.varian}`}>{st.teks}</span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="dash-action-btn"
                                  aria-label="Detail"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onBukaSppd(s.id)
                                  }}
                                >
                                  <Icon name="dots" size={16} />
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
        }}
      </Muatan>
    </div>
  )
}
