import {
  apiDashboardAdmin,
  apiDashboardAtasan,
  apiDashboardKeuangan,
  apiDashboardPegawai,
} from '@/api/endpoint'
import type { Perjalanan } from '@/api/tipe'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Muatan } from '@/components/ui/Keadaan'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LABEL_AKSI_AUDIT, LABEL_JENIS_PENCAIRAN, LABEL_KATEGORI_BIAYA, LABEL_PERAN, NAMA_BULAN, RUPA_STATUS_PENCAIRAN } from '@/constants/label'
import { useAuth } from '@/auth/useAuth'
import { DaftarPerjalanan, DaftarStatus } from '@/features/dashboard/components/DaftarRingkas'
import { GrafikBatang } from '@/features/dashboard/components/GrafikBatang'
import { PanelSerapan } from '@/features/dashboard/components/PanelSerapan'
import { usePermintaan } from '@/hooks/usePermintaan'
import { rentangTanggal, rupiah, rupiahRingkas, sejak } from '@/utils/format'
import type { PageKey } from '@/types/navigation'

interface DashboardPageProps {
  onNavigate: (halaman: PageKey) => void
  onBukaPerjalanan: (id: number) => void
  onBuatPerjalanan: () => void
  onBukaLaporan: (perjalananId: number) => void
  penandaSegar: number
}

const SAPAAN: Record<string, string> = {
  employee: 'Pantau pengajuan, perjalanan, dan laporan biaya Anda dari satu tempat.',
  supervisor: 'Tinjau pengajuan tim Anda dan pantau siapa yang sedang bertugas.',
  finance: 'Verifikasi anggaran dan laporan, cairkan dana, dan pantau serapan anggaran.',
  super_admin: 'Kelola akun, departemen, dan pantau aktivitas seluruh sistem.',
}

export function DashboardPage(props: DashboardPageProps) {
  const { pengguna } = useAuth()
  if (!pengguna) return null

  const namaDepan = pengguna.name.split(' ')[0]

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">{LABEL_PERAN[pengguna.role]}</p>
          <h1>Selamat datang, {namaDepan}.</h1>
          <p>{SAPAAN[pengguna.role]}</p>
        </div>

        {pengguna.role === 'employee' && (
          <div className="hero-aksi">
            <button type="button" className="btn" onClick={props.onBuatPerjalanan}>
              <Icon name="plus" size={17} />
              Ajukan Perjalanan
            </button>
            <button type="button" className="btn tembus" onClick={() => props.onNavigate('Perjalanan Saya')}>
              Lihat Perjalanan
              <Icon name="arrow" size={17} />
            </button>
          </div>
        )}
      </section>

      {pengguna.role === 'employee' && <DashboardPegawai {...props} />}
      {pengguna.role === 'supervisor' && <DashboardAtasan {...props} />}
      {pengguna.role === 'finance' && <DashboardKeuangan {...props} />}
      {pengguna.role === 'super_admin' && <DashboardAdmin {...props} />}
    </>
  )
}

