import { Icon } from '@/components/ui/Icon'
import { useTema } from '@/hooks/useTema'

/** Tombol bulat pengganti tema terang/gelap; ikonnya menunjukkan tema tujuan. */
export function TombolTema({ className = 'icon-btn' }: { className?: string }) {
  const { tema, gantiTema } = useTema()
  const keGelap = tema === 'terang'

  return (
    <button
      type="button"
      className={className}
      onClick={gantiTema}
      aria-label={keGelap ? 'Ganti ke mode gelap' : 'Ganti ke mode terang'}
      title={keGelap ? 'Mode gelap' : 'Mode terang'}
    >
      <Icon name={keGelap ? 'bulan' : 'matahari'} size={18} />
    </button>
  )
}
