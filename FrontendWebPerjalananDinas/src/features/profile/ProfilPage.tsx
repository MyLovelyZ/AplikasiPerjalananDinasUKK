import { useState } from 'react'
import type { FormEvent } from 'react'

import { apiUbahProfil } from '@/api/endpoint'
import { KotakGalat, PesanKolom } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { LABEL_PERAN } from '@/constants/label'
import { useAuth } from '@/auth/useAuth'
import { useKirim } from '@/hooks/useKirim'
import { inisial, waktu } from '@/utils/format'

export function ProfilPage({ onSukses }: { onSukses: (pesan: string) => void }) {
  const { pengguna, perbaruiPengguna } = useAuth()

  const [nama, setNama] = useState(pengguna?.name ?? '')
  const [telepon, setTelepon] = useState(pengguna?.phone ?? '')
  const [foto, setFoto] = useState<File | null>(null)
  const [kunciFoto, setKunciFoto] = useState(0)
  const profil = useKirim()

  const [sandiLama, setSandiLama] = useState('')
  const [sandiBaru, setSandiBaru] = useState('')
  const [sandiUlang, setSandiUlang] = useState('')
  const sandi = useKirim()

  if (!pengguna) return null

  const simpanProfil = async (peristiwa: FormEvent) => {
    peristiwa.preventDefault()
    const hasil = await profil.jalankan(() =>
      apiUbahProfil({ name: nama.trim(), phone: telepon.trim() || null, photo: foto ?? undefined }),
    )
    if (!hasil) return
    perbaruiPengguna(hasil.data)
    setFoto(null)
    setKunciFoto((k) => k + 1)
    onSukses(hasil.message)
  }

  const gantiSandi = async (peristiwa: FormEvent) => {
    peristiwa.preventDefault()
    const hasil = await sandi.jalankan(() =>
      apiUbahProfil({ current_password: sandiLama, password: sandiBaru, password_confirmation: sandiUlang }),
    )
    if (!hasil) return
    setSandiLama('')
    setSandiBaru('')
    setSandiUlang('')
    onSukses('Kata sandi diperbarui. Sesi di perangkat lain telah dikeluarkan.')
  }

  return (
    <>
      <PageHeader eyebrow="Akun" title="Profil" description="Identitas Anda pada sistem dan pengaturan keamanan akun." />

      <div className="grid-dua">
        <section className="panel">
          <PanelHeader title="Profil Akun" subtitle="Data organisasi diatur oleh Super Admin" />
          <div className="kartu-profil">
            <div className="avatar-besar">
              {pengguna.profile_photo_url ? (
                <img
                  src={pengguna.profile_photo_url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                />
              ) : (
                inisial(pengguna.name)
              )}
            </div>
            <div>
              <h3>{pengguna.name}</h3>
              <p>{pengguna.email}</p>
              <div className="daftar-peran">
                <span className="status biru">{LABEL_PERAN[pengguna.role]}</span>
                {!pengguna.is_active && <span className="status merah">Nonaktif</span>}
              </div>
            </div>
          </div>
          <div className="panel-body" style={{ borderTop: '1px solid var(--garis)', display: 'grid', gap: 9 }}>
            <div className="pasangan">
              <span>Nomor pegawai</span>
              <b className="angka">{pengguna.employee_number ?? '—'}</b>
            </div>
            <div className="pasangan">
              <span>Jabatan</span>
              <b>{pengguna.position ?? '—'}</b>
            </div>
            <div className="pasangan">
              <span>Departemen</span>
              <b>{pengguna.department?.name ?? '—'}</b>
            </div>
            {pengguna.role === 'employee' && (
              <div className="pasangan">
                <span>Atasan</span>
                <b>{pengguna.supervisor?.name ?? 'Belum ditetapkan'}</b>
              </div>
            )}
            <div className="pasangan">
              <span>Rekening</span>
              <b>
                {pengguna.bank_name
                  ? `${pengguna.bank_name} ${pengguna.bank_account_number ?? ''} a.n. ${pengguna.bank_account_name ?? '-'}`
                  : '—'}
              </b>
            </div>
            <div className="pasangan">
              <span>Terakhir masuk</span>
              <b>{waktu(pengguna.last_login_at)}</b>
            </div>
          </div>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="panel">
            <PanelHeader title="Ubah Profil" subtitle="Nama, telepon, dan foto" />
            <form className="panel-body" style={{ display: 'grid', gap: 12 }} onSubmit={simpanProfil}>
              <KotakGalat pesan={profil.galat} />
              <div className="bidang">
                <label htmlFor="nama-profil">Nama lengkap</label>
                <input id="nama-profil" value={nama} maxLength={120} onChange={(e) => setNama(e.target.value)} required />
                <PesanKolom pesan={profil.galatKolom.name} />
              </div>
              <div className="bidang">
                <label htmlFor="telepon-profil">Telepon</label>
                <input id="telepon-profil" value={telepon} maxLength={20} onChange={(e) => setTelepon(e.target.value)} />
                <PesanKolom pesan={profil.galatKolom.phone} />
              </div>
              <div className="bidang">
                <label htmlFor="foto-profil">Foto profil</label>
                <input
                  key={kunciFoto}
                  id="foto-profil"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
                />
                <span className="petunjuk">JPG, PNG, atau WebP; maksimal 2 MB.</span>
                <PesanKolom pesan={profil.galatKolom.photo} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn utama" disabled={profil.mengirim || !nama.trim()}>
                  {profil.mengirim ? 'Menyimpan...' : 'Simpan profil'}
                </button>
              </div>
            </form>
          </section>

          <section className="panel">
            <PanelHeader title="Ganti Kata Sandi" subtitle="Perangkat lain akan dikeluarkan otomatis" />
            <form className="panel-body" style={{ display: 'grid', gap: 12 }} onSubmit={gantiSandi}>
              <KotakGalat pesan={sandi.galat} />
              <div className="bidang">
                <label htmlFor="sandi-lama">Kata sandi saat ini</label>
                <input
                  id="sandi-lama"
                  type="password"
                  autoComplete="current-password"
                  value={sandiLama}
                  onChange={(e) => setSandiLama(e.target.value)}
                  required
                />
                <PesanKolom pesan={sandi.galatKolom.current_password} />
              </div>
              <div className="baris-bidang">
                <div className="bidang">
                  <label htmlFor="sandi-baru">Kata sandi baru</label>
                  <input
                    id="sandi-baru"
                    type="password"
                    autoComplete="new-password"
                    value={sandiBaru}
                    onChange={(e) => setSandiBaru(e.target.value)}
                    required
                  />
                  <PesanKolom pesan={sandi.galatKolom.password} />
                </div>
                <div className="bidang">
                  <label htmlFor="sandi-ulang">Ulangi kata sandi baru</label>
                  <input
                    id="sandi-ulang"
                    type="password"
                    autoComplete="new-password"
                    value={sandiUlang}
                    onChange={(e) => setSandiUlang(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn utama"
                  disabled={sandi.mengirim || !sandiLama || !sandiBaru || sandiBaru !== sandiUlang}
                >
                  {sandi.mengirim ? 'Menyimpan...' : 'Ganti kata sandi'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </>
  )
}
