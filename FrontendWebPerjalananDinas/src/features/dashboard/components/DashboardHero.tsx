import { Icon } from '@/components/ui/Icon'

interface DashboardHeroProps {
  onCreateTrip: () => void
}

/** Banner sambutan beserta ilustrasi rute perjalanan. */
export function DashboardHero({ onCreateTrip }: DashboardHeroProps) {
  return (
    <section className="hero">
      <div>
        <p className="eyebrow">Sistem Informasi Perjalanan Dinas</p>
        <h1>Selamat datang</h1>
        <p>
          Kelola pengajuan, perjalanan, persetujuan, dan laporan dinas dalam satu
          tempat.
        </p>
        <button type="button" className="primary" onClick={onCreateTrip}>
          <Icon name="plus" size={18} /> Buat Pengajuan
        </button>
      </div>
      <div className="hero-art">
        <div className="route-line"></div>
        <div className="pin pin-a">●</div>
        <div className="pin pin-b">●</div>
        <Icon name="plane" size={58} />
      </div>
    </section>
  )
}
