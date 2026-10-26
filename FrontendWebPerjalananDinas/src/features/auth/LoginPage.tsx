import { useState } from 'react'
import type { FormEvent } from 'react'

import { Icon } from '@/components/ui/Icon'
import { KotakGalat, Modal, PesanKolom } from '@/components/ui/Modal'
import { TombolTema } from '@/components/ui/TombolTema'
import { APP_COPYRIGHT } from '@/constants/app'
import { useAuth } from '@/auth/useAuth'
import { useKirim } from '@/hooks/useKirim'
import type { IconName } from '@/types/icon'

/** Ringkasan tugas tiap peran, ditampilkan di panel kiri. */
const PERAN: Array<{ ikon: IconName; judul: string; teks: string }> = [
  { ikon: 'plane', judul: 'Karyawan', teks: 'Mengajukan perjalanan dinas beserta berkas pendukungnya.' },
  { ikon: 'check', judul: 'Supervisor', teks: 'Menyetujui atau menolak pengajuan anggota tim.' },
  { ikon: 'wallet', judul: 'Manajer Keuangan', teks: 'Mengatur anggaran, memverifikasi, dan mencairkan dana.' },
  { ikon: 'users', judul: 'Super Admin', teks: 'Mengelola seluruh akun pengguna aplikasi.' },
]

/** Akun hasil `php artisan db:seed`; semuanya berkata sandi `password`. */
const AKUN_CONTOH = [
  { peran: 'Super Admin', email: 'admin@citramandiri.test' },
  { peran: 'Supervisor', email: 'supervisor@citramandiri.test' },
  { peran: 'Manajer Keuangan', email: 'finance@citramandiri.test' },
  { peran: 'Karyawan', email: 'employee@citramandiri.test' },
]

export function LoginPage() {
  const { masuk } = useAuth()
  const { mengirim, galat, galatKolom, jalankan } = useKirim()

  const [email, setEmail] = useState('')
  const [kataSandi, setKataSandi] = useState('')
  const [tampilkanSandi, setTampilkanSandi] = useState(false)
  const [dialogLupaSandi, setDialogLupaSandi] = useState(false)

  const kirim = (peristiwa: FormEvent) => {
    peristiwa.preventDefault()
    void jalankan(() => masuk(email.trim(), kataSandi))
  }

  const pakaiAkun = (alamat: string) => {
    setEmail(alamat)
    setKataSandi('password')
  }

  return (
    <div className="layar-masuk">
      <section className="masuk-sisi">
        <div className="sidebar-merek">
          <span className="sidebar-logo">
            <Icon name="plane" size={20} />
          </span>
          <div>
            <strong>Travel Portal</strong>
            <small>PT. Citra Mandiri</small>
          </div>
        </div>

        <div className="masuk-utama">
          <h2>Perjalanan dinas, dari pengajuan sampai pencairan.</h2>
          <p>Satu portal untuk pengajuan, persetujuan, verifikasi anggaran, laporan biaya, dan pencairan dana.</p>

          <div className="masuk-peran">
            {PERAN.map((p) => (
              <div key={p.judul}>
                <span>
                  <Icon name={p.ikon} size={16} />
                </span>
                <div>
                  <b>{p.judul}</b>
                  <small>{p.teks}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="masuk-kaki">{APP_COPYRIGHT}</div>
      </section>

      <section className="masuk-panel">
        <div className="masuk-tema">
          <TombolTema />
        </div>

        <div className="masuk-kotak">
          <h1>Masuk ke akun Anda</h1>
          <p>Gunakan akun yang diberikan administrator perusahaan.</p>

          <form className="masuk-formulir" onSubmit={kirim}>
            <KotakGalat pesan={galat} />

            <div className="bidang">
              <label htmlFor="email">Email</label>
              <div className="input-ikon">
                <Icon name="pengguna" size={17} />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="nama@citramandiri.test"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <PesanKolom pesan={galatKolom.email} />
            </div>

            <div className="bidang">
              <div className="label-baris">
                <label htmlFor="kata-sandi">Kata sandi</label>
                <button type="button" className="btn-tautan" onClick={() => setDialogLupaSandi(true)}>
                  Lupa kata sandi?
                </button>
              </div>
              <div className="input-ikon">
                <Icon name="kunci" size={17} />
                <input
                  id="kata-sandi"
                  type={tampilkanSandi ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={kataSandi}
                  onChange={(e) => setKataSandi(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="tombol-mata"
                  aria-label={tampilkanSandi ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  onClick={() => setTampilkanSandi((prev) => !prev)}
                >
                  <Icon name={tampilkanSandi ? 'eyeOff' : 'eye'} size={17} />
                </button>
              </div>
              <PesanKolom pesan={galatKolom.password} />
            </div>

            <button type="submit" className="btn utama blok besar" disabled={mengirim || !email || !kataSandi}>
              {mengirim ? 'Memeriksa...' : 'Masuk'}
              {!mengirim && <Icon name="arrow" size={16} />}
            </button>

            <div className="kotak-info">
              <strong>Akun contoh (kata sandi: password)</strong>
              {AKUN_CONTOH.map((akun) => (
                <div key={akun.email}>
                  {akun.peran}:{' '}
                  <button type="button" className="btn-tautan" onClick={() => pakaiAkun(akun.email)}>
                    {akun.email}
                  </button>
                </div>
              ))}
            </div>
          </form>
        </div>
      </section>

      {dialogLupaSandi && (
        <Modal
          judul="Lupa kata sandi"
          keterangan="Pengaturan ulang dilakukan oleh administrator"
          ukuran="sempit"
          onTutup={() => setDialogLupaSandi(false)}
          kaki={
            <button type="button" className="btn utama" onClick={() => setDialogLupaSandi(false)}>
              Mengerti
            </button>
          }
        >
          <p>
            Demi keamanan data perjalanan dinas, kata sandi diatur ulang secara terpusat oleh Super Admin. Hubungi
            Divisi IT atau SDM perusahaan dengan menyertakan email akun Anda.
          </p>
        </Modal>
      )}
    </div>
  )
}
