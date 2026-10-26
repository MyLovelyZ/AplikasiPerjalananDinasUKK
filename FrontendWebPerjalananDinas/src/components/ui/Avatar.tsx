import { inisial } from '@/utils/format'

interface AvatarProps {
  nama: string | null | undefined
  foto?: string | null
  /** Ukuran tambahan: "besar" (56px) atau "jumbo" (96px); bawaan 32px. */
  ukuran?: 'besar' | 'jumbo'
}

/** Foto profil bulat; bila belum ada foto, tampil inisial nama. */
export function Avatar({ nama, foto, ukuran }: AvatarProps) {
  return <span className={`avatar ${ukuran ?? ''}`}>{foto ? <img src={foto} alt="" /> : inisial(nama)}</span>
}
