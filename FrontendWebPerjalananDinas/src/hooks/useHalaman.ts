import { useCallback, useState } from 'react'

/** Nomor halaman yang otomatis kembali ke 1 setiap kali salah satu penyaring berubah. */
export function useHalaman(...penyaring: unknown[]) {
  const kunci = JSON.stringify(penyaring)
  const [posisi, setPosisi] = useState({ kunci, halaman: 1 })

  const halaman = posisi.kunci === kunci ? posisi.halaman : 1
  const setHalaman = useCallback((nomor: number) => setPosisi({ kunci, halaman: nomor }), [kunci])

  return [halaman, setHalaman] as const
}
