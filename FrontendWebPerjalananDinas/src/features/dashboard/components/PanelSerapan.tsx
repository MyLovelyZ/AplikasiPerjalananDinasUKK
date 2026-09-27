import { Kosong } from '@/components/ui/Keadaan'
import { PanelHeader } from '@/components/ui/PanelHeader'
import type { SerapanAnggaran } from '@/api/tipe'
import { rupiahRingkas } from '@/utils/format'

/**
 * Serapan anggaran per departemen.
 * Warna batang berubah saat serapan mendekati atau melewati pagu, supaya
 * departemen yang anggarannya menipis langsung terlihat.
 */
export function PanelSerapan({ daftar, tahun }: { daftar: SerapanAnggaran[]; tahun: number }) {
  const kelasBilah = (persen: number) => {
    if (persen >= 100) return 'lewat'
    if (persen >= 80) return 'penuh'
    return ''
  }

  return (
    <section className="panel">
      <PanelHeader
        title="Serapan Anggaran"
        subtitle={`Pemakaian pagu perjalanan dinas tahun ${tahun}`}
      />

      {daftar.length === 0 ? (
        <Kosong
          ikon="wallet"
          judul="Belum ada pos anggaran"
          pesan={`Pos anggaran tahun ${tahun} belum dibuat untuk satu pun departemen.`}
        />
      ) : (
        <div className="serapan">
          {daftar.map((pos) => (
            <div className="serapan-item" key={pos.anggaran_id}>
              <div className="baris-atas">
                <b>{pos.departemen}</b>
                <small>
                  {rupiahRingkas(pos.terpakai)} / {rupiahRingkas(pos.pagu)} ·{' '}
                  {pos.persen_terpakai}%
                </small>
              </div>
              <div className="bilah">
                <i
                  className={kelasBilah(pos.persen_terpakai)}
                  style={{ width: `${Math.min(100, pos.persen_terpakai)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
