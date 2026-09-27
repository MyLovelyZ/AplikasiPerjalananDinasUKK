import { Icon } from '@/components/ui/Icon'
import { APP_COPYRIGHT, APP_TAGLINE, APP_VERSION } from '@/constants/app'
import { NAV_ITEMS, SETTINGS_PAGE } from '@/constants/navigation'
import { useAuth } from '@/auth/useAuth'
import { inisial } from '@/utils/format'
import type { PageKey } from '@/types/navigation'

interface SidebarProps {
  activePage: PageKey
  onNavigate: (page: PageKey) => void
  onSignOut: () => void
  /** Jumlah tugas persetujuan yang menunggu, tampil sebagai lencana. */
  jumlahAntrean: number
  terbuka: boolean
}

/** Navigasi utama: identitas aplikasi, pengguna aktif, menu, dan aksi keluar. */
export function Sidebar({
  activePage,
  onNavigate,
  onSignOut,
  jumlahAntrean,
  terbuka,
}: SidebarProps) {
  const { profil, boleh } = useAuth()

  // Menu yang haknya tidak dimiliki tidak ditampilkan sama sekali —
  // lebih jujur daripada menampilkannya lalu menolak saat diklik.
  const menuTampil = NAV_ITEMS.filter((item) => !item.hak || boleh(...item.hak))

  const nama = profil?.karyawan?.nama_lengkap ?? profil?.username ?? 'Pengguna'
  const peranUtama = profil?.peran?.[0]?.nama ?? 'Tanpa peran'

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
          <small>{peranUtama}</small>
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
            {key === 'Persetujuan' && jumlahAntrean > 0 && <em>{jumlahAntrean}</em>}
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
