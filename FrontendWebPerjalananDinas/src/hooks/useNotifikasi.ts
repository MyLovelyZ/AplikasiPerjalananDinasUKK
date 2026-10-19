import { useCallback, useEffect, useState } from 'react'

import { apiJumlahBelumDibaca } from '@/api/endpoint'
import { usePermintaan } from '@/hooks/usePermintaan'

/** Seberapa sering hitungan diperbarui selagi tab peramban terlihat. */
const JEDA_MS = 30_000

/**
 * Jumlah notifikasi belum dibaca untuk lencana lonceng. Diambil ulang setiap
 * 30 detik selama tab terlihat, saat tab kembali terlihat, saat `kunci`
 * berubah (mis. URL atau aksi yang mengubah data), dan lewat `muatUlang`.
 */
export function useNotifikasi(kunci: ReadonlyArray<unknown> = []) {
  const [detak, setDetak] = useState(0)

  useEffect(() => {
    const berdetak = () => {
      if (document.visibilityState === 'visible') setDetak((n) => n + 1)
    }

    const pewaktu = window.setInterval(berdetak, JEDA_MS)
    document.addEventListener('visibilitychange', berdetak)
    return () => {
      window.clearInterval(pewaktu)
      document.removeEventListener('visibilitychange', berdetak)
    }
  }, [])

  // Selagi mengambil ulang, usePermintaan tetap memberi hitungan lama, jadi lencana tidak berkedip.
  const { data } = usePermintaan(async (signal) => (await apiJumlahBelumDibaca(signal)).unread_count, [detak, ...kunci])

  const muatUlang = useCallback(() => setDetak((n) => n + 1), [])

  return { belumDibaca: data ?? 0, muatUlang }
}
