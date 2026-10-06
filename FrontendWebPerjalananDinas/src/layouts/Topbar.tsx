import { Link, useLocation } from 'react-router'

import { Icon } from '@/components/ui/Icon'
import { MENU_PROFIL, menuAktif } from '@/constants/navigation'
import { useAuth } from '@/auth/useAuth'
import { inisial } from '@/utils/format'

interface TopbarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  onBukaMenu: () => void
}

export function Topbar({ searchQuery, onSearchChange, onBukaMenu }: TopbarProps) {
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
