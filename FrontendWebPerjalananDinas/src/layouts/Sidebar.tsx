import { Icon } from '@/components/ui/Icon'
import { APP_COPYRIGHT, APP_TAGLINE, APP_VERSION } from '@/constants/app'
import { LABEL_PERAN } from '@/constants/label'
import { HALAMAN_ANTREAN, NAV_ITEMS, PROFILE_PAGE } from '@/constants/navigation'
import { useAuth } from '@/auth/useAuth'
import { inisial } from '@/utils/format'
import type { PageKey } from '@/types/navigation'

interface SidebarProps {
  activePage: PageKey
  onNavigate: (page: PageKey) => void
  onSignOut: () => void
  jumlahAntrean: number
  terbuka: boolean
}

export function Sidebar({ activePage, onNavigate, onSignOut, jumlahAntrean, terbuka }: SidebarProps) {
  const { pengguna, berperan } = useAuth()

  const menuTampil = NAV_ITEMS.filter((item) => berperan(...item.peran))
  const nama = pengguna?.name ?? 'Pengguna'

  return (
    <aside className={`sidebar ${terbuka ? 'buka' : ''}`}>
      <div className="brand">
        <div className="logo-wrap">
          <img src="/logo.jpg" alt="Logo DinasGo" />
        </div>
        <div>
          <strong>
            DINAS<span>GO</span>
          </strong>
          <small>{APP_TAGLINE}</small>
        </div>
      </div>

      <div className="workspace">
        <div className="avatar">{inisial(nama)}</div>
        <div className="identitas">
          <b>{nama}</b>
          <small>
            {pengguna ? LABEL_PERAN[pengguna.role] : ''}
            {pengguna?.department ? ` · ${pengguna.department.name}` : ''}
          </small>
        </div>
      </div>

      <nav>
        <div className="nav-label">Menu</div>
        {menuTampil.map(({ key, icon }) => (
          <button
            key={key}
            type="button"
            className={activePage === key ? 'active' : ''}
            aria-current={activePage === key ? 'page' : undefined}
            onClick={() => onNavigate(key)}
          >
            <Icon name={icon} />
            <span>{key}</span>
            {HALAMAN_ANTREAN.includes(key) && jumlahAntrean > 0 && <em>{jumlahAntrean}</em>}
          </button>
        ))}
      </nav>

      <div className="nav-bottom">
        <button
          type="button"
          className={activePage === PROFILE_PAGE ? 'active' : ''}
          aria-current={activePage === PROFILE_PAGE ? 'page' : undefined}
          onClick={() => onNavigate(PROFILE_PAGE)}
        >
          <Icon name="pengguna" />
          <span>{PROFILE_PAGE}</span>
        </button>
        <button type="button" className="keluar" onClick={onSignOut}>
          <Icon name="logout" />
          <span>Keluar</span>
        </button>
      </div>

      <div className="sidebar-foot">
        Versi {APP_VERSION}
        <br />
        <span>{APP_COPYRIGHT}</span>
      </div>
    </aside>
  )
}
