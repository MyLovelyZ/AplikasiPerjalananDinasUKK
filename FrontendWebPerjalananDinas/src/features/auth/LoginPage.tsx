import { useState } from 'react'
import type { FormEvent } from 'react'

import { Icon } from '@/components/ui/Icon'
import { APP_COPYRIGHT, APP_TAGLINE } from '@/constants/app'
import { useAuth } from '@/auth/useAuth'

/** Ringkasan alur aplikasi, mengikuti urutan pada flowchart sistem. */
const LANGKAH = [
  'Ajukan SPPD digital lengkap dengan rincian biaya',
  'Atasan menyetujui, menolak, atau meminta revisi',
  'Uang muka cair, perjalanan berjalan',
  'Unggah nota, Keuangan verifikasi dan menutup selisih',
]

/** Halaman masuk. Satu-satunya layar yang bisa dibuka tanpa token. */
export function LoginPage() {
  const { masuk } = useAuth()

  const [username, setUsername] = useState('')
  const [kataSandi, setKataSandi] = useState('')
  const [galat, setGalat] = useState<string | null>(null)
  const [mengirim, setMengirim] = useState(false)

  const kirim = async (peristiwa: FormEvent) => {
    peristiwa.preventDefault()
    setGalat(null)
    setMengirim(true)

    try {
      await masuk(username.trim(), kataSandi)
    } catch (penyebab: unknown) {
      setGalat(
        penyebab instanceof Error
          ? penyebab.message
          : 'Tidak dapat menghubungi server. Pastikan API berjalan di port 3000.',
      )
    } finally {
      setMengirim(false)
    }
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
            Satu portal untuk pengajuan SPPD, persetujuan berjenjang, pelaporan nota,
            dan penyelesaian dana — tanpa berkas kertas yang berpindah meja.
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
            {galat && (
              <div className="kotak-galat" role="alert">
                <Icon name="peringatan" size={16} />
                <span>{galat}</span>
              </div>
            )}

            <div className="bidang">
              <label htmlFor="username">
                Username<span className="wajib">*</span>
              </label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                placeholder="mis. user24001"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="bidang">
              <label htmlFor="kata-sandi">
                Kata sandi<span className="wajib">*</span>
              </label>
              <input
                id="kata-sandi"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={kataSandi}
                onChange={(e) => setKataSandi(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn utama blok"
              disabled={mengirim || !username || !kataSandi}
            >
              {mengirim ? 'Memeriksa...' : 'Masuk'}
              {!mengirim && <Icon name="arrow" size={17} />}
            </button>

            <div className="kotak-info">
              <strong>Akun contoh untuk pengujian</strong>
              Super Admin <code>user24001</code>, kata sandi <code>password123</code>.
              Akun lain mengikuti pola <code>user2400x</code> dengan kata sandi yang sama.
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
