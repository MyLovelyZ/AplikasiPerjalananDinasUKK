import { useState } from 'react'
import type { FormEvent } from 'react'

import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/auth/useAuth'

export function LoginPage() {
  const { masuk } = useAuth()

  const [username, setUsername] = useState('')
  const [kataSandi, setKataSandi] = useState('')
  const [tampilkanSandi, setTampilkanSandi] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [mengirim, setMengirim] = useState(false)
  const [dialogLupaSandi, setDialogLupaSandi] = useState(false)

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
      {/* Sisi Kiri: Panel Gelap Sesuai Gambar */}
      <section className="masuk-sisi">
        {/* Latar Belakang Kartu Samar (Watermark Tripflow) */}
        <div className="masuk-sisi-kartu-latar" aria-hidden="true">
          <div className="kartu-latar-header">
            <span className="kartu-latar-logo">T</span>
            <span className="kartu-latar-brand">Tripflow</span>
          </div>
          <div className="kartu-latar-title">Welcome Back!</div>
        </div>

        {/* Konten Utama Sisi Kiri */}
        <div className="masuk-sisi-konten">
          {/* Tagline / Perusahaan */}
          <div className="masuk-sisi-perusahaan">
            <strong>corporate_fare</strong>
            <span>PT. Citra Mandiri</span>
          </div>

          {/* Judul Utama */}
          <h1 className="masuk-sisi-judul">
            Welcome to the SPPD Travel &amp; Expense Portal
          </h1>

          {/* Kotak Deskripsi */}
          <div className="masuk-sisi-deskripsi">
            Streamline your corporate travel requests, manage expenses, and track
            approvals in one unified platform.
          </div>
        </div>
      </section>

      {/* Sisi Kanan: Formulir Masuk Sesuai Gambar */}
      <section className="masuk-panel">
        <div className="masuk-kotak">
          <h2 className="masuk-judul">Welcome Back</h2>
          <p className="masuk-subjudul">Please sign in to your account</p>

          <form className="masuk-formulir" onSubmit={kirim}>
            {galat && (
              <div className="kotak-galat" role="alert">
                <Icon name="peringatan" size={16} />
                <span>{galat}</span>
              </div>
            )}

            {/* Field: EMAIL OR NIK */}
            <div className="masuk-bidang">
              <label htmlFor="login-username" className="masuk-label">
                EMAIL OR NIK
              </label>
              <div className="masuk-input-wadah">
                <span className="masuk-input-ikon">
                  <Icon name="pengguna" size={18} />
                </span>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Enter your email or NIK"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Field: PASSWORD */}
            <div className="masuk-bidang">
              <div className="masuk-baris-label">
                <label htmlFor="login-password" className="masuk-label">
                  PASSWORD
                </label>
                <button
                  type="button"
                  className="masuk-tautan-lupa"
                  onClick={() => setDialogLupaSandi(true)}
                >
                  Forgot Password?
                </button>
              </div>
              <div className="masuk-input-wadah">
                <span className="masuk-input-ikon">
                  <Icon name="kunci" size={18} />
                </span>
                <input
                  id="login-password"
                  name="password"
                  type={tampilkanSandi ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={kataSandi}
                  onChange={(e) => setKataSandi(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="masuk-tombol-mata"
                  aria-label={tampilkanSandi ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  onClick={() => setTampilkanSandi((prev) => !prev)}
                >
                  <Icon name={tampilkanSandi ? 'eyeOff' : 'eye'} size={18} />
                </button>
              </div>
            </div>

            {/* Tombol Login */}
            <button
              type="submit"
              className="masuk-tombol-kirim"
              disabled={mengirim || !username || !kataSandi}
            >
              <span>{mengirim ? 'Logging in...' : 'Login'}</span>
              <Icon name="arrow" size={16} />
            </button>

            {/* Akun Contoh untuk Pengujian */}
            <div className="masuk-info-uji">
              <strong>Akun contoh:</strong> Super Admin <code>user24001</code> / sandi <code>password123</code>
            </div>
          </form>
        </div>
      </section>

      {/* Modal Dialog Lupa Kata Sandi */}
      {dialogLupaSandi && (
        <div className="modal-backdrop" onClick={() => setDialogLupaSandi(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-head">
              <div>
                <h2>Bantuan Lupa Kata Sandi</h2>
                <p>Pengaturan ulang kredensial akun</p>
              </div>
              <button
                type="button"
                className="tombol-tutup"
                onClick={() => setDialogLupaSandi(false)}
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6 }}>
              <p>
                Untuk alasan keamanan dan integritas data SPPD PT. Citra Mandiri,
                pengaturan ulang kata sandi dilakukan secara terpusat oleh administrator.
              </p>
              <p>
                Silakan hubungi <strong>Divisi IT</strong> atau <strong>Divisi SDM / HRD</strong> perusahaan dengan menyertakan NIK Anda.
              </p>
            </div>
            <div className="modal-kaki">
              <button
                type="button"
                className="btn utama"
                onClick={() => setDialogLupaSandi(false)}
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
