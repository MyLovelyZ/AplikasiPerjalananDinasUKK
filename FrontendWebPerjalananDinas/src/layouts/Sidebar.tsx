import { Link, NavLink } from 'react-router'

import { Icon } from '@/components/ui/Icon'
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

/** Navigasi utama bergaya Travel Portal PT. Citra Mandiri. */
export function Sidebar({ onSignOut, jumlahAntrean, terbuka }: SidebarProps) {
  const { pengguna } = useAuth()

  const menuTampil = pengguna ? MENU_PERAN[pengguna.role] : []
  const nama = pengguna?.name ?? 'Pengguna'

  return (
    <aside className={`sidebar ${terbuka ? 'buka' : ''}`}>
      <div className="sidebar-merek">
        <span className="sidebar-logo">
          <Icon name="plane" size={20} />
        </span>
        <div>
          <strong>Travel Portal</strong>
          <small>PT. Citra Mandiri</small>
        </div>
      </div>

      {/* Hanya pegawai yang mengajukan perjalanan. */}
      {pengguna?.role === 'employee' && (
        <Link to="/employee/requests/new" className="btn aksen blok sidebar-cta">
          <Icon name="plus" size={16} />
          Ajukan Perjalanan
        </Link>
      )}

      <nav>
        <div className="nav-label">Menu</div>
        {menuTampil.map(({ label, jalur, icon, antrean }) => (
          // Dashboard (= beranda peran) hanya aktif pada URL persisnya.
          <NavLink key={jalur} to={jalur} end={pengguna !== null && jalur === BERANDA_PERAN[pengguna.role]} className={kelasAktif}>
            <Icon name={icon} size={18} />
            <span>{label}</span>
            {antrean && jumlahAntrean > 0 && <em>{jumlahAntrean}</em>}
          </NavLink>
        ))}
      </nav>

      <div className="nav-bottom">
        <NavLink to={MENU_PROFIL.jalur} className={kelasAktif}>
          <Icon name={MENU_PROFIL.icon} size={18} />
          <span>{MENU_PROFIL.label}</span>
        </NavLink>
        <button type="button" className="keluar" onClick={onSignOut}>
          <Icon name="logout" size={18} />
          <span>Keluar</span>
        </button>
      </div>

      <div className="sidebar-pengguna">
        <span className="avatar">
          {pengguna?.profile_photo_url ? <img src={pengguna.profile_photo_url} alt="" /> : inisial(nama)}
        </span>
        <div>
          <b>{nama}</b>
          <small>
            {pengguna ? LABEL_PERAN[pengguna.role] : ''}
            {pengguna?.department ? ` · ${pengguna.department.name}` : ''}
          </small>
        </div>
      </div>
    </aside>
  )
}
