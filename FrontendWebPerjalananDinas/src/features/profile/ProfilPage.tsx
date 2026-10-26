import { useRef, useState } from 'react'
import type { FormEvent } from 'react'

import { apiUbahProfil } from '@/api/endpoint'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { KotakGalat, PesanKolom } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { LABEL_PERAN } from '@/constants/label'
import { useAuth } from '@/auth/useAuth'
import { useKirim } from '@/hooks/useKirim'
import { useAplikasi } from '@/layouts/konteksAplikasi'
import { ukuranBerkas, waktu } from '@/utils/format'

/** Sama dengan aturan backend: image, mimes:jpg,jpeg,png,webp, max:2048 (KB). */
const JENIS_FOTO = ['image/jpeg', 'image/png', 'image/webp']
const MAKS_FOTO = 2 * 1024 * 1024

/** /profile — terbuka untuk keempat peran. */
export function ProfilPage() {
  const { sukses: onSukses } = useAplikasi()
  const { pengguna, perbaruiPengguna } = useAuth()

  const [nama, setNama] = useState(pengguna?.name ?? '')
  const [telepon, setTelepon] = useState(pengguna?.phone ?? '')
  const [foto, setFoto] = useState<File | null>(null)
  // Pratinjau foto baru (data URL) yang tampil sebelum disimpan.
  const [pratinjau, setPratinjau] = useState<string | null>(null)
  const [galatFoto, setGalatFoto] = useState<string | null>(null)
  const [kunciFoto, setKunciFoto] = useState(0)
  const inputFotoRef = useRef<HTMLInputElement>(null)
  const profil = useKirim()

  const [sandiLama, setSandiLama] = useState('')
  const [sandiBaru, setSandiBaru] = useState('')
  const [sandiUlang, setSandiUlang] = useState('')
  const sandi = useKirim()

  if (!pengguna) return null

  /** Lupakan foto yang dipilih; isian file dikosongkan agar berkas yang sama bisa dipilih lagi. */
  const batalFoto = () => {
    setFoto(null)
    setPratinjau(null)
    setKunciFoto((k) => k + 1)
  }

  const pilihFoto = (berkas: File | undefined) => {
    setGalatFoto(null)
    if (!berkas) return
    if (!JENIS_FOTO.includes(berkas.type)) {
      setGalatFoto('Pilih gambar berformat JPG, PNG, atau WebP.')
      batalFoto()
      return
    }
    if (berkas.size > MAKS_FOTO) {
      setGalatFoto(`Ukuran foto ${ukuranBerkas(berkas.size)}; maksimal 2 MB.`)
      batalFoto()
      return
    }
    const pembaca = new FileReader()
    pembaca.onload = () => {
      setFoto(berkas)
      setPratinjau(String(pembaca.result))
    }
    pembaca.readAsDataURL(berkas)
  }

  const simpanProfil = async (peristiwa: FormEvent) => {
    peristiwa.preventDefault()
    const hasil = await profil.jalankan(() =>
      apiUbahProfil({ name: nama.trim(), phone: telepon.trim() || null, photo: foto ?? undefined }),
    )
    if (!hasil) return
    perbaruiPengguna(hasil.data)
    batalFoto()
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
            <Avatar nama={pengguna.name} foto={pengguna.profile_photo_url} ukuran="besar" />
            <div>
              <h3>{pengguna.name}</h3>
              <p>{pengguna.email}</p>
              <div className="daftar-peran">
                <span className="status hijau">{LABEL_PERAN[pengguna.role]}</span>
                {!pengguna.is_active && <span className="status merah">Nonaktif</span>}
              </div>
            </div>
          </div>
          <div className="panel-body" style={{ borderTop: '1px solid var(--garis)', display: 'grid', gap: 9 }}>
            <div className="pasangan">
              <span>Nomor karyawan</span>
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
                <span>Supervisor</span>
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
                {/* Foto baru langsung tampil sebagai pratinjau; baru tersimpan setelah "Simpan profil". */}
                <div className={`pilih-foto ${foto ? 'baru' : ''}`}>
                  <Avatar nama={nama || pengguna.name} foto={pratinjau ?? pengguna.profile_photo_url} ukuran="jumbo" />
                  <div className="pilih-foto-isi">
                    <b>{foto ? 'Pratinjau foto baru' : pengguna.profile_photo_url ? 'Foto saat ini' : 'Belum ada foto'}</b>
                    <small>
                      {foto
                        ? `${foto.name} · ${ukuranBerkas(foto.size)}. Belum disimpan — klik "Simpan profil" untuk memakainya.`
                        : 'JPG, PNG, atau WebP; maksimal 2 MB.'}
                    </small>
                    <div className="pilih-foto-aksi">
                      <button type="button" className="btn kecil" onClick={() => inputFotoRef.current?.click()}>
                        <Icon name="unggah" size={15} />
                        {foto || pengguna.profile_photo_url ? 'Ganti foto' : 'Pilih foto'}
                      </button>
                      {foto && (
                        <button type="button" className="btn kecil" onClick={batalFoto}>
                          <Icon name="x" size={15} />
                          Batalkan
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    ref={inputFotoRef}
                    key={kunciFoto}
                    id="foto-profil"
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    hidden
                    onChange={(e) => pilihFoto(e.target.files?.[0])}
                  />
                </div>
                <PesanKolom pesan={galatFoto ?? profil.galatKolom.photo} />
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
