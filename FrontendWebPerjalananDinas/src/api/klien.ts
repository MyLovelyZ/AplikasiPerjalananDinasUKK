import type { Respons } from '@/api/tipe'

const ASAL_API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'
export const DASAR_API = `${ASAL_API}/api`

const KUNCI_TOKEN = 'pd.token'

export class GalatApi extends Error {
  status: number
  galatKolom: Record<string, string[]>

  constructor(pesan: string, status: number, galatKolom: Record<string, string[]> = {}) {
    super(pesan)
    this.name = 'GalatApi'
    this.status = status
    this.galatKolom = galatKolom
  }

  /** Pesan pertama per kolom, mis. `{ purpose: 'The purpose field is required.' }`. */
  get pesanKolom(): Record<string, string> {
    return Object.fromEntries(
      Object.entries(this.galatKolom).map(([kolom, daftar]) => [kolom, daftar[0] ?? '']),
    )
  }
}

export const simpanToken = (token: string) => localStorage.setItem(KUNCI_TOKEN, token)
export const hapusToken = () => localStorage.removeItem(KUNCI_TOKEN)
export const ambilToken = () => localStorage.getItem(KUNCI_TOKEN)

let saatSesiHabis: () => void = () => {}
export const pasangPenanganSesiHabis = (fn: () => void) => {
  saatSesiHabis = fn
}

type NilaiQuery = string | number | boolean | undefined | null

export interface OpsiPermintaan {
  metode?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  /** Untuk unggah berkas; jangan digabung dengan `body`. */
  formulir?: FormData
  query?: Record<string, NilaiQuery>
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

async function kirim(jalur: string, opsi: OpsiPermintaan): Promise<Response> {
  // Tanpa Accept JSON, Laravel membalas galat validasi dengan redirect HTML.
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = ambilToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let body: BodyInit | undefined
  if (opsi.formulir) {
    body = opsi.formulir
  } else if (opsi.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opsi.body)
  }

  let res: Response
  try {
    res = await fetch(`${DASAR_API}${susunJalur(jalur, opsi.query)}`, {
      method: opsi.metode ?? 'GET',
      headers,
      body,
      signal: opsi.signal,
    })
  } catch (penyebab) {
    if (penyebab instanceof DOMException && penyebab.name === 'AbortError') throw penyebab
    throw new GalatApi(
      `Tidak dapat menghubungi server di ${ASAL_API}. Pastikan backend Laravel sedang berjalan.`,
      0,
    )
  }

  if (res.status === 401 && token) {
    hapusToken()
    saatSesiHabis()
  }

  if (!res.ok) {
    const isi = await res.json().catch(() => null)
    throw new GalatApi(
      isi?.message || `Permintaan gagal dengan status ${res.status}`,
      res.status,
      isi?.errors ?? {},
    )
  }

  return res
}

/** Mengembalikan seluruh badan JSON, termasuk `data`, `message`, `meta`, dan kunci tambahan. */
export async function minta<T>(jalur: string, opsi: OpsiPermintaan = {}): Promise<T> {
  const res = await kirim(jalur, opsi)
  return (await res.json()) as T
}

/** Pintasan untuk respons berbentuk `{ data: T }`. */
export async function mintaData<T>(jalur: string, opsi: OpsiPermintaan = {}): Promise<T> {
  return (await minta<Respons<T>>(jalur, opsi)).data
}

/** Mengunduh berkas (PDF/XLSX) dengan token, lalu memicu simpan di peramban. */
export async function unduh(jalur: string, query: OpsiPermintaan['query'], namaCadangan: string) {
  const res = await kirim(jalur, { query })
  const disposisi = res.headers.get('Content-Disposition') ?? ''
  const nama = /filename="?([^";]+)"?/i.exec(disposisi)?.[1] ?? namaCadangan

  const url = URL.createObjectURL(await res.blob())
  const tautan = document.createElement('a')
  tautan.href = url
  tautan.download = nama
  tautan.click()
  URL.revokeObjectURL(url)
}

/**
 * Laravel membaca larik bersarang dari FormData dengan notasi kurung,
 * mis. `costs[0][category]`. Boolean dikirim sebagai 1/0.
 */
export function keFormData(isi: Record<string, unknown>, formulir = new FormData(), awalan = '') {
  for (const [kunci, nilai] of Object.entries(isi)) {
    const nama = awalan ? `${awalan}[${kunci}]` : kunci
    if (nilai === undefined) continue

    if (nilai === null) {
      formulir.append(nama, '')
    } else if (nilai instanceof Blob) {
      formulir.append(nama, nilai)
    } else if (typeof nilai === 'boolean') {
      formulir.append(nama, nilai ? '1' : '0')
    } else if (typeof nilai === 'object') {
      keFormData(nilai as Record<string, unknown>, formulir, nama)
    } else {
      formulir.append(nama, String(nilai))
    }
  }
  return formulir
}
