import { createContext, useContext } from 'react'

export interface NilaiAplikasi {
  /** Isi kolom cari di topbar; kosong lagi setiap kali URL berganti. */
  pencarian: string
  /** Menampilkan toast sukses lalu memaksa halaman aktif mengambil ulang data. */
  sukses: (pesan: string) => void
  /** Naik setiap kali ada aksi yang mengubah data. */
  penandaSegar: number
}

export const KonteksAplikasi = createContext<NilaiAplikasi | null>(null)

export function useAplikasi() {
  const nilai = useContext(KonteksAplikasi)
  if (!nilai) {
    throw new Error('useAplikasi harus dipakai di dalam <KerangkaAplikasi>')
  }
  return nilai
}
