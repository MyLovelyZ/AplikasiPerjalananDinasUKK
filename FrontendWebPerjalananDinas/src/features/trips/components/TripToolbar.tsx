import { Icon } from '@/components/ui/Icon'

const STATUS_FILTERS = ['Semua Status', 'Disetujui', 'Menunggu']

interface TripToolbarProps {
  onApplyFilter: () => void
}

/** Baris filter di atas tabel perjalanan: pencarian, status, dan tombol terapkan. */
export function TripToolbar({ onApplyFilter }: TripToolbarProps) {
  return (
    <div className="toolbar">
      <div className="filter-search">
        <Icon name="search" size={17} />
        <input
          aria-label="Cari nomor, tujuan, atau kegiatan"
          placeholder="Cari nomor, tujuan, atau kegiatan..."
        />
      </div>
      <select aria-label="Filter status">
        {STATUS_FILTERS.map((status) => (
          <option key={status}>{status}</option>
        ))}
      </select>
      <button type="button" className="outline" onClick={onApplyFilter}>
        Terapkan
      </button>
    </div>
  )
}
