import type { Respons, ResponsHalaman } from '@/api/tipe'

/**
 * Klien HTTP tunggal untuk seluruh aplikasi.
 *
 * Tanggung jawabnya tiga hal, dan hanya tiga:
 *   1. menempelkan access token pada setiap permintaan,
 *   2. memperbarui token yang kedaluwarsa lalu mengulang permintaan sekali,
 *   3. menerjemahkan amplop respons backend menjadi nilai atau lemparan galat.
 *
 * Komponen tidak pernah memanggil `fetch` sendiri, sehingga aturan token
 * cukup ditulis satu kali di berkas ini.
 */

const ASAL_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
export const DASAR_API = `${ASAL_API}/api`
export const DASAR_BERKAS = `${ASAL_API}/storage`

const KUNCI_AKSES = 'pd.access_token'
const KUNCI_SEGAR = 'pd.refresh_token'

/** Galat yang membawa kode status HTTP dan rincian validasi dari backend. */
export class GalatApi extends Error {
  status: number
  rincian: unknown

  constructor(pesan: string, status: number, rincian: unknown = null) {
    super(pesan)
    this.name = 'GalatApi'
    this.status = status
    this.rincian = rincian
  }

  /** Daftar pesan per kolom, bila galat ini berasal dari validasi 422. */
  get pesanKolom(): Array<{ kolom: string; pesan: string }> {
    return Array.isArray(this.rincian)
      ? (this.rincian as Array<{ kolom: string; pesan: string }>)
      : []
  }
}

export const simpanToken = (akses: string, segar?: string) => {
  localStorage.setItem(KUNCI_AKSES, akses)
  if (segar) localStorage.setItem(KUNCI_SEGAR, segar)
}

export const hapusToken = () => {
  localStorage.removeItem(KUNCI_AKSES)
  localStorage.removeItem(KUNCI_SEGAR)
}

export const ambilTokenAkses = () => localStorage.getItem(KUNCI_AKSES)
export const ambilTokenSegar = () => localStorage.getItem(KUNCI_SEGAR)

/** Dipanggil saat sesi benar-benar habis, supaya aplikasi kembali ke login. */
let saatSesiHabis: () => void = () => {}
export const pasangPenanganSesiHabis = (fn: () => void) => {
  saatSesiHabis = fn
}

/**
 * Beberapa permintaan bisa kedaluwarsa berbarengan. Tanpa penjaga ini,
 * masing-masing akan memanggil /auth/segarkan dan saling menimpa token.
 * Permintaan kedua dan seterusnya cukup menunggu janji yang sama.
 */
let penyegaranBerjalan: Promise<string | null> | null = null

async function segarkanToken(): Promise<string | null> {
  const refreshToken = ambilTokenSegar()
  if (!refreshToken) return null

  if (!penyegaranBerjalan) {
    penyegaranBerjalan = (async () => {
      try {
        const res = await fetch(`${DASAR_API}/auth/segarkan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })

        if (!res.ok) return null

        const isi = (await res.json()) as Respons<{ access_token: string }>
        simpanToken(isi.data.access_token)
        return isi.data.access_token
      } catch {
        return null
      } finally {
        // Dilepas pada tick berikutnya agar penunggu sempat membaca hasilnya.
        setTimeout(() => {
          penyegaranBerjalan = null
        }, 0)
      }
    })()
  }

  return penyegaranBerjalan
}

interface OpsiPermintaan {
  metode?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  /** Dipakai untuk unggah berkas; jangan gabungkan dengan `body`. */
  formulir?: FormData
  query?: Record<string, string | number | boolean | undefined | null>
  signal?: AbortSignal
}

function susunJalur(jalur: string, query?: OpsiPermintaan['query']) {
  if (!query) return jalur

  const params = new URLSearchParams()
  for (const [kunci, nilai] of Object.entries(query)) {
    if (nilai === undefined || nilai === null || nilai === '') continue
    params.set(kunci, String(nilai))
  }

  const teks = params.toString()
  return teks ? `${jalur}?${teks}` : jalur
}

async function kirim(jalur: string, opsi: OpsiPermintaan, ulangi = true): Promise<Response> {
  const headers: Record<string, string> = {}
  const token = ambilTokenAkses()
  if (token) headers.Authorization = `Bearer ${token}`

  let body: BodyInit | undefined
  if (opsi.formulir) {
    // Content-Type sengaja tidak diisi: peramban yang menuliskannya
    // lengkap dengan boundary multipart.
    body = opsi.formulir
  } else if (opsi.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opsi.body)
  }

  const res = await fetch(`${DASAR_API}${susunJalur(jalur, opsi.query)}`, {
    method: opsi.metode ?? 'GET',
    headers,
    body,
    signal: opsi.signal,
  })

  // Access token berumur pendek; sekali kedaluwarsa, tukar lalu ulangi.
  if (res.status === 401 && ulangi && ambilTokenSegar()) {
    const tokenBaru = await segarkanToken()
    if (tokenBaru) return kirim(jalur, opsi, false)

    hapusToken()
    saatSesiHabis()
  }

  return res
}

async function baca<T>(res: Response): Promise<T> {
  const isi = await res.json().catch(() => null)

  if (!res.ok) {
    throw new GalatApi(
      isi?.pesan ?? `Permintaan gagal dengan status ${res.status}`,
      res.status,
      isi?.galat ?? null,
    )
  }

  return isi as T
}

/** Permintaan yang mengembalikan satu objek. */
export async function minta<T>(jalur: string, opsi: OpsiPermintaan = {}): Promise<T> {
  const res = await kirim(jalur, opsi)
  const isi = await baca<Respons<T>>(res)
  return isi.data
}

/** Permintaan yang mengembalikan objek beserta pesan sukses dari backend. */
export async function mintaDenganPesan<T>(
  jalur: string,
  opsi: OpsiPermintaan = {},
): Promise<{ data: T; pesan: string }> {
  const res = await kirim(jalur, opsi)
  const isi = await baca<Respons<T>>(res)
  return { data: isi.data, pesan: isi.pesan }
}

/** Permintaan berhalaman: mengembalikan baris beserta metadata halaman. */
export async function mintaHalaman<T>(
  jalur: string,
  opsi: OpsiPermintaan = {},
): Promise<ResponsHalaman<T>> {
  const res = await kirim(jalur, opsi)
  return baca<ResponsHalaman<T>>(res)
}

/** URL berkas yang tersimpan di storage backend. */
export const urlBerkas = (pathRelatif: string) => `${DASAR_BERKAS}/${pathRelatif}`
