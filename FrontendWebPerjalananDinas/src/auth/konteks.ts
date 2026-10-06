import { createContext } from 'react'

import type { Pengguna, Peran } from '@/api/tipe'

export interface NilaiAuth {
  pengguna: Pengguna | null
  /** Sedang memeriksa token tersimpan saat aplikasi pertama dibuka. */
  memuat: boolean
  masuk: (email: string, kataSandi: string) => Promise<void>
  keluar: () => Promise<void>
  /** Mengganti data pengguna setelah profil diubah. */
  perbaruiPengguna: (pengguna: Pengguna) => void
  berperan: (...peran: Peran[]) => boolean
}

// Dipisah dari AuthContext.tsx agar hot reload Vite tetap bekerja.
export const KonteksAuth = createContext<NilaiAuth | null>(null)
