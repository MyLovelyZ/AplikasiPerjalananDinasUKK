import { createContext, useContext, useEffect } from 'react'
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

/**
 * Bila bernilai true, `Modal` digambar sebagai halaman penuh (punya URL sendiri)
 * alih-alih jendela melayang. Modal yang dibuka dari dalam halaman itu tetap
 * melayang karena konteksnya dikembalikan ke false.
 */
const KonteksLembar = createContext(false)

export function SebagaiHalaman({ children }: { children: ReactNode }) {
  return <KonteksLembar.Provider value>{children}</KonteksLembar.Provider>
}

export function Modal({ judul, keterangan, ukuran, onTutup, onKirim, sisipan, kaki, children }: ModalProps) {
  const halaman = useContext(KonteksLembar)

  useEffect(() => {
    if (halaman) return
    const tekanEscape = (peristiwa: KeyboardEvent) => {
      if (peristiwa.key === 'Escape') onTutup()
    }
    document.addEventListener('keydown', tekanEscape)
    return () => document.removeEventListener('keydown', tekanEscape)
  }, [onTutup, halaman])

  const isi = (
    <>
      <div className="modal-body">{children}</div>
      {kaki && <div className="modal-kaki">{kaki}</div>}
    </>
  )

  const kepala = (
    <div className="modal-head">
      {halaman && (
        <button type="button" className="tombol-kembali" onClick={onTutup} aria-label="Kembali">
          <Icon name="chevron" size={16} />
        </button>
      )}
      <div>
        <h2>{judul}</h2>
        {keterangan && <p>{keterangan}</p>}
      </div>
      {!halaman && (
        <button type="button" className="tombol-tutup" onClick={onTutup} aria-label="Tutup">
          ×
        </button>
      )}
    </div>
  )

  const badan = onKirim ? (
    <form onSubmit={onKirim} style={{ display: 'contents' }}>
      {isi}
    </form>
  ) : (
    isi
  )

  if (halaman) {
    return (
      <section className="modal lembar" aria-label={judul}>
        {kepala}
        {sisipan}
        <KonteksLembar.Provider value={false}>{badan}</KonteksLembar.Provider>
      </section>
    )
  }

  return (
    <div className="lapisan-modal" role="dialog" aria-modal="true" aria-label={judul}>
      <div className={`modal ${ukuran ?? ''}`}>
        {kepala}

        {sisipan}
        {badan}
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
