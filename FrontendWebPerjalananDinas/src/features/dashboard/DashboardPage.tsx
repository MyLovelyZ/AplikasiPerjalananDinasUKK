import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

import {
  apiDashboardAdmin,
  apiDashboardAtasan,
  apiDashboardKeuangan,
  apiDashboardPegawai,
} from '@/api/endpoint'
import type { Perjalanan, Peran } from '@/api/tipe'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Muatan } from '@/components/ui/Keadaan'
import { PageHeader } from '@/components/ui/PageHeader'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  LABEL_AKSI_AUDIT,
  LABEL_JENIS_PENCAIRAN,
  LABEL_KATEGORI_BIAYA,
  LABEL_PERAN,
  NAMA_BULAN,
  RUPA_STATUS_PERJALANAN,
} from '@/constants/label'
import { useAuth } from '@/auth/useAuth'
import { DaftarBatang, DaftarPerjalanan, DaftarStatus } from '@/features/dashboard/components/DaftarRingkas'
import { DaftarTindakan } from '@/features/dashboard/components/DaftarTindakan'
import { GrafikBatang } from '@/features/dashboard/components/GrafikBatang'
import { PanelSerapan } from '@/features/dashboard/components/PanelSerapan'
import { usePermintaan } from '@/hooks/usePermintaan'
import { useAplikasi } from '@/layouts/konteksAplikasi'
import type { IconName } from '@/types/icon'
import { angka, inisial, rentangTanggal, rupiah, rupiahRingkas, sejak } from '@/utils/format'

interface DashboardPageProps {
  /** Pindah ke rute lain, mis. `/employee/requests`. */
  buka: (jalur: string) => void
  penandaSegar: number
}

const SAPAAN: Record<Peran, string> = {
  employee: 'Ini ringkasan pengajuan, perjalanan, dan laporan biaya Anda.',
  supervisor: 'Ini pengajuan tim yang menunggu keputusan Anda dan siapa yang sedang bertugas.',
  finance: 'Ini pengeluaran bulan ini, sisa anggaran, dan pekerjaan yang menunggu Anda.',
  super_admin: 'Ini ringkasan akun pengguna, departemen, dan aktivitas sistem.',
}

/** Tombol utama di kepala dashboard, sesuai tugas pokok tiap peran. */
const AKSI_UTAMA: Record<Peran, { label: string; jalur: string; ikon: IconName }> = {
  employee: { label: 'Ajukan Perjalanan', jalur: '/employee/requests/new', ikon: 'plus' },
  supervisor: { label: 'Tinjau Pengajuan', jalur: '/supervisor/approvals', ikon: 'check' },
  finance: { label: 'Laporan Keuangan', jalur: '/finance/reports', ikon: 'file' },
  super_admin: { label: 'Tambah Pengguna', jalur: '/admin/users/new', ikon: 'plus' },
}

const tanggalHariIni = () =>
  new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

/** /employee · /supervisor · /finance · /admin — isi mengikuti peran. */
export function DashboardPage() {
  const { pengguna } = useAuth()
  const { penandaSegar } = useAplikasi()
  const navigate = useNavigate()
  if (!pengguna) return null

  const props: DashboardPageProps = { buka: (jalur) => navigate(jalur), penandaSegar }
  const aksi = AKSI_UTAMA[pengguna.role]

  return (
    <>
      <PageHeader
        eyebrow={`${LABEL_PERAN[pengguna.role]} · ${tanggalHariIni()}`}
        title={`Selamat datang, ${pengguna.name.split(' ')[0]}`}
        description={SAPAAN[pengguna.role]}
        action={
          <button type="button" className="btn utama besar" onClick={() => props.buka(aksi.jalur)}>
            <Icon name={aksi.ikon} size={17} />
            {aksi.label}
          </button>
        }
      />

      {pengguna.role === 'employee' && <DashboardPegawai {...props} />}
      {pengguna.role === 'supervisor' && <DashboardAtasan {...props} />}
      {pengguna.role === 'finance' && <DashboardKeuangan {...props} />}
      {pengguna.role === 'super_admin' && <DashboardAdmin {...props} />}
    </>
  )
}

