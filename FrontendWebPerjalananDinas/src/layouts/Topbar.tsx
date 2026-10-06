import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/auth/useAuth'
import { inisial } from '@/utils/format'
import type { PageKey } from '@/types/navigation'

interface TopbarProps {
  activePage: PageKey
  searchQuery: string
  onSearchChange: (value: string) => void
  onBukaMenu: () => void
  onBukaProfil: () => void
}

export function Topbar({ activePage, searchQuery, onSearchChange, onBukaMenu, onBukaProfil }: TopbarProps) {
  const { pengguna } = useAuth()
  const nama = pengguna?.name ?? ''

  return (
    <header className="topbar">
      <button type="button" className="mobile-menu" aria-label="Buka menu navigasi" onClick={onBukaMenu}>
        <Icon name="menu" />
      </button>

      <div className="crumb">
        <span>Portal</span>
        <b>/</b>
        <strong>{activePage}</strong>
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

        <button type="button" className="top-avatar" title={nama} onClick={onBukaProfil}>
          {pengguna?.profile_photo_url ? (
            <img src={pengguna.profile_photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
          ) : (
            inisial(nama)
          )}
        </button>
      </div>
    </header>
  )
}
