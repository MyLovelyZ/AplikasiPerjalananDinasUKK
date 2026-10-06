import { NavLink } from 'react-router'

import { Icon } from '@/components/ui/Icon'
import { APP_COPYRIGHT, APP_TAGLINE, APP_VERSION } from '@/constants/app'
import { LABEL_PERAN } from '@/constants/label'
import { BERANDA_PERAN, MENU_PERAN, MENU_PROFIL } from '@/constants/navigation'
import { useAuth } from '@/auth/useAuth'
import { inisial } from '@/utils/format'

interface SidebarProps {
  onSignOut: () => void
  jumlahAntrean: number
  terbuka: boolean
}

const kelasAktif = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '')

export function Sidebar({ onSignOut, jumlahAntrean, terbuka }: SidebarProps) {
  const { pengguna } = useAuth()

  const menuTampil = pengguna ? MENU_PERAN[pengguna.role] : []
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
        {menuTampil.map(({ label, jalur, icon, antrean }) => (
          // Dashboard (= beranda peran) hanya aktif pada URL persisnya.
          <NavLink key={jalur} to={jalur} end={pengguna !== null && jalur === BERANDA_PERAN[pengguna.role]} className={kelasAktif}>
            <Icon name={icon} />
            <span>{label}</span>
            {antrean && jumlahAntrean > 0 && <em>{jumlahAntrean}</em>}
          </NavLink>
        ))}
      </nav>

      <div className="nav-bottom">
        <NavLink to={MENU_PROFIL.jalur} className={kelasAktif}>
          <Icon name={MENU_PROFIL.icon} />
          <span>{MENU_PROFIL.label}</span>
        </NavLink>
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
