import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { apiKeluar, apiMasuk, apiProfil } from '@/api/endpoint'
import {
  ambilTokenAkses,
  ambilTokenSegar,
  hapusToken,
  pasangPenanganSesiHabis,
  simpanToken,
} from '@/api/klien'
import { KonteksAuth } from '@/auth/konteks'
import type { NilaiAuth } from '@/auth/konteks'
import type { ProfilPengguna } from '@/api/tipe'

/**
 * Menyimpan identitas pengguna yang sedang masuk.
 *
 * Token disimpan di localStorage supaya sesi bertahan saat halaman dimuat
 * ulang; profil selalu diambil ulang dari backend agar perubahan peran yang
 * dilakukan Super Admin langsung berlaku tanpa perlu keluar-masuk.
 */
export function PenyediaAuth({ children }: { children: ReactNode }) {
  const [profil, setProfil] = useState<ProfilPengguna | null>(null)
  const [memuat, setMemuat] = useState(true)

  const bersihkanSesi = useCallback(() => {
    hapusToken()
    setProfil(null)
  }, [])

  // Klien HTTP memberi tahu lewat kait ini ketika refresh token ikut ditolak.
  useEffect(() => {
    pasangPenanganSesiHabis(bersihkanSesi)
  }, [bersihkanSesi])

  useEffect(() => {
    let dibatalkan = false

    const pulihkanSesi = async () => {
      if (!ambilTokenAkses()) {
        setMemuat(false)
        return
      }

      try {
        const data = await apiProfil()
        if (!dibatalkan) setProfil(data)
      } catch {
        if (!dibatalkan) bersihkanSesi()
      } finally {
        if (!dibatalkan) setMemuat(false)
      }
    }

    void pulihkanSesi()
    return () => {
      dibatalkan = true
    }
  }, [bersihkanSesi])

  const masuk = useCallback(async (username: string, kataSandi: string) => {
    const hasil = await apiMasuk(username, kataSandi)
    simpanToken(hasil.access_token, hasil.refresh_token)
    setProfil(await apiProfil())
  }, [])

  const keluar = useCallback(async () => {
    // Sesi di sisi klien selalu dibersihkan, sekalipun panggilan ke backend
    // gagal — pengguna tetap harus keluar dari perangkat ini.
    try {
      await apiKeluar(ambilTokenSegar())
    } catch {
      // diabaikan dengan sengaja
    }
    bersihkanSesi()
  }, [bersihkanSesi])

  const nilai = useMemo<NilaiAuth>(() => {
    const hakAkses = new Set(profil?.hak_akses ?? [])
    const peran = new Set((profil?.peran ?? []).map((p) => p.kode))

    return {
      profil,
      memuat,
      masuk,
      keluar,
      boleh: (...kode: string[]) => kode.some((k) => hakAkses.has(k)),
      berperan: (...kode: string[]) => kode.some((k) => peran.has(k)),
    }
  }, [profil, memuat, masuk, keluar])

  return <KonteksAuth.Provider value={nilai}>{children}</KonteksAuth.Provider>
}
