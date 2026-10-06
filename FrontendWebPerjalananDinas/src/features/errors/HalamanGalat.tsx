import { Link } from 'react-router'

import { useAuth } from '@/auth/useAuth'
import { Kosong } from '@/components/ui/Keadaan'
import { BERANDA_PERAN } from '@/constants/navigation'

const RUPA = {
  403: {
    judul: '403 · Akses ditolak',
    pesan: 'Halaman ini milik peran lain. Peran Anda tidak diizinkan membukanya.',
  },
  404: {
    judul: '404 · Halaman tidak ditemukan',
    pesan: 'Alamat yang Anda buka tidak ada atau sudah dipindahkan.',
  },
} as const

export function HalamanGalat({ kode }: { kode: keyof typeof RUPA }) {
  const { pengguna } = useAuth()
  const { judul, pesan } = RUPA[kode]

  return (
    <section className="panel">
      <Kosong
        ikon="peringatan"
        judul={judul}
        pesan={pesan}
        aksi={
          <Link className="btn kecil utama" to={pengguna ? BERANDA_PERAN[pengguna.role] : '/login'}>
            Kembali ke dashboard
          </Link>
        }
      />
    </section>
  )
}
