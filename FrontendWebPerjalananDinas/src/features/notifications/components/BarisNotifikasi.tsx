import { useNavigate } from 'react-router'

import { apiTandaiDibaca } from '@/api/endpoint'
import type { Notifikasi } from '@/api/tipe'
import { useAuth } from '@/auth/useAuth'
import { teksNotifikasi } from '@/constants/label'
import { tautanNotifikasi } from '@/constants/navigation'
import { sejak } from '@/utils/format'

interface BarisNotifikasiProps {
  notifikasi: Notifikasi
  /** Dipanggil setelah notifikasi ditandai dibaca, agar hitungan dan daftar ikut segar. */
  onBerubah: () => void
  /** Dipanggil sebelum berpindah halaman, mis. untuk menutup laci. */
  onBuka?: () => void
}

/** Satu notifikasi: mengkliknya menandai dibaca lalu membuka perjalanan terkait. */
export function BarisNotifikasi({ notifikasi: n, onBerubah, onBuka }: BarisNotifikasiProps) {
  const { pengguna } = useAuth()
  const navigate = useNavigate()
  const { judul, pesan } = teksNotifikasi(n)
  const tujuan = pengguna ? tautanNotifikasi(n, pengguna.role) : null

  const buka = async () => {
    if (!n.is_read) {
      await apiTandaiDibaca(n.id).catch(() => null)
      onBerubah()
    }
    onBuka?.()
    if (tujuan) navigate(tujuan)
  }

  return (
    <button type="button" className={`notif-baris ${n.is_read ? 'sudah' : 'belum'}`} onClick={buka}>
      <span className="penanda" />
      <span className="teks">
        <b>{judul}</b>
        <p>{pesan}</p>
        <small>
          {n.details.request_number} · {sejak(n.created_at)}
        </small>
      </span>
    </button>
  )
}
