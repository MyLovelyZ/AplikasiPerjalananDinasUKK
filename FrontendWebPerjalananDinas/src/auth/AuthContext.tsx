import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { apiKeluar, apiMasuk, apiProfil } from '@/api/endpoint'
import { ambilToken, hapusToken, pasangPenanganSesiHabis, simpanToken } from '@/api/klien'
import { KonteksAuth } from '@/auth/konteks'
import type { NilaiAuth } from '@/auth/konteks'
import type { Pengguna, Peran } from '@/api/tipe'

export function PenyediaAuth({ children }: { children: ReactNode }) {
  const [pengguna, setPengguna] = useState<Pengguna | null>(null)
  const [memuat, setMemuat] = useState(() => ambilToken() !== null)

  const bersihkanSesi = useCallback(() => {
    hapusToken()
    setPengguna(null)
  }, [])

  useEffect(() => {
    pasangPenanganSesiHabis(bersihkanSesi)
  }, [bersihkanSesi])

  useEffect(() => {
    if (!ambilToken()) return
    let dibatalkan = false

    // Profil selalu diambil ulang agar perubahan peran oleh admin langsung berlaku.
    apiProfil()
      .then((data) => {
        if (!dibatalkan) setPengguna(data)
      })
      .catch(() => {
        if (!dibatalkan) bersihkanSesi()
      })
      .finally(() => {
        if (!dibatalkan) setMemuat(false)
      })

    return () => {
      dibatalkan = true
    }
  }, [bersihkanSesi])

  const masuk = useCallback(async (email: string, kataSandi: string) => {
    const hasil = await apiMasuk(email, kataSandi)
    simpanToken(hasil.token)
    setPengguna(hasil.user)
  }, [])

  const keluar = useCallback(async () => {
    // Sesi lokal tetap dibersihkan walau pencabutan token di server gagal.
    await apiKeluar().catch(() => null)
    bersihkanSesi()
  }, [bersihkanSesi])

  const nilai = useMemo<NilaiAuth>(
    () => ({
      pengguna,
      memuat,
      masuk,
      keluar,
      perbaruiPengguna: setPengguna,
      berperan: (...peran: Peran[]) => pengguna !== null && peran.includes(pengguna.role),
    }),
    [pengguna, memuat, masuk, keluar],
  )

  return <KonteksAuth.Provider value={nilai}>{children}</KonteksAuth.Provider>
}
