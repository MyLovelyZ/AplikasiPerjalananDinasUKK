import { useState } from 'react'

import { apiDaftarNotifikasi, apiTandaiSemuaDibaca } from '@/api/endpoint'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Muatan } from '@/components/ui/Keadaan'
import { PageHeader } from '@/components/ui/PageHeader'
import { Paginasi } from '@/components/ui/Paginasi'
import { BarisNotifikasi } from '@/features/notifications/components/BarisNotifikasi'
import { useHalaman } from '@/hooks/useHalaman'
import { useKirim } from '@/hooks/useKirim'
import { usePermintaan } from '@/hooks/usePermintaan'
import { useAplikasi } from '@/layouts/konteksAplikasi'

const TAB = [
  { nilai: false, label: 'Semua' },
  { nilai: true, label: 'Belum dibaca' },
] as const

/** /notifications — semua peran. */
export function NotifikasiPage() {
  const { notifikasiBelumDibaca, segarkanNotifikasi } = useAplikasi()
  const [hanyaBelum, setHanyaBelum] = useState(false)
  const [halaman, setHalaman] = useHalaman(hanyaBelum)
  const { mengirim, jalankan } = useKirim()

  const { data, memuat, galat, muatUlang } = usePermintaan(
    () => apiDaftarNotifikasi({ unread: hanyaBelum, page: halaman, per_page: 15 }),
    [hanyaBelum, halaman, notifikasiBelumDibaca],
  )

  const berubah = () => {
    muatUlang()
    segarkanNotifikasi()
  }

  const bacaSemua = () => jalankan(apiTandaiSemuaDibaca).then(berubah)

  return (
    <>
      <PageHeader
        eyebrow="Akun"
        title="Notifikasi"
        description="Pemberitahuan tentang pengajuan, persetujuan, laporan biaya, dan pembayaran perjalanan dinas."
        action={
          notifikasiBelumDibaca > 0 && (
            <button type="button" className="btn" onClick={bacaSemua} disabled={mengirim}>
              <Icon name="check" size={16} />
              Tandai semua dibaca
            </button>
          )
        }
      />

      <section className="panel">
        <div className="tab" role="tablist">
          {TAB.map((t) => (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={hanyaBelum === t.nilai}
              className={hanyaBelum === t.nilai ? 'aktif' : ''}
              onClick={() => setHanyaBelum(t.nilai)}
            >
              {t.label}
              {t.nilai && notifikasiBelumDibaca > 0 && <span className="hitungan">{notifikasiBelumDibaca}</span>}
            </button>
          ))}
        </div>

        <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={6}>
          {(hasil) =>
            hasil.data.length === 0 ? (
              <Kosong
                ikon="bell"
                judul={hanyaBelum ? 'Semua sudah dibaca' : 'Belum ada notifikasi'}
                pesan="Pemberitahuan pengajuan, persetujuan, dan pembayaran akan muncul di sini."
              />
            ) : (
              <>
                <div className="daftar-notif">
                  {hasil.data.map((n) => (
                    <BarisNotifikasi key={n.id} notifikasi={n} onBerubah={berubah} />
                  ))}
                </div>
                <Paginasi meta={hasil.meta} satuan="notifikasi" onPindah={setHalaman} />
              </>
            )
          }
        </Muatan>
      </section>
    </>
  )
}
