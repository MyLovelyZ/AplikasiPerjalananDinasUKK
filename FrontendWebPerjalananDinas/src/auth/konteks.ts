import { createContext } from 'react'

import type { ProfilPengguna } from '@/api/tipe'

export interface NilaiAuth {
  profil: ProfilPengguna | null
  /** Sedang memeriksa token tersimpan saat aplikasi pertama dibuka. */
  memuat: boolean
  masuk: (username: string, kataSandi: string) => Promise<void>
  keluar: () => Promise<void>
  /** Apakah pengguna memegang salah satu hak akses yang disebut. */
  boleh: (...kode: string[]) => boolean
  /** Apakah pengguna memegang salah satu peran yang disebut. */
  berperan: (...kode: string[]) => boolean
}

/**
 * Konteks autentikasi.
 *
 * Sengaja dipisah dari AuthContext.tsx: berkas yang mengekspor komponen
 * sebaiknya hanya mengekspor komponen, agar hot reload Vite tetap bekerja
 * saat penyedianya disunting.
 */
export const KonteksAuth = createContext<NilaiAuth | null>(null)
