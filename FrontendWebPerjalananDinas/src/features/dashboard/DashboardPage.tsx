import { apiRingkasanDashboard } from '@/api/endpoint'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Muatan } from '@/components/ui/Keadaan'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/auth/useAuth'
import { usePermintaan } from '@/hooks/usePermintaan'
import { GrafikTren } from '@/features/dashboard/components/GrafikTren'
import { PanelSerapan } from '@/features/dashboard/components/PanelSerapan'
import { rentangTanggal, rupiahRingkas, rupaStatusSppd } from '@/utils/format'
import type { PageKey } from '@/types/navigation'

interface DashboardPageProps {
  onBuatSppd: () => void
  onNavigate: (halaman: PageKey) => void
  onBukaSppd: (id: number) => void
}

/**
 * Halaman depan. Seluruh angkanya berasal dari satu panggilan
 * GET /api/dashboard/ringkasan, sehingga isinya selalu konsisten satu sama
 * lain — tidak ada panel yang menampilkan data dari waktu berbeda.
 */
export function DashboardPage({ onBuatSppd, onNavigate, onBukaSppd }: DashboardPageProps) {
  const { profil, boleh } = useAuth()
  const { data, memuat, galat, muatUlang } = usePermintaan(() => apiRingkasanDashboard(), [])

  const namaDepan = (profil?.karyawan?.nama_lengkap ?? profil?.username ?? '').split(' ')[0]

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Portal Perjalanan Dinas</p>
          <h1>Selamat datang, {namaDepan || 'Rekan'}.</h1>
          <p>
            Pantau pengajuan, persetujuan, dan pertanggungjawaban perjalanan dinas
            Anda dari satu tempat.
          </p>
        </div>

        <div className="hero-aksi">
          {boleh('sppd.buat') && (
            <button type="button" className="btn" onClick={onBuatSppd}>
              <Icon name="plus" size={17} />
              Ajukan Perjalanan
            </button>
          )}
          <button
            type="button"
            className="btn tembus"
            onClick={() => onNavigate('Perjalanan Saya')}
          >
            Lihat Perjalanan
            <Icon name="arrow" size={17} />
          </button>
        </div>
      </section>

      <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={6}>
        {(ringkasan) => (
          <>
            <div className="grid-stat">
              <StatCard
                icon="file"
                title="Total Pengajuan"
                value={ringkasan.total_sppd}
                note={`Sepanjang tahun ${ringkasan.tahun}`}
              />
              <StatCard
                icon="clock"
                warna="kuning"
                title="Menunggu Persetujuan"
                value={ringkasan.kartu.menunggu}
                note={
                  ringkasan.kartu.perlu_revisi > 0
                    ? `${ringkasan.kartu.perlu_revisi} perlu direvisi`
                    : 'Tidak ada yang perlu direvisi'
                }
              />
              <StatCard
                icon="check"
                warna="hijau"
                title="Disetujui & Berjalan"
                value={ringkasan.kartu.disetujui + ringkasan.kartu.diproses}
                note={`${ringkasan.kartu.selesai} sudah selesai`}
              />
              <StatCard
                icon="wallet"
                warna="ungu"
                title="Estimasi Biaya"
                value={rupiahRingkas(ringkasan.biaya.total_estimasi)}
                note={`Uang muka ${rupiahRingkas(ringkasan.biaya.total_uang_muka)}`}
              />
            </div>

            {ringkasan.tugas_persetujuan_saya > 0 && (
              <div className="panel" style={{ marginBottom: 16 }}>
                <div className="peringatan-plafon" style={{ margin: 14, borderRadius: 9 }}>
                  <Icon name="clock" size={17} />
                  <span>
                    <b>{ringkasan.tugas_persetujuan_saya} pengajuan</b> menunggu keputusan
                    Anda.{' '}
                    <button
                      type="button"
                      className="btn-tautan"
                      onClick={() => onNavigate('Persetujuan')}
                    >
                      Buka antrean persetujuan
                    </button>
                  </span>
                </div>
              </div>
            )}

            <div className="grid-dua">
              <section className="panel">
                <PanelHeader
                  title="Tren Perjalanan Dinas"
                  subtitle={`Jumlah pengajuan per bulan sepanjang ${ringkasan.tahun}`}
                />
                <GrafikTren titik={ringkasan.tren_bulanan} />
              </section>

              <section className="panel">
                <PanelHeader
                  title="Tujuan Terpopuler"
                  subtitle="Kota yang paling sering dikunjungi"
                />
                {ringkasan.tujuan_teratas.length === 0 ? (
                  <Kosong
                    ikon="map"
                    judul="Belum ada data tujuan"
                    pesan="Angka ini terisi setelah ada perjalanan yang diajukan."
                  />
                ) : (
                  <div className="daftar">
                    {ringkasan.tujuan_teratas.slice(0, 6).map((tujuan, indeks) => (
                      <div className="daftar-baris" key={tujuan.lokasi_id}>
                        <span className="lencana-urut">{indeks + 1}</span>
                        <span className="isi">
                          <b>{tujuan.nama_kota}</b>
                          <small>{rupiahRingkas(tujuan.total_biaya)}</small>
                        </span>
                        <span className="status netral">{tujuan.jumlah}×</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="grid-dua" style={{ marginTop: 16 }}>
              <section className="panel">
                <PanelHeader
                  title="Perjalanan Terkini"
                  subtitle="Pengajuan yang paling baru dibuat"
                  action={
                    <button
                      type="button"
                      className="btn-tautan"
                      onClick={() => onNavigate('Perjalanan Saya')}
                    >
                      Lihat semua
                      <Icon name="chevron" size={14} />
                    </button>
                  }
                />
                {ringkasan.perjalanan_terkini.length === 0 ? (
                  <Kosong
                    ikon="plane"
                    judul="Belum ada perjalanan"
                    pesan="Mulai dengan mengajukan perjalanan dinas pertama Anda."
                    aksi={
                      boleh('sppd.buat') ? (
                        <button type="button" className="btn kecil utama" onClick={onBuatSppd}>
                          <Icon name="plus" size={15} />
                          Ajukan sekarang
                        </button>
                      ) : undefined
                    }
                  />
                ) : (
                  <div className="daftar">
                    {ringkasan.perjalanan_terkini.map((sppd) => {
                      const rupa = rupaStatusSppd(sppd.status)
                      return (
                        <button
                          key={sppd.id}
                          type="button"
                          className="daftar-baris"
                                                   onClick={() => onBukaSppd(sppd.id)}
                        >
                          <span className="isi">
                            <b>
                              {sppd.nomor_sppd} · {sppd.keperluan}
                            </b>
                            <small>
                              {sppd.lokasiTujuan?.nama_kota ?? sppd.tujuan_lainnya ?? '—'} ·{' '}
                              {rentangTanggal(sppd.tanggal_berangkat, sppd.tanggal_kembali)}
                            </small>
                          </span>
                          <StatusBadge label={rupa.label} warna={rupa.warna} />
                        </button>
                      )
                    })}
                  </div>
                )}
              </section>

              {ringkasan.serapan_anggaran && (
                <PanelSerapan daftar={ringkasan.serapan_anggaran} tahun={ringkasan.tahun} />
              )}
            </div>

            {ringkasan.antrean_keuangan && (
              <div className="grid-stat" style={{ marginTop: 16, marginBottom: 0 }}>
                <StatCard
                  icon="file"
                  warna="kuning"
                  title="Laporan Menunggu Verifikasi"
                  value={ringkasan.antrean_keuangan.laporan_menunggu_verifikasi}
                  note="Perlu diperiksa Tim Keuangan"
                />
                <StatCard
                  icon="wallet"
                  title="Uang Muka Belum Cair"
                  value={ringkasan.antrean_keuangan.uang_muka_belum_dicairkan}
                  note="SPPD disetujui, dana belum diproses"
                />
                <StatCard
                  icon="clock"
                  warna="ungu"
                  title="Pencairan Berjalan"
                  value={ringkasan.antrean_keuangan.pencairan_berjalan}
                  note="Menunggu atau sedang diproses"
                />
              </div>
            )}
          </>
        )}
      </Muatan>
    </>
  )
}