function DashboardPegawai({ onNavigate, onBukaPerjalanan, onBukaLaporan, penandaSegar }: DashboardPageProps) {
  const { data, memuat, galat, muatUlang } = usePermintaan(() => apiDashboardPegawai(), [penandaSegar])
  const buka = (p: Perjalanan) => onBukaPerjalanan(p.id)

  return (
    <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={6}>
      {(d) => {
        const jumlah = (status: string) => d.requests_by_status.find((s) => s.status === status)?.total ?? 0
        return (
          <>
            <div className="grid-stat">
              <StatCard icon="file" title="Pengajuan tahun ini" value={d.this_year.requests} note={`${jumlah('draft')} masih draf`} />
              <StatCard
                icon="clock"
                warna="kuning"
                title="Menunggu persetujuan"
                value={jumlah('submitted') + jumlah('supervisor_approved')}
                note={`${jumlah('submitted')} di atasan · ${jumlah('supervisor_approved')} di Keuangan`}
              />
              <StatCard
                icon="check"
                warna="hijau"
                title="Biaya disetujui"
                value={rupiahRingkas(d.this_year.approved_estimated_cost)}
                note={`${jumlah('approved') + jumlah('completed')} perjalanan`}
              />
              <StatCard
                icon="wallet"
                warna="ungu"
                title="Biaya terverifikasi"
                value={rupiahRingkas(d.this_year.verified_expenses)}
                note="Dari laporan biaya"
              />
            </div>

            {d.current_trip && (
              <div className="kotak-info" style={{ marginBottom: 16 }}>
                <strong>Anda sedang bertugas</strong>
                {d.current_trip.request_number} · {d.current_trip.destination} ·{' '}
                {rentangTanggal(d.current_trip.departure_date, d.current_trip.return_date)}
              </div>
            )}

            <div className="grid-dua">
              <section className="panel">
                <PanelHeader
                  title="Laporan Perlu Diisi"
                  subtitle="Perjalanan selesai yang laporannya belum diajukan"
                  action={
                    <button type="button" className="btn-tautan" onClick={() => onNavigate('Laporan Biaya')}>
                      Laporan biaya
                      <Icon name="chevron" size={14} />
                    </button>
                  }
                />
                <DaftarPerjalanan
                  daftar={d.expense_reports_due}
                  onBuka={(p) => onBukaLaporan(p.id)}
                  kosong={{ ikon: 'check', judul: 'Tidak ada tunggakan', pesan: 'Semua laporan biaya sudah diajukan.' }}
                />
              </section>

              <section className="panel">
                <PanelHeader title="Perjalanan Mendatang" subtitle="Sudah disetujui, belum berangkat" />
                <DaftarPerjalanan
                  daftar={d.upcoming_trips}
                  onBuka={buka}
                  kosong={{ ikon: 'plane', judul: 'Belum ada jadwal', pesan: 'Perjalanan yang disetujui akan muncul di sini.' }}
                />
              </section>
            </div>

            <div className="grid-dua" style={{ marginTop: 16 }}>
              <section className="panel">
                <PanelHeader
                  title="Pengajuan Terbaru"
                  subtitle="Lima pengajuan terakhir Anda"
                  action={
                    <button type="button" className="btn-tautan" onClick={() => onNavigate('Perjalanan Saya')}>
                      Lihat semua
                      <Icon name="chevron" size={14} />
                    </button>
                  }
                />
                <DaftarPerjalanan
                  daftar={d.recent_requests}
                  onBuka={buka}
                  kosong={{ ikon: 'plane', judul: 'Belum ada pengajuan', pesan: 'Mulai dengan mengajukan perjalanan dinas.' }}
                />
              </section>

              <section className="panel">
                <PanelHeader title="Dana Menunggu Pembayaran" subtitle="Uang muka dan reimbursement yang belum dibayar" />
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

function DashboardAtasan({ onNavigate, onBukaPerjalanan, penandaSegar }: DashboardPageProps) {
  const { data, memuat, galat, muatUlang } = usePermintaan(() => apiDashboardAtasan(), [penandaSegar])

  return (
    <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={6}>
      {(d) => (
        <>
          <div className="grid-stat">
            <StatCard icon="clock" warna="kuning" title="Menunggu keputusan" value={d.pending_approvals} note="Pengajuan tim" />
            <StatCard
              icon="check"
              warna="hijau"
              title="Disetujui bulan ini"
              value={d.my_decisions_this_month.approved}
              note={`${d.my_decisions_this_month.rejected} ditolak`}
            />
            <StatCard icon="users" title="Anggota tim" value={d.team.members} note="Pegawai aktif" />
            <StatCard
              icon="wallet"
              warna="ungu"
              title="Biaya tim tahun ini"
              value={rupiahRingkas(d.team.committed_cost_this_year)}
              note="Perjalanan yang disetujui"
            />
          </div>

          <div className="grid-dua">
            <section className="panel">
              <PanelHeader
                title="Antrean Terlama"
                subtitle="Pengajuan yang paling lama menunggu Anda"
                action={
                  <button type="button" className="btn-tautan" onClick={() => onNavigate('Persetujuan')}>
                    Buka antrean
                    <Icon name="chevron" size={14} />
                  </button>
                }
              />
              <DaftarPerjalanan
                daftar={d.oldest_pending}
                onBuka={(p) => onBukaPerjalanan(p.id)}
                denganPemohon
                kosong={{ ikon: 'check', judul: 'Antrean kosong', pesan: 'Tidak ada pengajuan yang menunggu.' }}
              />
            </section>

            <section className="panel">
              <PanelHeader title="Sedang Bertugas Hari Ini" subtitle="Anggota tim dalam perjalanan dinas" />
              <DaftarPerjalanan
                daftar={d.team.on_trip_today}
                onBuka={(p) => onBukaPerjalanan(p.id)}
                denganPemohon
                kosong={{ ikon: 'plane', judul: 'Tidak ada', pesan: 'Tidak ada anggota tim yang sedang bertugas.' }}
              />
            </section>
          </div>

          <section className="panel" style={{ marginTop: 16 }}>
            <PanelHeader title="Pengajuan Tim Tahun Ini" subtitle="Per status, berdasarkan tanggal berangkat" />
            <DaftarStatus daftar={d.team.requests_by_status_this_year} />
          </section>
        </>
      )}
    </Muatan>
  )
}

function DashboardKeuangan({ onNavigate, penandaSegar }: DashboardPageProps) {
  const { data, memuat, galat, muatUlang } = usePermintaan(() => apiDashboardKeuangan(), [penandaSegar])

  return (
    <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={6}>
      {(d) => {
        const perubahan = d.spending.change_percentage
        return (
          <>
            <div className="grid-stat">
              <StatCard
                icon="chart"
                title="Pengeluaran bulan ini"
                value={rupiahRingkas(d.spending.this_month)}
                note={
                  perubahan === null
                    ? `Bulan lalu ${rupiahRingkas(d.spending.last_month)}`
                    : `${perubahan >= 0 ? '+' : ''}${perubahan}% dari bulan lalu`
                }
              />
              <StatCard
                icon="check"
                warna="kuning"
                title="Verifikasi anggaran"
                value={d.queues.budget_verification}
                note={`${d.queues.expense_report_verification} laporan biaya menunggu`}
              />
              <StatCard
                icon="wallet"
                warna="ungu"
                title="Pencairan menunggu"
                value={d.queues.pending_disbursements}
                note={rupiahRingkas(d.queues.pending_disbursement_amount)}
              />
              <StatCard
                icon="grid"
                warna="hijau"
                title="Sisa anggaran"
                value={rupiahRingkas(d.budget.remaining_amount)}
                note={`Dari pagu ${rupiahRingkas(d.budget.amount)}`}
              />
            </div>

            <div className="grid-dua">
              <section className="panel">
                <PanelHeader title="Tren Pengeluaran" subtitle={`Pengeluaran terverifikasi per bulan, ${d.budget.year}`} />
                <GrafikBatang
                  titik={d.spending.monthly_trend.map((b) => ({ label: NAMA_BULAN[b.month - 1].slice(0, 3), nilai: b.total }))}
                  formatNilai={rupiahRingkas}
                />
              </section>
              <PanelSerapan anggaran={d.budget} />
            </div>

            <div className="grid-dua" style={{ marginTop: 16 }}>
              <section className="panel">
                <PanelHeader title="Pengeluaran per Kategori" subtitle="Bulan ini dibanding bulan lalu" />
                <div className="daftar">
                  {d.spending.this_month_by_category.map((k) => {
                    const lalu = d.spending.last_month_by_category.find((x) => x.category === k.category)?.total ?? 0
                    return (
                      <div className="daftar-baris" key={k.category}>
                        <span className="isi">
                          <b>{LABEL_KATEGORI_BIAYA[k.category]}</b>
                          <small>Bulan lalu {rupiah(lalu)}</small>
                        </span>
                        <b className="angka">{rupiah(k.total)}</b>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section className="panel">
                <PanelHeader
                  title="Pencairan Terlama"
                  subtitle="Dana yang paling lama menunggu dibayar"
                  action={
                    <button type="button" className="btn-tautan" onClick={() => onNavigate('Pencairan')}>
                      Buka pencairan
                      <Icon name="chevron" size={14} />
                    </button>
                  }
                />
                {d.oldest_pending_disbursements.length === 0 ? (
                  <Kosong ikon="wallet" judul="Tidak ada" pesan="Semua pencairan sudah dibayar." />
                ) : (
                  <div className="daftar">
                    {d.oldest_pending_disbursements.map((c) => (
                      <div className="daftar-baris" key={c.id}>
                        <span className="isi">
                          <b>
                            {LABEL_JENIS_PENCAIRAN[c.type]} · {c.travel_request?.requester?.name ?? '—'}
                          </b>
                          <small>{c.travel_request?.request_number}</small>
                        </span>
                        <b className="angka">{rupiah(c.amount)}</b>
                        <StatusBadge {...RUPA_STATUS_PENCAIRAN[c.status]} />
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

function DashboardAdmin({ onNavigate, penandaSegar }: DashboardPageProps) {
  const { data, memuat, galat, muatUlang } = usePermintaan(() => apiDashboardAdmin(), [penandaSegar])

  return (
    <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={6}>
      {(d) => (
        <>
          <div className="grid-stat">
            <StatCard icon="users" title="Pengguna" value={d.users.total} note={`${d.users.active} aktif · ${d.users.inactive} nonaktif`} />
            <StatCard icon="gedung" warna="ungu" title="Departemen" value={d.departments.total} note={`${d.departments.active} aktif`} />
            <StatCard
              icon="plane"
              warna="hijau"
              title="Pengajuan tahun ini"
              value={d.travel_requests_this_year.total}
              note="Seluruh departemen"
            />
            <StatCard icon="kunci" warna="kuning" title="Login hari ini" value={d.logins_today} note="Sesi masuk tercatat" />
          </div>

          <div className="grid-dua">
            <section className="panel">
              <PanelHeader
                title="Pengguna per Peran"
                subtitle="Seluruh akun terdaftar"
                action={
                  <button type="button" className="btn-tautan" onClick={() => onNavigate('Pengguna')}>
                    Kelola
                    <Icon name="chevron" size={14} />
                  </button>
                }
              />
              <div className="daftar">
                {d.users.by_role.map((r) => (
                  <div className="daftar-baris" key={r.role}>
                    <span className="isi">
                      <b>{LABEL_PERAN[r.role]}</b>
                    </span>
                    <span className="status netral">{r.total}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <PanelHeader title="Pengajuan per Status" subtitle="Tahun berjalan" />
              <DaftarStatus daftar={d.travel_requests_this_year.by_status} />
            </section>
          </div>

          <section className="panel" style={{ marginTop: 16 }}>
            <PanelHeader
              title="Aktivitas Terbaru"
              subtitle="Sepuluh catatan audit terakhir"
              action={
                <button type="button" className="btn-tautan" onClick={() => onNavigate('Log Audit')}>
                  Log audit
                  <Icon name="chevron" size={14} />
                </button>
              }
            />
            {d.recent_activities.length === 0 ? (
              <Kosong ikon="clock" judul="Belum ada aktivitas" pesan="Aktivitas pengguna akan tercatat di sini." />
            ) : (
              <div className="daftar">
                {d.recent_activities.map((log) => (
                  <div className="daftar-baris" key={log.id}>
                    <span className="isi">
                      <b>{log.description}</b>
                      <small>
                        {log.user?.name ?? 'Sistem'} · {sejak(log.created_at)}
                      </small>
                    </span>
                    <span className="status netral">{LABEL_AKSI_AUDIT[log.action] ?? log.action_label}</span>
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
