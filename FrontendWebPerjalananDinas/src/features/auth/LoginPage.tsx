import { useState } from 'react'
import type { FormEvent } from 'react'

import { Icon } from '@/components/ui/Icon'
import { KotakGalat } from '@/components/ui/Modal'
import { APP_COPYRIGHT, APP_TAGLINE } from '@/constants/app'
import { useAuth } from '@/auth/useAuth'
import { useKirim } from '@/hooks/useKirim'

const LANGKAH = [
  'Pegawai mengajukan perjalanan dinas beserta estimasi biaya',
  'Atasan menyetujui atau menolak pengajuan tim',
  'Keuangan memverifikasi anggaran dan mencairkan uang muka',
  'Pegawai melaporkan biaya, Keuangan memverifikasi dan menutup selisih',
]

/** Akun hasil `php artisan db:seed`; semuanya berkata sandi `password`. */
const AKUN_CONTOH = [
  { peran: 'Super Admin', email: 'admin@citramandiri.test' },
  { peran: 'Atasan', email: 'supervisor@citramandiri.test' },
  { peran: 'Keuangan', email: 'finance@citramandiri.test' },
  { peran: 'Pegawai', email: 'employee@citramandiri.test' },
]

export function LoginPage() {
  const { masuk } = useAuth()
  const { mengirim, galat, galatKolom, jalankan } = useKirim()

  const [email, setEmail] = useState('')
  const [kataSandi, setKataSandi] = useState('')

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
        <div className="masuk-merek">
          <img src="/logo.jpg" alt="Logo DinasGo" />
          <div>
            <strong>
              DINAS<span>GO</span>
            </strong>
            <small>{APP_TAGLINE}</small>
          </div>
        </div>

        <div className="masuk-utama">
          <h2>Perjalanan dinas, dari pengajuan sampai pencairan.</h2>
          <p>
            Satu portal untuk pengajuan, persetujuan atasan, verifikasi anggaran,
            laporan biaya, dan pencairan dana — tanpa berkas kertas yang berpindah meja.
          </p>

          <div className="masuk-langkah">
            {LANGKAH.map((teks, indeks) => (
              <div key={teks}>
                <span>{indeks + 1}</span>
                {teks}
              </div>
            ))}
          </div>
        </div>

        <div className="masuk-kaki">{APP_COPYRIGHT}</div>
      </section>

      <section className="masuk-panel">
        <div className="masuk-kotak">
          <h1>Masuk ke portal</h1>
          <p>Gunakan akun yang diberikan administrator perusahaan.</p>

          <form className="masuk-formulir" onSubmit={kirim}>
            <KotakGalat pesan={galat} />

            <div className="bidang">
              <label htmlFor="email">
                Email<span className="wajib">*</span>
              </label>
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

            <div className="bidang">
              <label htmlFor="kata-sandi">
                Kata sandi<span className="wajib">*</span>
              </label>
              <input
                id="kata-sandi"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={kataSandi}
                onChange={(e) => setKataSandi(e.target.value)}
                required
              />
              {galatKolom.password && <span className="pesan-galat">{galatKolom.password}</span>}
            </div>

            <button type="submit" className="btn utama blok" disabled={mengirim || !email || !kataSandi}>
              {mengirim ? 'Memeriksa...' : 'Masuk'}
              {!mengirim && <Icon name="arrow" size={17} />}
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
    </div>
  )
}
