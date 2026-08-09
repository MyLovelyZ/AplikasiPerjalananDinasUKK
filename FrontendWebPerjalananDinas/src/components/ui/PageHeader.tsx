import type { ReactNode } from 'react'

interface PageHeaderProps {
  /** Teks kecil huruf kapital di atas judul. */
  eyebrow: string
  title: string
  description: string
  /** Tombol atau elemen aksi yang tampil di sisi kanan judul. */
  action?: ReactNode
}

/** Judul halaman standar: eyebrow, judul, deskripsi, dan satu slot aksi. */
export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}
