import type { HitunganStatus, Perjalanan } from '@/api/tipe'
import { Kosong } from '@/components/ui/Keadaan'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { RUPA_STATUS_PERJALANAN } from '@/constants/label'
import type { IconName } from '@/types/icon'
import { rentangTanggal } from '@/utils/format'

interface DaftarPerjalananProps {
  daftar: Perjalanan[]
  onBuka?: (perjalanan: Perjalanan) => void
  kosong: { ikon: IconName; judul: string; pesan: string }
  /** Tampilkan nama pemohon, untuk dashboard atasan dan keuangan. */
  denganPemohon?: boolean
}

export function DaftarPerjalanan({ daftar, onBuka, kosong, denganPemohon }: DaftarPerjalananProps) {
  if (daftar.length === 0) return <Kosong ikon={kosong.ikon} judul={kosong.judul} pesan={kosong.pesan} />

  return (
    <div className="daftar">
      {daftar.map((p) => (
        <button key={p.id} type="button" className="daftar-baris" onClick={() => onBuka?.(p)} disabled={!onBuka}>
          <span className="isi">
            <b>
              {p.request_number} · {denganPemohon && p.requester ? p.requester.name : p.purpose}
            </b>
            <small>
              {p.destination} · {rentangTanggal(p.departure_date, p.return_date)}
            </small>
          </span>
          <StatusBadge {...RUPA_STATUS_PERJALANAN[p.status]} />
        </button>
      ))}
    </div>
  )
}

/** Jumlah pengajuan per status; status bernilai nol disembunyikan. */
export function DaftarStatus({ daftar }: { daftar: HitunganStatus[] }) {
  const terisi = daftar.filter((s) => s.total > 0)
  if (terisi.length === 0) return <Kosong ikon="chart" judul="Belum ada pengajuan" pesan="Angka muncul setelah ada pengajuan." />

  return (
    <div className="daftar">
      {terisi.map((s) => (
        <div className="daftar-baris" key={s.status}>
          <span className="isi">
            <b>{RUPA_STATUS_PERJALANAN[s.status].label}</b>
          </span>
          <span className="status netral">{s.total}</span>
        </div>
      ))}
    </div>
  )
}
