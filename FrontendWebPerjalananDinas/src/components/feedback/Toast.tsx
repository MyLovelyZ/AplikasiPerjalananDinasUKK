import { Icon } from '@/components/ui/Icon'

export interface PesanToast {
  teks: string
  jenis: 'sukses' | 'galat'
}

/** Notifikasi ringkas di pojok kanan bawah layar. */
export function Toast({ pesan }: { pesan: PesanToast }) {
  return (
    <div
      className={`toast ${pesan.jenis === 'galat' ? 'galat' : ''}`}
      role="status"
      aria-live="polite"
    >
      <Icon name={pesan.jenis === 'galat' ? 'peringatan' : 'check'} size={17} />
      {pesan.teks}
    </div>
  )
}
