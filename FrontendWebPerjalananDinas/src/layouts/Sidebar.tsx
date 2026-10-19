import { Icon } from '@/components/ui/Icon'
import { APP_COPYRIGHT, APP_VERSION } from '@/constants/app'
import { SETTINGS_PAGE } from '@/constants/navigation'
import { useAuth } from '@/auth/useAuth'
import type { PageKey } from '@/types/navigation'

interface SidebarProps {
  activePage: PageKey
  onNavigate: (page: PageKey) => void
  onSignOut: () => void
  jumlahAntrean: number
  terbuka: boolean
  onBuatSppd?: () => void
}

/** Navigasi utama bergaya Travel Portal PT. Citra Mandiri */
export function Sidebar({
  activePage,
  onNavigate,
  onSignOut,
  jumlahAntrean,
  terbuka,
  onBuatSppd,
}: SidebarProps) {
  const { boleh } = useAuth()

  return (
    <aside className={`sidebar ${terbuka ? 'buka' : ''}`}>
      {/* Brand Header with Circular Logo */}
      <div className="sidebar-brand-box">
        <div className="sidebar-brand-circle">
          <Icon name="plane" size={24} />
        </div>
        <div className="sidebar-brand-title">Travel Portal</div>
        <div className="sidebar-brand-subtitle">PT. Citra Mandiri</div>
      </div>

      <nav>
        {/* Dashboard */}
        <button
          type="button"
          className={activePage === 'Dashboard' ? 'active' : ''}
          aria-current={activePage === 'Dashboard' ? 'page' : undefined}
          onClick={() => onNavigate('Dashboard')}
        >
          <Icon name="grid" size={19} />
          <span>Dashboard</span>
        </button>

        {/* Travel Requests */}
        {boleh('sppd.buat') && (
          <button
            type="button"
            className={activePage === 'Pengajuan Dinas' ? 'active' : ''}
            aria-current={activePage === 'Pengajuan Dinas' ? 'page' : undefined}
            onClick={() => onNavigate('Pengajuan Dinas')}
          >
            <Icon name="plane" size={19} />
            <span>Travel Requests</span>
          </button>
        )}

        {/* History / Perjalanan Saya */}
        {boleh('sppd.lihat') && (
          <button
            type="button"
            className={activePage === 'Perjalanan Saya' ? 'active' : ''}
            aria-current={activePage === 'Perjalanan Saya' ? 'page' : undefined}
            onClick={() => onNavigate('Perjalanan Saya')}
          >
            <Icon name="clock" size={19} />
            <span>History</span>
          </button>
        )}

        {/* Persetujuan (jika berhak) */}
        {boleh('sppd.setujui') && (
          <button
            type="button"
            className={activePage === 'Persetujuan' ? 'active' : ''}
            aria-current={activePage === 'Persetujuan' ? 'page' : undefined}
            onClick={() => onNavigate('Persetujuan')}
          >
            <Icon name="check" size={19} />
            <span>Persetujuan</span>
            {jumlahAntrean > 0 && <em>{jumlahAntrean}</em>}
          </button>
        )}

        {/* Claims / Keuangan */}
        {boleh('pencairan.proses') && (
          <button
            type="button"
            className={activePage === 'Keuangan' ? 'active' : ''}
            aria-current={activePage === 'Keuangan' ? 'page' : undefined}
            onClick={() => onNavigate('Keuangan')}
          >
            <Icon name="wallet" size={19} />
            <span>Claims</span>
          </button>
        )}

        {/* Reports / Laporan (jika berhak) */}
        {boleh('laporan.lihat') && (
          <button
            type="button"
            className={activePage === 'Laporan' ? 'active' : ''}
            aria-current={activePage === 'Laporan' ? 'page' : undefined}
            onClick={() => onNavigate('Laporan')}
          >
            <Icon name="file" size={19} />
            <span>Laporan</span>
          </button>
        )}

        {/* Profile / Pegawai */}
        <button
          type="button"
          className={activePage === 'Pegawai' ? 'active' : ''}
          aria-current={activePage === 'Pegawai' ? 'page' : undefined}
          onClick={() => onNavigate('Pegawai')}
        >
          <Icon name="pengguna" size={19} />
          <span>Profile</span>
        </button>
      </nav>

      {/* Button "+ New Travel" */}
      {boleh('sppd.buat') && (
        <button
          type="button"
          className="btn-new-travel"
          onClick={() => {
            onNavigate('Pengajuan Dinas')
          }}
        >
          <span>+ New Travel</span>
        </button>
      )}

      {/* Settings & Logout */}
      <div className="nav-bottom">
        <button
          type="button"
          className={activePage === SETTINGS_PAGE ? 'active' : ''}
          aria-current={activePage === SETTINGS_PAGE ? 'page' : undefined}
          onClick={() => onNavigate(SETTINGS_PAGE)}
        >
          <Icon name="settings" size={19} />
          <span>Settings</span>
        </button>
        <button type="button" className="keluar" onClick={onSignOut}>
          <Icon name="logout" size={19} />
          <span>Logout</span>
        </button>
      </div>

      <div className="sidebar-foot" style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
        v{APP_VERSION} · {APP_COPYRIGHT}
      </div>
    </aside>
  )
}
