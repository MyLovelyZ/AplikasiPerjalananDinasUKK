import type { DashboardKeuangan } from '@/api/tipe'
import { Kosong } from '@/components/ui/Keadaan'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { angka, rupiahRingkas } from '@/utils/format'

/** Serapan anggaran per departemen; batang berubah oranye saat mencapai 80% pagu. */
export function PanelSerapan({ anggaran }: { anggaran: DashboardKeuangan['budget'] }) {
  return (
    <section className="panel">
      <PanelHeader
        title="Anggaran per departemen"
        subtitle={`Berapa yang sudah terpakai dari batas tahun ${anggaran.year}`}
      />

      {anggaran.by_department.length === 0 ? (
        <Kosong
          ikon="wallet"
          judul="Belum ada anggaran"
          pesan={`Anggaran tahun ${anggaran.year} belum dialokasikan untuk departemen mana pun.`}
        />
      ) : (
        <div className="daftar-batang dua-kolom">
          {anggaran.by_department.map((pos) => (
            <div className="batang-item" key={pos.department.id}>
              <div className="baris-atas">
                <span>{pos.department.name}</span>
                <b className="angka">{angka(pos.utilization_percentage)}%</b>
              </div>
              <div className="bilah">
                <i
                  className={pos.utilization_percentage >= 80 ? 'penuh' : ''}
                  style={{ width: `${Math.min(100, pos.utilization_percentage)}%` }}
                />
              </div>
              <small className="angka">
                {rupiahRingkas(pos.committed_amount)} terpakai dari {rupiahRingkas(pos.amount)}
              </small>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
