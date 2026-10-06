import { useState } from 'react'
import type { ReactNode } from 'react'

import { PROFILE_PAGE } from '@/constants/navigation'
import { Sidebar } from '@/layouts/Sidebar'
import { Topbar } from '@/layouts/Topbar'
import type { PageKey } from '@/types/navigation'

interface AppLayoutProps {
  activePage: PageKey
  onNavigate: (page: PageKey) => void
  onSignOut: () => void
  searchQuery: string
  onSearchChange: (value: string) => void
  jumlahAntrean: number
  children: ReactNode
  /** Lapisan di atas halaman: modal dan toast. */
  overlays?: ReactNode
}

export function AppLayout({
  activePage,
  onNavigate,
  onSignOut,
  searchQuery,
  onSearchChange,
  jumlahAntrean,
  children,
  overlays,
}: AppLayoutProps) {
  const [laciTerbuka, setLaciTerbuka] = useState(false)

  const pindahHalaman = (halaman: PageKey) => {
    onNavigate(halaman)
    setLaciTerbuka(false)
  }

  return (
    <div className="app">
      <Sidebar
        activePage={activePage}
        onNavigate={pindahHalaman}
        onSignOut={onSignOut}
        jumlahAntrean={jumlahAntrean}
        terbuka={laciTerbuka}
      />

      {laciTerbuka && (
        <button
          type="button"
          className="tirai-sidebar"
          aria-label="Tutup menu navigasi"
          onClick={() => setLaciTerbuka(false)}
        />
      )}

      <main className="main">
        <Topbar
          activePage={activePage}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onBukaMenu={() => setLaciTerbuka(true)}
          onBukaProfil={() => pindahHalaman(PROFILE_PAGE)}
        />
        <div className="content">{children}</div>
      </main>

      {overlays}
    </div>
  )
}
