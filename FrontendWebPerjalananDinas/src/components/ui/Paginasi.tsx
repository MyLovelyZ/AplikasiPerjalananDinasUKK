import type { ResponsHalaman } from '@/api/tipe'

interface PaginasiProps {
  meta: ResponsHalaman<unknown>['meta']
  satuan: string
  onPindah: (halaman: number) => void
}

export function Paginasi({ meta, satuan, onPindah }: PaginasiProps) {
  return (
    <div className="paginasi">
      <span>
        {meta.total === 0
          ? `Tidak ada ${satuan}`
          : `Menampilkan ${meta.from}–${meta.to} dari ${meta.total} ${satuan} · halaman ${meta.current_page} / ${meta.last_page}`}
      </span>
      <div className="tombol-halaman">
        <button
          type="button"
          className="btn kecil"
          disabled={meta.current_page <= 1}
          onClick={() => onPindah(meta.current_page - 1)}
        >
          Sebelumnya
        </button>
        <button
          type="button"
          className="btn kecil"
          disabled={meta.current_page >= meta.last_page}
          onClick={() => onPindah(meta.current_page + 1)}
        >
          Berikutnya
        </button>
      </div>
    </div>
  )
}
