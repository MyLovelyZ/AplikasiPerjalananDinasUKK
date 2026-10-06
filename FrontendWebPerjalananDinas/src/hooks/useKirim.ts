import { useCallback, useState } from 'react'

import { GalatApi } from '@/api/klien'

/** Keadaan pengiriman formulir: sedang mengirim, pesan galat umum, dan galat per kolom. */
export function useKirim() {
  const [mengirim, setMengirim] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({})

  const jalankan = useCallback(async <T>(aksi: () => Promise<T>): Promise<T | undefined> => {
    setMengirim(true)
    setGalat(null)
    setGalatKolom({})

    try {
      return await aksi()
    } catch (penyebab: unknown) {
      if (penyebab instanceof GalatApi) {
        setGalat(penyebab.message)
        setGalatKolom(penyebab.pesanKolom)
      } else {
        setGalat('Terjadi kesalahan tak terduga. Coba lagi.')
      }
      return undefined
    } finally {
      setMengirim(false)
    }
  }, [])

  return { mengirim, galat, galatKolom, jalankan, setGalat }
}