interface TabelPerjalananProps {
  judul: string
  subjudul: string
  daftar: Perjalanan[]
  onBuka: (perjalanan: Perjalanan) => void
  /** Tombol "Lihat semua" di kepala panel. */
  aksi?: ReactNode
  /** Tampilkan kolom pemohon, untuk dashboard supervisor. */
  denganPemohon?: boolean
  kosong: { ikon: IconName; judul: string; pesan: string }
}

/** Tabel ringkas pengajuan: nomor, (pemohon), tujuan, tanggal, estimasi, status. */
function TabelPerjalanan({ judul, subjudul, daftar, onBuka, aksi, denganPemohon, kosong }: TabelPerjalananProps) {
  return (
    <section className="panel">
      <PanelHeader title={judul} subtitle={subjudul} action={aksi} />

      {daftar.length === 0 ? (
        <Kosong ikon={kosong.ikon} judul={kosong.judul} pesan={kosong.pesan} />
      ) : (
        <div className="pembungkus-tabel">
          <table className="tabel">
            <thead>
              <tr>
                <th>Nomor</th>
                {denganPemohon && <th>Pemohon</th>}
                <th>Tujuan &amp; keperluan</th>
                <th>Tanggal</th>
                <th className="kanan">Estimasi</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {daftar.map((p) => (
                <tr key={p.id} className="baris-klik" onClick={() => onBuka(p)}>
                  <td className="sel-utama angka">{p.request_number}</td>
                  {denganPemohon && (
                    <td>
                      <div className="sel-orang">
                        <span className="avatar">{inisial(p.requester?.name)}</span>
                        <span className="sel-utama">{p.requester?.name ?? '—'}</span>
                      </div>
                    </td>
                  )}
                  <td>
                    <div className="sel-utama">{p.destination}</div>
                    <div className="sel-sekunder">{p.purpose}</div>
                  </td>
                  <td>{rentangTanggal(p.departure_date, p.return_date)}</td>
                  <td className="kanan angka">{rupiah(p.estimated_cost)}</td>
                  <td>
                    <StatusBadge {...RUPA_STATUS_PERJALANAN[p.status]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

const tombolTautan = (label: string, onClick: () => void) => (
  <button type="button" className="btn-tautan" onClick={onClick}>
    {label}
    <Icon name="chevron" size={14} />
  </button>
)

function DashboardPegawai({ buka: pindah, penandaSegar }: DashboardPageProps) {
  const { data, memuat, galat, muatUlang } = usePermintaan(() => apiDashboardPegawai(), [penandaSegar])
  const buka = (p: Perjalanan) => pindah(`/employee/requests/${p.id}`)

  return (
    <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={6}>
      {(d) => {
        const jumlah = (status: string) => d.requests_by_status.find((s) => s.status === status)?.total ?? 0
        const laporanPertama = d.expense_reports_due[0]
        return (
          <>
            {d.current_trip && (
              <div className="kotak-info baris">
                <Icon name="plane" size={20} />
                <span>
                  <b>Anda sedang bertugas</b> di {d.current_trip.destination},{' '}
                  {rentangTanggal(d.current_trip.departure_date, d.current_trip.return_date)} ({d.current_trip.request_number}).
                </span>
              </div>
            )}

            <DaftarTindakan
              onBuka={pindah}
              daftar={[
                {
                  jumlah: d.expense_reports_due.length,
                  judul: 'Laporan biaya perlu diisi',
                  keterangan: 'Perjalanan sudah selesai, laporannya belum diajukan',
                  jalur: laporanPertama ? `/employee/requests/${laporanPertama.id}/expenses` : '/employee/requests',
                },
                {
                  jumlah: jumlah('draft'),
                  judul: 'Draf belum diajukan',
                  keterangan: 'Lengkapi lalu kirim ke supervisor',
                  jalur: '/employee/requests',
                },
              ]}
            />

            <section className="ringkasan">
              <h2>Tahun ini</h2>
              <div className="grid-stat">
                <StatCard title="Pengajuan" value={d.this_year.requests} note="Semua pengajuan tahun ini" />
                <StatCard
                  title="Sedang diproses"
                  value={jumlah('submitted') + jumlah('supervisor_approved')}
                  note={`${jumlah('submitted')} di supervisor, ${jumlah('supervisor_approved')} di keuangan`}
                />
                <StatCard
                  title="Biaya disetujui"
                  value={rupiahRingkas(d.this_year.approved_estimated_cost)}
                  note={`Dari ${jumlah('approved') + jumlah('completed')} perjalanan`}
                />
                <StatCard
                  title="Biaya terverifikasi"
                  value={rupiahRingkas(d.this_year.verified_expenses)}
                  note="Dari laporan biaya"
                />
              </div>
            </section>

            <TabelPerjalanan
              judul="Pengajuan terbaru"
              subjudul="Lima pengajuan terakhir Anda"
              daftar={d.recent_requests}
              onBuka={buka}
              aksi={tombolTautan('Lihat semua', () => pindah('/employee/requests'))}
              kosong={{ ikon: 'plane', judul: 'Belum ada pengajuan', pesan: 'Mulai dengan mengajukan perjalanan dinas.' }}
            />

            <div className="grid-dua rata">
              <section className="panel">
                <PanelHeader title="Perjalanan mendatang" subtitle="Sudah disetujui, belum berangkat" />
                <DaftarPerjalanan
                  daftar={d.upcoming_trips}
                  onBuka={buka}
                  kosong={{ ikon: 'plane', judul: 'Belum ada jadwal', pesan: 'Perjalanan yang disetujui akan muncul di sini.' }}
                />
              </section>

              <section className="panel">
                <PanelHeader title="Dana menunggu pembayaran" subtitle="Uang muka dan reimbursement yang belum dibayar" />
                {d.pending_disbursements.length === 0 ? (
                  <Kosong ikon="wallet" judul="Tidak ada" pesan="Semua dana sudah dibayarkan." />
                ) : (
                  <div className="daftar">
                    {d.pending_disbursements.map((c) => (
                      <div className="daftar-baris" key={c.id}>
                        <span className="isi">
                          <b>{LABEL_JENIS_PENCAIRAN[c.type]}</b>
                          <small>{c.travel_request?.request_number}</small>
                        </span>
                        <b className="angka">{rupiah(c.amount)}</b>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )
      }}
    </Muatan>
  )
}

function DashboardAtasan({ buka, penandaSegar }: DashboardPageProps) {
  const { data, memuat, galat, muatUlang } = usePermintaan(() => apiDashboardAtasan(), [penandaSegar])

  return (
    <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={6}>
      {(d) => (
        <>
          <DaftarTindakan
            onBuka={buka}
            daftar={[
              {
                jumlah: d.pending_approvals,
                judul: 'Pengajuan menunggu keputusan Anda',
                keterangan: d.pending_approvals > 0 ? 'Setujui atau tolak dari antrean' : 'Antrean kosong',
                jalur: '/supervisor/approvals',
              },
            ]}
          />

          <section className="ringkasan">
            <h2>Tim Anda</h2>
            <div className="grid-stat">
              <StatCard
                title="Disetujui bulan ini"
                value={d.my_decisions_this_month.approved}
                note="Keputusan Anda bulan ini"
              />
              <StatCard
                title="Ditolak bulan ini"
                value={d.my_decisions_this_month.rejected}
                note="Keputusan Anda bulan ini"
              />
              <StatCard title="Anggota tim" value={d.team.members} note="Karyawan aktif" />
              <StatCard
                title="Biaya tim tahun ini"
                value={rupiahRingkas(d.team.committed_cost_this_year)}
                note="Dari perjalanan yang disetujui"
              />
            </div>
          </section>

          <TabelPerjalanan
            judul="Antrean terlama"
            subjudul="Pengajuan yang paling lama menunggu keputusan Anda"
            daftar={d.oldest_pending}
            onBuka={(p) => buka(`/supervisor/approvals/${p.id}`)}
            aksi={tombolTautan('Buka antrean', () => buka('/supervisor/approvals'))}
            denganPemohon
            kosong={{ ikon: 'check', judul: 'Antrean kosong', pesan: 'Tidak ada pengajuan yang menunggu.' }}
          />

          <div className="grid-dua rata">
            <section className="panel">
              <PanelHeader title="Sedang bertugas hari ini" subtitle="Anggota tim yang sedang dalam perjalanan dinas" />
              <DaftarPerjalanan
                daftar={d.team.on_trip_today}
                onBuka={(p) => buka(`/supervisor/approvals/${p.id}`)}
                denganPemohon
                kosong={{ ikon: 'plane', judul: 'Tidak ada', pesan: 'Tidak ada anggota tim yang sedang bertugas.' }}
              />
            </section>

            <section className="panel">
              <PanelHeader title="Pengajuan tim tahun ini" subtitle="Jumlah per status" />
              <DaftarStatus daftar={d.team.requests_by_status_this_year} />
            </section>
          </div>
        </>
      )}
    </Muatan>
  )
}

/** Perubahan bulan ini terhadap bulan lalu sebagai teks pendek, mis. "▲ 12%" atau "baru". */
function selisihPersen(sekarang: number, lalu: number): { teks: string; naik: boolean | null } {
  if (lalu === 0) return { teks: sekarang > 0 ? 'baru' : '—', naik: sekarang > 0 ? true : null }
  const persen = Math.round(((sekarang - lalu) / lalu) * 100)
  if (persen === 0) return { teks: 'tetap', naik: null }
  return { teks: `${persen > 0 ? '▲' : '▼'} ${Math.abs(persen)}%`, naik: persen > 0 }
}

/** Kalimat perbandingan pengeluaran bulan ini dengan bulan lalu. */
function kalimatPerubahan(sekarang: number, lalu: number, persen: number | null): string {
  if (persen === null) return lalu === 0 && sekarang === 0 ? 'Belum ada pengeluaran bulan ini maupun bulan lalu.' : 'Bulan lalu belum ada pengeluaran.'
  if (persen === 0) return `Sama dengan bulan lalu (${rupiahRingkas(lalu)}).`
  return `${persen > 0 ? 'Naik' : 'Turun'} ${Math.abs(persen)}% dibanding bulan lalu (${rupiahRingkas(lalu)}).`
}

function DashboardKeuangan({ buka, penandaSegar }: DashboardPageProps) {
  const { data, memuat, galat, muatUlang } = usePermintaan(() => apiDashboardKeuangan(), [penandaSegar])
  const bulanIni = NAMA_BULAN[new Date().getMonth()]

  return (
    <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={6}>
      {(d) => {
        const terpakai = d.budget.utilization_percentage
        return (
          <>
            <DaftarTindakan
              onBuka={buka}
              daftar={[
                {
                  jumlah: d.queues.budget_verification,
                  judul: 'Pengajuan perlu cek anggaran',
                  keterangan: 'Sudah disetujui supervisor',
                  jalur: '/finance/approvals',
                },
                {
                  jumlah: d.queues.expense_report_verification,
                  judul: 'Laporan biaya perlu diverifikasi',
                  keterangan: 'Dikirim karyawan setelah perjalanan',
                  jalur: '/finance/approvals',
                },
                {
                  jumlah: d.queues.pending_disbursements,
                  judul: 'Pencairan menunggu dibayar',
                  keterangan: `${rupiah(d.queues.pending_disbursement_amount)} belum ditransfer`,
                  jalur: '/finance/disbursements',
                },
              ]}
            />

            {/* Dua angka terpenting bagi keuangan: pengeluaran bulan ini dan sisa batas anggaran. */}
            <section className="sorotan">
              <div>
                <span className="stat-label">Pengeluaran {bulanIni}</span>
                <strong className="angka">{rupiah(d.spending.this_month)}</strong>
                <p>{kalimatPerubahan(d.spending.this_month, d.spending.last_month, d.spending.change_percentage)}</p>
                {tombolTautan('Lihat analisis bulanan', () => buka('/finance/analysis'))}
              </div>
              <div>
                <span className="stat-label">Sisa anggaran {d.budget.year}</span>
                <strong className="angka">{rupiah(d.budget.remaining_amount)}</strong>
                <div className="bilah tebal" aria-hidden="true">
                  <i className={terpakai >= 80 ? 'penuh' : ''} style={{ width: `${Math.min(100, terpakai)}%` }} />
                </div>
                <p>
                  Terpakai {angka(terpakai)}% dari batas {rupiahRingkas(d.budget.amount)}.
                </p>
              </div>
            </section>

            <div className="grid-dua rata">
              <section className="panel">
                <PanelHeader title="Pengeluaran per bulan" subtitle={`Pengeluaran terverifikasi tahun ${d.budget.year}`} />
                <GrafikBatang
                  titik={d.spending.monthly_trend.map((b) => ({ label: NAMA_BULAN[b.month - 1].slice(0, 3), nilai: b.total }))}
                  formatNilai={rupiahRingkas}
                  sorot={bulanIni.slice(0, 3)}
                />
              </section>

              <section className="panel">
                <PanelHeader title="Dipakai untuk apa?" subtitle={`Pengeluaran per kategori, ${bulanIni} dibanding bulan lalu`} />
                <div className="pembungkus-tabel">
                  <table className="tabel ringkas">
                    <thead>
                      <tr>
                        <th>Kategori</th>
                        <th className="kanan">Bulan ini</th>
                        <th className="kanan">Bulan lalu</th>
                        <th className="kanan">Perubahan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.spending.this_month_by_category.map((k) => {
                        const lalu = d.spending.last_month_by_category.find((x) => x.category === k.category)?.total ?? 0
                        const selisih = selisihPersen(k.total, lalu)
                        return (
                          <tr key={k.category}>
                            <td className="sel-utama">{LABEL_KATEGORI_BIAYA[k.category] ?? k.label}</td>
                            <td className="kanan angka">{rupiah(k.total)}</td>
                            <td className="kanan angka">{rupiah(lalu)}</td>
                            <td className="kanan">
                              <span className={`selisih ${selisih.naik ? 'naik' : ''}`}>{selisih.teks}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>Total</td>
                        <td className="kanan angka">{rupiah(d.spending.this_month)}</td>
                        <td className="kanan angka">{rupiah(d.spending.last_month)}</td>
                        <td className="kanan">
                          <span className={`selisih ${d.spending.change_amount > 0 ? 'naik' : ''}`}>
                            {selisihPersen(d.spending.this_month, d.spending.last_month).teks}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            </div>

            <PanelSerapan anggaran={d.budget} />
          </>
        )
      }}
    </Muatan>
  )
}

function DashboardAdmin({ buka, penandaSegar }: DashboardPageProps) {
  const { data, memuat, galat, muatUlang } = usePermintaan(() => apiDashboardAdmin(), [penandaSegar])

  return (
    <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={6}>
      {(d) => (
        <>
          <section className="ringkasan">
            <h2>Sistem</h2>
            <div className="grid-stat">
              <StatCard title="Pengguna" value={d.users.total} note={`${d.users.active} aktif, ${d.users.inactive} nonaktif`} />
              <StatCard title="Departemen" value={d.departments.total} note={`${d.departments.active} aktif`} />
              <StatCard title="Pengajuan tahun ini" value={d.travel_requests_this_year.total} note="Seluruh departemen" />
              <StatCard title="Login hari ini" value={d.logins_today} note="Sesi masuk tercatat" />
            </div>
          </section>

          <div className="grid-dua rata">
            <section className="panel">
              <PanelHeader
                title="Pengguna per peran"
                subtitle="Seluruh akun terdaftar"
                action={tombolTautan('Kelola', () => buka('/admin/users'))}
              />
              <DaftarBatang daftar={d.users.by_role.map((r) => ({ label: LABEL_PERAN[r.role], total: r.total }))} />
            </section>

            <section className="panel">
              <PanelHeader title="Pengajuan per status" subtitle="Tahun berjalan, seluruh departemen" />
              <DaftarStatus daftar={d.travel_requests_this_year.by_status} />
            </section>
          </div>

          <section className="panel">
            <PanelHeader
              title="Aktivitas terbaru"
              subtitle="Sepuluh catatan audit terakhir"
              action={tombolTautan('Log audit', () => buka('/admin/audit-logs'))}
            />
            {d.recent_activities.length === 0 ? (
              <Kosong ikon="clock" judul="Belum ada aktivitas" pesan="Aktivitas pengguna akan tercatat di sini." />
            ) : (
              <div className="daftar">
                {d.recent_activities.map((log) => (
                  <div className="daftar-baris" key={log.id}>
                    <span className="avatar">{inisial(log.user?.name ?? 'Sistem')}</span>
                    <span className="isi">
                      <b>{log.description}</b>
                      <small>
                        {log.user?.name ?? 'Sistem'} · {sejak(log.created_at)}
                      </small>
                    </span>
                    <span className="label-aksi">{LABEL_AKSI_AUDIT[log.action] ?? log.action_label}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </Muatan>
  )
}
