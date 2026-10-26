import { Icon } from '@/components/ui/Icon'

export interface Tindakan {
  jumlah: number
  judul: string
  /** Kalimat singkat yang menjelaskan angka, mis. "Rp 4,2 jt menunggu dibayar". */
  keterangan: string
  jalur: string
}

interface DaftarTindakanProps {
  daftar: Tindakan[]
  onBuka: (jalur: string) => void
}

/**
 * Bagian "Perlu tindakan" di puncak dashboard: angka besar + kalimat + tombol.
 * Angka yang bukan nol diberi kotak oranye agar langsung terlihat.
 */
export function DaftarTindakan({ daftar, onBuka }: DaftarTindakanProps) {
  return (
    <section className="tindakan" aria-label="Perlu tindakan">
      <h2>Perlu tindakan</h2>
      <div className="tindakan-daftar">
        {daftar.map((t) => (
          <button
            key={t.judul}
            type="button"
            className={`tindakan-baris ${t.jumlah > 0 ? 'ada' : ''}`}
            onClick={() => onBuka(t.jalur)}
          >
            <span className="tindakan-angka angka">{t.jumlah}</span>
            <span className="tindakan-teks">
              <b>{t.judul}</b>
              <small>{t.keterangan}</small>
            </span>
            <Icon name="chevron" size={18} />
          </button>
        ))}
      </div>
    </section>
  )
}
