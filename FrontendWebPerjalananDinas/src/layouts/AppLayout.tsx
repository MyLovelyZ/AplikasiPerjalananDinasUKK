import { useCallback, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router'

import { apiAntreanAtasan, apiAntreanKeuangan } from '@/api/endpoint'
import { useAuth } from '@/auth/useAuth'
import { Toast } from '@/components/feedback/Toast'
import { usePermintaan } from '@/hooks/usePermintaan'
import { useToast } from '@/hooks/useToast'
import { KonteksAplikasi } from '@/layouts/konteksAplikasi'
import type { NilaiAplikasi } from '@/layouts/konteksAplikasi'
import { Sidebar } from '@/layouts/Sidebar'
import { Topbar } from '@/layouts/Topbar'

/** Kerangka setelah login: sidebar, topbar, toast, dan halaman aktif dari router. */
export function AppLayout() {
  const { pengguna, keluar } = useAuth()
  const { pathname } = useLocation()
  const { pesan: pesanToast, tampilkan } = useToast()

  const [laciTerbuka, setLaciTerbuka] = useState({ jalur: pathname, buka: false })
  const [cari, setCari] = useState({ jalur: pathname, teks: '' })
  const [penandaSegar, setPenandaSegar] = useState(0)

  // Pencarian dan laci menu hanya berlaku untuk URL tempat keduanya diubah.
  const pencarian = cari.jalur === pathname ? cari.teks : ''
  const laciBuka = laciTerbuka.jalur === pathname && laciTerbuka.buka

  const peran = pengguna?.role
  const { data: jumlahAntrean } = usePermintaan(async () => {
    if (peran === 'supervisor') return (await apiAntreanAtasan({ status: 'pending', per_page: 1 })).meta.total
    if (peran === 'finance') return (await apiAntreanKeuangan({ per_page: 1 })).meta.total
    return 0
  }, [peran, penandaSegar])

  const sukses = useCallback(
    (teks: string) => {
      tampilkan(teks, 'sukses')
      setPenandaSegar((n) => n + 1)
    },
    [tampilkan],
  )

  const nilai = useMemo<NilaiAplikasi>(
    () => ({ pencarian, sukses, penandaSegar }),
    [pencarian, sukses, penandaSegar],
  )

  return (
    <KonteksAplikasi.Provider value={nilai}>
      <div className="app">
        <Sidebar onSignOut={keluar} jumlahAntrean={jumlahAntrean ?? 0} terbuka={laciBuka} />

        {laciBuka && (
          <button
            type="button"
            className="tirai-sidebar"
            aria-label="Tutup menu navigasi"
            onClick={() => setLaciTerbuka({ jalur: pathname, buka: false })}
          />
        )}

        <main className="main">
          <Topbar
            searchQuery={pencarian}
            onSearchChange={(teks) => setCari({ jalur: pathname, teks })}
            onBukaMenu={() => setLaciTerbuka({ jalur: pathname, buka: true })}
          />
          <div className="content">
            <Outlet />
          </div>
        </main>

        {pesanToast && <Toast pesan={pesanToast} />}
      </div>
    </KonteksAplikasi.Provider>
  )
}
