import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import { Icon } from '@/components/ui/Icon'

interface PilihanProps<T extends string | number> {
  /** Nama penyaring yang selalu tampil di atas nilainya, mis. "Tahun". */
  label: string
  nilai: T
  opsi: Array<{ nilai: T; label: string }>
  onUbah: (nilai: T) => void
  /** Nilai "tanpa penyaring"; bila nilai berbeda, tombol ditandai sedang menyaring. */
  bawaan?: T
}

/**
 * Dropdown penyaring: tombol berisi judul + nilai terpilih, lalu daftar pilihan
 * bertanda centang. Pola listbox ARIA: panah atas/bawah, Home/End, Enter/Spasi
 * untuk memilih, Escape untuk menutup.
 */
export function Pilihan<T extends string | number>({ label, nilai, opsi, onUbah, bawaan }: PilihanProps<T>) {
  const id = useId()
  const [terbuka, setTerbuka] = useState(false)
  const [sorot, setSorot] = useState(0)
  const pembungkusRef = useRef<HTMLDivElement>(null)
  const tombolRef = useRef<HTMLButtonElement>(null)
  const daftarRef = useRef<HTMLUListElement>(null)

  const indeksTerpilih = Math.max(
    0,
    opsi.findIndex((o) => o.nilai === nilai),
  )
  const terpilih = opsi[indeksTerpilih]
  const menyaring = bawaan !== undefined && nilai !== bawaan

  const buka = () => {
    setSorot(indeksTerpilih)
    setTerbuka(true)
  }

  const tutup = (kembalikanFokus: boolean) => {
    setTerbuka(false)
    if (kembalikanFokus) tombolRef.current?.focus()
  }

  const pilih = (indeks: number) => {
    const o = opsi[indeks]
    if (o && o.nilai !== nilai) onUbah(o.nilai)
    tutup(true)
  }

  // Saat terbuka: fokus ke daftar, dan tutup bila pengguna mengklik di luar.
  useEffect(() => {
    if (!terbuka) return
    daftarRef.current?.focus()
    const klikDiLuar = (peristiwa: MouseEvent) => {
      if (!pembungkusRef.current?.contains(peristiwa.target as Node)) setTerbuka(false)
    }
    document.addEventListener('mousedown', klikDiLuar)
    return () => document.removeEventListener('mousedown', klikDiLuar)
  }, [terbuka])

  // Pilihan yang disorot selalu terlihat walau daftarnya panjang.
  useEffect(() => {
    if (terbuka) document.getElementById(`${id}-${sorot}`)?.scrollIntoView({ block: 'nearest' })
  }, [terbuka, sorot, id])

  const tombolKeyDown = (peristiwa: KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(peristiwa.key)) {
      peristiwa.preventDefault()
      buka()
    }
  }

  const daftarKeyDown = (peristiwa: KeyboardEvent) => {
    const terakhir = opsi.length - 1
    switch (peristiwa.key) {
      case 'ArrowDown':
        setSorot((s) => Math.min(terakhir, s + 1))
        break
      case 'ArrowUp':
        setSorot((s) => Math.max(0, s - 1))
        break
      case 'Home':
        setSorot(0)
        break
      case 'End':
        setSorot(terakhir)
        break
      case 'Enter':
      case ' ':
        pilih(sorot)
        break
      case 'Escape':
        tutup(true)
        break
      case 'Tab':
        tutup(false)
        return
      default:
        return
    }
    peristiwa.preventDefault()
  }

  return (
    <div className={`pilihan ${menyaring ? 'menyaring' : ''}`} ref={pembungkusRef}>
      <button
        ref={tombolRef}
        type="button"
        className="pilihan-tombol"
        aria-haspopup="listbox"
        aria-expanded={terbuka}
        aria-controls={`${id}-daftar`}
        onClick={() => (terbuka ? tutup(false) : buka())}
        onKeyDown={tombolKeyDown}
      >
        <span className="pilihan-teks">
          <small>{label}</small>
          <b>{terpilih?.label ?? '—'}</b>
        </span>
        <Icon name="chevron" size={16} />
      </button>

      {terbuka && (
        <ul
          ref={daftarRef}
          id={`${id}-daftar`}
          className="pilihan-daftar"
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          aria-activedescendant={`${id}-${sorot}`}
          onKeyDown={daftarKeyDown}
        >
          {opsi.map((o, indeks) => (
            <li
              key={String(o.nilai)}
              id={`${id}-${indeks}`}
              role="option"
              aria-selected={o.nilai === nilai}
              className={indeks === sorot ? 'disorot' : ''}
              onMouseEnter={() => setSorot(indeks)}
              onClick={() => pilih(indeks)}
            >
              <span>{o.label}</span>
              {o.nilai === nilai && <Icon name="check" size={16} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
