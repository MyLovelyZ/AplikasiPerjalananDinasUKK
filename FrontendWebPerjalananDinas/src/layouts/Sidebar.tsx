import { Icon } from '@/components/ui/Icon'
import { APP_COPYRIGHT, APP_TAGLINE, APP_VERSION } from '@/constants/app'
import { NAV_ITEMS, SETTINGS_PAGE } from '@/constants/navigation'
import { CURRENT_USER } from '@/data/currentUser'
import type { PageKey } from '@/types/navigation'

interface SidebarProps {
  activePage: PageKey
  onNavigate: (page: PageKey) => void
  onSignOut: () => void
}

/** Navigasi utama: identitas aplikasi, ruang kerja, menu, dan aksi keluar. */
export function Sidebar({ activePage, onNavigate, onSignOut }: SidebarProps) {
  return (
    <aside className="sidebar">
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
        <div className="avatar">{CURRENT_USER.initials}</div>
        <div>
          <b>{CURRENT_USER.name}</b>
          <small>{CURRENT_USER.role}</small>
        </div>
        <span aria-hidden="true">⌄</span>
      </div>

      <nav>
        {NAV_ITEMS.map(({ key, icon, badge }) => (
          <button
            key={key}
            type="button"
            className={activePage === key ? 'active' : ''}
            aria-current={activePage === key ? 'page' : undefined}
            onClick={() => onNavigate(key)}
          >
            <Icon name={icon} />
            <span>{key}</span>
            {badge && <em>{badge}</em>}
          </button>
        ))}
      </nav>

      <div className="nav-bottom">
        <button
          type="button"
          className={activePage === SETTINGS_PAGE ? 'active' : ''}
          aria-current={activePage === SETTINGS_PAGE ? 'page' : undefined}
          onClick={() => onNavigate(SETTINGS_PAGE)}
        >
          <Icon name="settings" />
          <span>{SETTINGS_PAGE}</span>
        </button>
        <button type="button" onClick={onSignOut}>
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
