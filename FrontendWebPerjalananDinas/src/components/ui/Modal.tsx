import { useEffect } from 'react'
import type { FormEvent, ReactNode } from 'react'

import { Icon } from '@/components/ui/Icon'

interface ModalProps {
  judul: string
  keterangan?: ReactNode
  ukuran?: 'sempit' | 'lebar'
  onTutup: () => void
  /** Bila diisi, isi dan kaki modal dibungkus sebuah `<form>`. */
  onKirim?: (peristiwa: FormEvent) => void
  /** Disisipkan di antara kepala dan isi, mis. ringkasan angka. */
  sisipan?: ReactNode
  kaki?: ReactNode
  children: ReactNode
}

export function Modal({ judul, keterangan, ukuran, onTutup, onKirim, sisipan, kaki, children }: ModalProps) {
  useEffect(() => {
    const tekanEscape = (peristiwa: KeyboardEvent) => {
      if (peristiwa.key === 'Escape') onTutup()
    }
    document.addEventListener('keydown', tekanEscape)
    return () => document.removeEventListener('keydown', tekanEscape)
  }, [onTutup])

  const isi = (
    <>
      <div className="modal-body">{children}</div>
      {kaki && <div className="modal-kaki">{kaki}</div>}
    </>
  )

  return (
    <div className="lapisan-modal" role="dialog" aria-modal="true" aria-label={judul}>
      <div className={`modal ${ukuran ?? ''}`}>
        <div className="modal-head">
          <div>
            <h2>{judul}</h2>
            {keterangan && <p>{keterangan}</p>}
          </div>
          <button type="button" className="tombol-tutup" onClick={onTutup} aria-label="Tutup">
            ×
          </button>
        </div>

        {sisipan}

        {onKirim ? (
          <form onSubmit={onKirim} style={{ display: 'contents' }}>
            {isi}
          </form>
        ) : (
          isi
        )}
      </div>
    </div>
  )
}

export function KotakGalat({ pesan }: { pesan: string | null }) {
  if (!pesan) return null
  return (
    <div className="kotak-galat" role="alert">
      <Icon name="peringatan" size={16} />
      <span>{pesan}</span>
    </div>
  )
}

export function PesanKolom({ pesan }: { pesan?: string }) {
  return pesan ? <span className="pesan-galat">{pesan}</span> : null
}
