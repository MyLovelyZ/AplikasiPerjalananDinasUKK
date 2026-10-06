import { useState } from 'react'
import { useNavigate } from 'react-router'

import { apiAntreanAtasan } from '@/api/endpoint'
import type { FilterPersetujuan } from '@/api/endpoint'
import type { Perjalanan } from '@/api/tipe'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Muatan } from '@/components/ui/Keadaan'
import { PageHeader } from '@/components/ui/PageHeader'
import { Paginasi } from '@/components/ui/Paginasi'
import { KartuPersetujuan } from '@/features/approvals/components/KartuPersetujuan'
import { ModalKeputusan } from '@/features/approvals/components/ModalKeputusan'
import type { Keputusan } from '@/features/approvals/components/ModalKeputusan'
import { useHalaman } from '@/hooks/useHalaman'
import { usePermintaan } from '@/hooks/usePermintaan'
import { useAplikasi } from '@/layouts/konteksAplikasi'

const TAB: Array<{ nilai: FilterPersetujuan; label: string }> = [
  { nilai: 'pending', label: 'Menunggu keputusan' },
  { nilai: 'decided', label: 'Sudah saya putuskan' },
  { nilai: 'all', label: 'Semua pengajuan tim' },
]

/** /supervisor/approvals — rincian lengkap di /supervisor/approvals/:id. */
export function ApprovalsPage() {
  const { pencarian, sukses: onSukses, penandaSegar } = useAplikasi()
  const navigate = useNavigate()
  const [tab, setTab] = useState<FilterPersetujuan>('pending')
  const [halaman, setHalaman] = useHalaman(tab, pencarian)
  const [keputusan, setKeputusan] = useState<{ perjalanan: Perjalanan; jenis: Keputusan } | null>(null)

  const { data, memuat, galat, muatUlang } = usePermintaan(
    () => apiAntreanAtasan({ status: tab, search: pencarian, page: halaman, per_page: 12 }),
    [tab, pencarian, halaman, penandaSegar],
  )

  return (
    <>
      <PageHeader
        eyebrow="Atasan"
        title="Persetujuan"
        description="Pengajuan perjalanan dinas anggota tim Anda. Pengajuan yang disetujui diteruskan ke Keuangan."
      />

      <section className="panel">
        <div className="tab" role="tablist">
          {TAB.map((t) => (
            <button
              key={t.nilai}
              type="button"
              role="tab"
              aria-selected={tab === t.nilai}
              className={tab === t.nilai ? 'aktif' : ''}
              onClick={() => setTab(t.nilai)}
            >
              {t.label}
              {tab === t.nilai && data && <span className="hitungan">{data.meta.total}</span>}
            </button>
          ))}
        </div>

        <div className="bilah-alat">
          {pencarian && <span className="status biru">Pencarian: “{pencarian}”</span>}
          <button type="button" className="btn kecil dorong" onClick={muatUlang}>
            <Icon name="segarkan" size={15} />
            Segarkan
          </button>
        </div>

        <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={6}>
          {(hasil) =>
            hasil.data.length === 0 ? (
              <Kosong
                ikon="check"
                judul={tab === 'pending' ? 'Tidak ada yang menunggu' : 'Belum ada data'}
                pesan={
                  tab === 'pending'
                    ? 'Semua pengajuan tim sudah Anda putuskan.'
                    : 'Pengajuan tim akan muncul di sini setelah diajukan.'
                }
              />
            ) : (
              <>
                <div className="grid-persetujuan" style={{ padding: 16 }}>
                  {hasil.data.map((p) => (
                    <KartuPersetujuan
                      key={p.id}
                      perjalanan={p}
                      onLihatDetail={() => navigate(`/supervisor/approvals/${p.id}`)}
                      onPutuskan={
                        p.status === 'submitted' && tab === 'pending'
                          ? (jenis) => setKeputusan({ perjalanan: p, jenis })
                          : undefined
                      }
                    />
                  ))}
                </div>
                <Paginasi meta={hasil.meta} satuan="pengajuan" onPindah={setHalaman} />
              </>
            )
          }
        </Muatan>
      </section>

      {keputusan && (
        <ModalKeputusan
          perjalanan={keputusan.perjalanan}
          jenis={keputusan.jenis}
          onTutup={() => setKeputusan(null)}
          onSelesai={(pesan) => {
            setKeputusan(null)
            onSukses(pesan)
          }}
        />
      )}
    </>
  )
}
