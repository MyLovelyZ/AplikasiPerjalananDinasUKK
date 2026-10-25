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

/** Navigasi utama dengan pemisahan peran ketat (Admin, Supervisor, Keuangan, Pegawai) */
export function Sidebar({
  activePage,
  onNavigate,
  onSignOut,
  jumlahAntrean,
  terbuka,
  onBuatSppd: _onBuatSppd,
}: SidebarProps) {
  const { profil } = useAuth()
  const peranKode = profil?.peran?.[0]?.kode ?? 'employee'
  const isSuperAdmin = peranKode === 'super_admin'
  const isSupervisor = peranKode === 'supervisor'
  const isFinance = peranKode === 'finance'
  const isEmployee = peranKode === 'employee'

  const roleTitle = isSuperAdmin
    ? 'Super Admin'
    : isSupervisor
      ? 'Supervisor'
      : isFinance
        ? 'Keuangan (Finance)'
        : 'Pegawai (Employee)'

  const roleBadgeStyle = isSuperAdmin
    ? { background: 'rgba(217, 119, 6, 0.25)', color: '#FBBF24', border: '1px solid rgba(217, 119, 6, 0.4)' }
    : isSupervisor
      ? { background: 'rgba(2, 132, 199, 0.25)', color: '#38BDF8', border: '1px solid rgba(2, 132, 199, 0.4)' }
      : isFinance
        ? { background: 'rgba(5, 150, 105, 0.25)', color: '#34D399', border: '1px solid rgba(5, 150, 105, 0.4)' }
        : { background: 'rgba(255, 255, 255, 0.15)', color: '#E2E8F0', border: '1px solid rgba(255, 255, 255, 0.2)' }

  return (
    <aside className={`sidebar ${terbuka ? 'buka' : ''}`}>
      {/* Brand Header with Circular Logo & Active Role Badge */}
      <div className="sidebar-brand-box">
        <div className="sidebar-brand-circle">
          <Icon name="plane" size={24} />
        </div>
        <div className="sidebar-brand-title">Travel Portal</div>
        <div className="sidebar-brand-subtitle">PT. Citra Mandiri</div>
        <div
          style={{
            marginTop: 8,
            padding: '3px 10px',
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            display: 'inline-block',
            ...roleBadgeStyle,
          }}
        >
          {roleTitle}
        </div>
      </div>

      <nav>
        {/* 1. Dashboard — Disesuaikan per peran */}
        <button
          type="button"
          className={activePage === 'Dashboard' ? 'active' : ''}
          aria-current={activePage === 'Dashboard' ? 'page' : undefined}
          onClick={() => onNavigate('Dashboard')}
        >
          <Icon name="grid" size={19} />
          <span>Dashboard</span>
        </button>

        {/* 2. Menu khusus PEGAWAI / EMPLOYEE */}
        {(isEmployee || isSuperAdmin) && (
          <button
            type="button"
            className={activePage === 'Pengajuan Dinas' ? 'active' : ''}
            aria-current={activePage === 'Pengajuan Dinas' ? 'page' : undefined}
            onClick={() => onNavigate('Pengajuan Dinas')}
          >
            <Icon name="plane" size={19} />
            <span>Pengajuan Dinas</span>
          </button>
        )}

        {(isEmployee || isSuperAdmin) && (
          <button
            type="button"
            className={activePage === 'Perjalanan Saya' ? 'active' : ''}
            aria-current={activePage === 'Perjalanan Saya' ? 'page' : undefined}
            onClick={() => onNavigate('Perjalanan Saya')}
          >
            <Icon name="clock" size={19} />
            <span>Perjalanan Saya</span>
          </button>
        )}

        {/* 3. Menu khusus SUPERVISOR (ATASAN) */}
        {(isSupervisor || isSuperAdmin) && (
          <button
            type="button"
            className={activePage === 'Persetujuan' ? 'active' : ''}
            aria-current={activePage === 'Persetujuan' ? 'page' : undefined}
            onClick={() => onNavigate('Persetujuan')}
          >
            <Icon name="check" size={19} />
            <span>Persetujuan SPPD</span>
            {jumlahAntrean > 0 && <em>{jumlahAntrean}</em>}
          </button>
        )}

        {isSupervisor && (
          <button
            type="button"
            className={activePage === 'Perjalanan Saya' ? 'active' : ''}
            aria-current={activePage === 'Perjalanan Saya' ? 'page' : undefined}
            onClick={() => onNavigate('Perjalanan Saya')}
          >
            <Icon name="plane" size={19} />
            <span>Monitoring Tim</span>
          </button>
        )}

        {/* 4. Menu khusus KEUANGAN / FINANCE */}
        {(isFinance || isSuperAdmin) && (
          <button
            type="button"
            className={activePage === 'Keuangan' ? 'active' : ''}
            aria-current={activePage === 'Keuangan' ? 'page' : undefined}
            onClick={() => onNavigate('Keuangan')}
          >
            <Icon name="wallet" size={19} />
            <span>Pencairan Dana</span>
          </button>
        )}

        {(isFinance || isEmployee || isSuperAdmin) && (
          <button
            type="button"
            className={activePage === 'Laporan' ? 'active' : ''}
            aria-current={activePage === 'Laporan' ? 'page' : undefined}
            onClick={() => onNavigate('Laporan')}
          >
            <Icon name="file" size={19} />
            <span>{isFinance ? 'Verifikasi LPJ' : 'Laporan LPJ'}</span>
          </button>
        )}

        {/* 5. Menu khusus ADMIN */}
        {isSuperAdmin && (
          <button
            type="button"
            className={activePage === 'Pegawai' ? 'active' : ''}
            aria-current={activePage === 'Pegawai' ? 'page' : undefined}
            onClick={() => onNavigate('Pegawai')}
          >
            <Icon name="pengguna" size={19} />
            <span>Kelola Pegawai</span>
          </button>
        )}

        {/* Profil Saya untuk Staf/SPV/Keuangan */}
        {!isSuperAdmin && (
          <button
            type="button"
            className={activePage === 'Pegawai' ? 'active' : ''}
            aria-current={activePage === 'Pegawai' ? 'page' : undefined}
            onClick={() => onNavigate('Pegawai')}
          >
            <Icon name="pengguna" size={19} />
            <span>Profil Saya</span>
          </button>
        )}
      </nav>

      {/* Button "+ New Travel" HANYA untuk Pegawai & Super Admin */}
      {(isEmployee || isSuperAdmin) && (
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
        {isSuperAdmin && (
          <button
            type="button"
            className={activePage === SETTINGS_PAGE ? 'active' : ''}
            aria-current={activePage === SETTINGS_PAGE ? 'page' : undefined}
            onClick={() => onNavigate(SETTINGS_PAGE)}
          >
            <Icon name="settings" size={19} />
            <span>Settings</span>
          </button>
        )}
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
