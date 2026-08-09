import type { ReactNode } from 'react'

import { Sidebar } from '@/layouts/Sidebar'
import { Topbar } from '@/layouts/Topbar'
import type { PageKey } from '@/types/navigation'

interface AppLayoutProps {
  activePage: PageKey
  onNavigate: (page: PageKey) => void
  onSignOut: () => void
  searchQuery: string
  onSearchChange: (value: string) => void
  /** Isi halaman yang sedang aktif. */
  children: ReactNode
  /** Lapisan di atas halaman: modal dan toast. */
  overlays?: ReactNode
}

/** Kerangka aplikasi: sidebar tetap di kiri, topbar, lalu area konten. */
export function AppLayout({
  activePage,
  onNavigate,
  onSignOut,
  searchQuery,
  onSearchChange,
  children,
  overlays,
}: AppLayoutProps) {
  return (
    <div className="app">
      <Sidebar activePage={activePage} onNavigate={onNavigate} onSignOut={onSignOut} />
      <main className="main">
        <Topbar
          activePage={activePage}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />
        <div className="content">{children}</div>
      </main>
      {overlays}
    </div>
  )
}
