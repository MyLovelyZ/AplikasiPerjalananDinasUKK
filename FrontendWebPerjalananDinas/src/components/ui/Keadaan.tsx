import type { ReactNode } from 'react'

import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/types/icon'

/**
 * Tiga keadaan yang selalu muncul saat halaman mengambil data dari API.
 * Dikumpulkan di satu berkas supaya bentuknya seragam di seluruh aplikasi
 * dan tidak ada halaman yang lupa menangani salah satunya.
 */

interface KosongProps {
  ikon?: IconName
  judul: string
  pesan: string
  aksi?: ReactNode
}

/** Data berhasil diambil, tetapi memang belum ada isinya. */
export function Kosong({ ikon = 'kosong', judul, pesan, aksi }: KosongProps) {
  return (
    <div className="keadaan">
      <div className="ikon-keadaan">
        <Icon name={ikon} size={22} />
      </div>
      <strong>{judul}</strong>
      <p>{pesan}</p>
      {aksi}
    </div>
  )
}

interface GalatProps {
  pesan: string
  onCobaLagi?: () => void
}

/** Permintaan gagal — selalu ditemani jalan keluar berupa tombol coba lagi. */
export function Galat({ pesan, onCobaLagi }: GalatProps) {
  return (
    <div className="keadaan galat">
      <div className="ikon-keadaan">
        <Icon name="peringatan" size={22} />
      </div>
      <strong>Gagal memuat data</strong>
      <p>{pesan}</p>
      {onCobaLagi && (
        <button type="button" className="btn kecil" onClick={onCobaLagi}>
          <Icon name="segarkan" size={15} />
          Coba lagi
        </button>
      )}
    </div>
  )
}

/** Rangka abu-abu selagi data diambil, menahan tinggi agar tidak melompat. */
export function Memuat({ baris = 4 }: { baris?: number }) {
  return (
    <div className="tumpuk-rangka">
      {Array.from({ length: baris }, (_, indeks) => (
        <div
          key={indeks}
          className="rangka"
          style={{ width: `${100 - (indeks % 3) * 14}%` }}
        />
      ))}
    </div>
  )
}

interface PembungkusProps<T> {
  data: T | null
  memuat: boolean
  galat: string | null
  onCobaLagi?: () => void
  barisRangka?: number
  /** Dipakai bila `data` berupa larik kosong. */
  kosong?: ReactNode
  children: (data: T) => ReactNode
}

/**
 * Merangkum pola "memuat -> galat -> kosong -> isi" yang berulang di setiap
 * halaman. Tanpa ini, tiap halaman menulis empat percabangan yang sama.
 */
export function Muatan<T>({
  data,
  memuat,
  galat,
  onCobaLagi,
  barisRangka = 4,
  kosong,
  children,
}: PembungkusProps<T>) {
  if (memuat && data === null) return <Memuat baris={barisRangka} />
  if (galat) return <Galat pesan={galat} onCobaLagi={onCobaLagi} />
  if (data === null) return null
  if (kosong && Array.isArray(data) && data.length === 0) return <>{kosong}</>
  return <>{children(data)}</>
}
