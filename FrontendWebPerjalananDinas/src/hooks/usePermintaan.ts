import { useCallback, useEffect, useRef, useState } from 'react'

import { GalatApi } from '@/api/klien'

interface HasilPermintaan<T> {
  data: T | null
  memuat: boolean
  galat: string | null
  /** Mengambil ulang data, mis. setelah aksi yang mengubahnya. */
  muatUlang: () => void
}

interface Simpanan<T> {
  /** Kunci yang berlaku saat hasil ini tersimpan. */
  kunciTerpakai: string
  data: T | null
  galat: string | null
}

/**
 * Mengambil data dari API dan mengurus tiga keadaan yang selalu muncul:
 * sedang memuat, berhasil, dan gagal.
 *
 * `kunci` menentukan kapan pengambilan diulang; sebutkan di sana setiap nilai
 * yang memengaruhi hasil. Fungsi pengambilnya sendiri tidak masuk daftar
 * ketergantungan karena hampir selalu ditulis inline dan berubah identitas
 * setiap render — itu justru memicu perulangan tanpa henti.
 *
 * Keadaan "sedang memuat" TIDAK disimpan sebagai state tersendiri, melainkan
 * disimpulkan dari perbandingan kunci: selama kunci hasil tersimpan belum
 * sama dengan kunci sekarang, berarti data yang berlaku belum tiba. Dengan
 * begitu tidak ada setState yang dipanggil langsung di badan efek — yang
 * akan memicu render berantai — dan data lama tetap tampil selagi data baru
 * diambil, sehingga tata letak tidak berkedip.
 */
export function usePermintaan<T>(
  ambil: (signal: AbortSignal) => Promise<T>,
  kunci: ReadonlyArray<unknown> = [],
): HasilPermintaan<T> {
  const [penanda, setPenanda] = useState(0)

  // Kunci dirangkum menjadi satu string agar bisa dibandingkan dan dipakai
  // sebagai ketergantungan efek. Isinya selalu nilai sederhana (angka/teks).
  const kunciSekarang = `${penanda}|${JSON.stringify(kunci)}`

  const [simpanan, setSimpanan] = useState<Simpanan<T>>({
    kunciTerpakai: '',
    data: null,
    galat: null,
  })

  // Pengambil terbaru disimpan pada ref, diperbarui lewat efek (bukan saat
  // render) supaya tidak melanggar aturan kemurnian render React.
  const ambilRef = useRef(ambil)
  useEffect(() => {
    ambilRef.current = ambil
  })

  useEffect(() => {
    const kendali = new AbortController()
    let hidup = true

    ambilRef
      .current(kendali.signal)
      .then((hasil) => {
        if (hidup) setSimpanan({ kunciTerpakai: kunciSekarang, data: hasil, galat: null })
      })
      .catch((penyebab: unknown) => {
        // Permintaan yang dibatalkan karena komponen berpindah bukan galat.
        if (kendali.signal.aborted || !hidup) return

        setSimpanan({
          kunciTerpakai: kunciSekarang,
          data: null,
          galat:
            penyebab instanceof GalatApi
              ? penyebab.message
              : 'Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.',
        })
      })

    return () => {
      hidup = false
      kendali.abort()
    }
  }, [kunciSekarang])

  const muatUlang = useCallback(() => setPenanda((n) => n + 1), [])

  const sudahSegar = simpanan.kunciTerpakai === kunciSekarang

  return {
    data: simpanan.data,
    memuat: !sudahSegar,
    // Galat dari pengambilan sebelumnya disembunyikan selagi mencoba ulang.
    galat: sudahSegar ? simpanan.galat : null,
    muatUlang,
  }
}
