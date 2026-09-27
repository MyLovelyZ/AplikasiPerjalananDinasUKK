import { useCallback, useEffect, useRef, useState } from 'react'

import type { PesanToast } from '@/components/feedback/Toast'
import { TOAST_DURATION_MS } from '@/constants/app'

/**
 * Mengelola satu pesan toast yang hilang otomatis.
 * Timer sebelumnya selalu dibatalkan agar pesan baru mendapat durasi penuh.
 */
export function useToast() {
  const [pesan, setPesan] = useState<PesanToast | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const bersihkanTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const tampilkan = useCallback(
    (teks: string, jenis: PesanToast['jenis'] = 'sukses') => {
      bersihkanTimer()
      setPesan({ teks, jenis })
      timerRef.current = setTimeout(() => setPesan(null), TOAST_DURATION_MS)
    },
    [bersihkanTimer],
  )

  /** Pintasan untuk menampilkan pesan galat dari sebuah Error. */
  const laporkanGalat = useCallback(
    (penyebab: unknown, cadangan = 'Terjadi kesalahan') => {
      tampilkan(penyebab instanceof Error ? penyebab.message : cadangan, 'galat')
    },
    [tampilkan],
  )

  useEffect(() => bersihkanTimer, [bersihkanTimer])

  return { pesan, tampilkan, laporkanGalat }
}
