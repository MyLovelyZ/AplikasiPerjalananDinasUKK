import { Icon } from '@/components/ui/Icon'
import { CURRENT_USER } from '@/data/currentUser'
import type { PageKey } from '@/types/navigation'

interface TopbarProps {
  activePage: PageKey
  searchQuery: string
  onSearchChange: (value: string) => void
}

/** Bilah atas: breadcrumb halaman aktif, pencarian, notifikasi, dan avatar. */
export function Topbar({ activePage, searchQuery, onSearchChange }: TopbarProps) {
  return (
    <header className="topbar">
      <button type="button" className="mobile-menu" aria-label="Buka menu navigasi">
        <Icon name="menu" />
      </button>

      <div className="crumb">
        <span>Portal</span>
        <b>/</b>
        <strong>{activePage}</strong>
      </div>

      <div className="top-actions">
        <div className="search">
          <Icon name="search" size={18} />
          <input
            aria-label="Cari perjalanan"
            placeholder="Cari perjalanan..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <button type="button" className="icon-btn" aria-label="Notifikasi">
          <Icon name="bell" />
          <i></i>
        </button>
        <div className="top-avatar">{CURRENT_USER.initials}</div>
      </div>
    </header>
  )
}
