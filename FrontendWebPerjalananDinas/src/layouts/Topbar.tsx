import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { apiDaftarNotifikasi, apiTandaiSemuaDibaca } from '@/api/endpoint'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Memuat } from '@/components/ui/Keadaan'
import { MENU_NOTIFIKASI, MENU_PROFIL, menuAktif } from '@/constants/navigation'
import { useAuth } from '@/auth/useAuth'
import { BarisNotifikasi } from '@/features/notifications/components/BarisNotifikasi'
import { usePermintaan } from '@/hooks/usePermintaan'
import { inisial } from '@/utils/format'

interface TopbarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  onBukaMenu: () => void
  jumlahBelumDibaca: number
  /** Diberi tahu saat notifikasi dibaca, agar hitungan di lencana ikut turun. */
  onNotifikasiBerubah: () => void
}

export function Topbar({ searchQuery, onSearchChange, onBukaMenu, jumlahBelumDibaca, onNotifikasiBerubah }: TopbarProps) {
  const { pengguna } = useAuth()
  const { pathname } = useLocation()
  const nama = pengguna?.name ?? ''
  const judul = pengguna ? (menuAktif(pengguna.role, pathname)?.label ?? 'Halaman') : ''

  return (
    <header className="topbar">
      <button type="button" className="mobile-menu" aria-label="Buka menu navigasi" onClick={onBukaMenu}>
        <Icon name="menu" />
      </button>

      <div className="crumb">
        <span>Portal</span>
        <b>/</b>
        <strong>{judul}</strong>
      </div>

      <div className="top-actions">
        <div className="search">
          <Icon name="search" size={17} />
          <input
            aria-label="Cari pada halaman ini"
            placeholder="Cari nomor, nama, atau keperluan..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        <LaciNotifikasi jumlahBelumDibaca={jumlahBelumDibaca} onBerubah={onNotifikasiBerubah} />

        <Link to={MENU_PROFIL.jalur} className="top-avatar" title={nama}>
          {pengguna?.profile_photo_url ? (
            <img src={pengguna.profile_photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
          ) : (
            inisial(nama)
          )}
        </Link>
      </div>
    </header>
  )
}

/** Lonceng dengan lencana belum dibaca dan laci berisi notifikasi terbaru. */
function LaciNotifikasi({ jumlahBelumDibaca, onBerubah }: { jumlahBelumDibaca: number; onBerubah: () => void }) {
  const [terbuka, setTerbuka] = useState(false)
  const pembungkusRef = useRef<HTMLDivElement>(null)

  // Daftar diambil saat laci dibuka dan setiap kali hitungan berubah selagi terbuka.
  const { data, muatUlang } = usePermintaan(
    async () => (terbuka ? (await apiDaftarNotifikasi({ per_page: 8 })).data : null),
    [terbuka, jumlahBelumDibaca],
  )

  // Laci ditutup saat pengguna mengklik di luar area atau menekan Escape.
  useEffect(() => {
    if (!terbuka) return

    const klikDiLuar = (peristiwa: MouseEvent) => {
      if (!pembungkusRef.current?.contains(peristiwa.target as Node)) setTerbuka(false)
    }
    const tekanEscape = (peristiwa: KeyboardEvent) => {
      if (peristiwa.key === 'Escape') setTerbuka(false)
    }

    document.addEventListener('mousedown', klikDiLuar)
    document.addEventListener('keydown', tekanEscape)
    return () => {
      document.removeEventListener('mousedown', klikDiLuar)
      document.removeEventListener('keydown', tekanEscape)
    }
  }, [terbuka])

  const berubah = () => {
    muatUlang()
    onBerubah()
  }

  const bacaSemua = async () => {
    await apiTandaiSemuaDibaca().catch(() => null)
    berubah()
  }

  return (
    <div className="pembungkus-notif" ref={pembungkusRef}>
      <button
        type="button"
        className="icon-btn"
        aria-label={`Notifikasi, ${jumlahBelumDibaca} belum dibaca`}
        aria-expanded={terbuka}
        onClick={() => setTerbuka((buka) => !buka)}
      >
        <Icon name="bell" />
        {jumlahBelumDibaca > 0 && <i className="titik">{jumlahBelumDibaca > 9 ? '9+' : jumlahBelumDibaca}</i>}
      </button>

      {terbuka && (
        <div className="laci-notif">
          <div className="laci-notif-head">
            <h3>Notifikasi</h3>
            {jumlahBelumDibaca > 0 && (
              <button type="button" className="btn-tautan" onClick={bacaSemua}>
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="laci-notif-isi">
            {data === null ? (
              <Memuat baris={3} />
            ) : data.length === 0 ? (
              <Kosong
                ikon="bell"
                judul="Belum ada notifikasi"
                pesan="Pemberitahuan pengajuan, persetujuan, dan pembayaran akan muncul di sini."
              />
            ) : (
              data.map((n) => (
                <BarisNotifikasi key={n.id} notifikasi={n} onBerubah={berubah} onBuka={() => setTerbuka(false)} />
              ))
            )}
          </div>

          <Link to={MENU_NOTIFIKASI.jalur} className="laci-notif-kaki" onClick={() => setTerbuka(false)}>
            Lihat semua notifikasi
          </Link>
        </div>
      )}
    </div>
  )
}
