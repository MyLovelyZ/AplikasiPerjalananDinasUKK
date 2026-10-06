import type { DashboardKeuangan } from '@/api/tipe'
import { Kosong } from '@/components/ui/Keadaan'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { rupiahRingkas } from '@/utils/format'

const kelasBilah = (persen: number) => (persen >= 100 ? 'lewat' : persen >= 80 ? 'penuh' : '')

/** Serapan anggaran per departemen; batang berubah warna saat mendekati atau melewati pagu. */
export function PanelSerapan({ anggaran }: { anggaran: DashboardKeuangan['budget'] }) {
  return (
    <section className="panel">
      <PanelHeader
        title="Serapan Anggaran"
        subtitle={`Komitmen terhadap pagu tahun ${anggaran.year} · ${anggaran.utilization_percentage}% terpakai`}
      />

      {anggaran.by_department.length === 0 ? (
        <Kosong
          ikon="wallet"
          judul="Belum ada anggaran"
          pesan={`Anggaran tahun ${anggaran.year} belum dialokasikan untuk departemen mana pun.`}
        />
      ) : (
        <div className="serapan">
          {anggaran.by_department.map((pos) => (
            <div className="serapan-item" key={pos.department.id}>
              <div className="baris-atas">
                <b>{pos.department.name}</b>
                <small>
                  {rupiahRingkas(pos.committed_amount)} / {rupiahRingkas(pos.amount)} · {pos.utilization_percentage}%
                </small>
              </div>
              <div className="bilah">
                <i
                  className={kelasBilah(pos.utilization_percentage)}
                  style={{ width: `${Math.min(100, pos.utilization_percentage)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
