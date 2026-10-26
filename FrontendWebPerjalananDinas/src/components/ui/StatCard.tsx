interface StatCardProps {
  title: string
  value: string | number
  /** Keterangan tambahan di bawah angka utama. */
  note: string
}

/** Angka ringkasan: label, angka besar, lalu keterangan. Dipakai di dashboard dan halaman laporan. */
export function StatCard({ title, value, note }: StatCardProps) {
  return (
    <div className="stat">
      <span className="stat-label">{title}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  )
}
