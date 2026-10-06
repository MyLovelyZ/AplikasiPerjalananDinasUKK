import { useState } from 'react'

import { apiLogAudit } from '@/api/endpoint'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Muatan } from '@/components/ui/Keadaan'
import { PageHeader } from '@/components/ui/PageHeader'
import { Paginasi } from '@/components/ui/Paginasi'
import { LABEL_AKSI_AUDIT } from '@/constants/label'
import { useHalaman } from '@/hooks/useHalaman'
import { usePermintaan } from '@/hooks/usePermintaan'
import { waktu } from '@/utils/format'

export function AuditLogPage({ pencarian }: { pencarian: string }) {
  const [aksi, setAksi] = useState('')
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [halaman, setHalaman] = useHalaman(aksi, dari, sampai, pencarian)

  const { data, memuat, galat, muatUlang } = usePermintaan(
    () => apiLogAudit({ search: pencarian, action: aksi, date_from: dari, date_to: sampai, page: halaman }),
    [pencarian, aksi, dari, sampai, halaman],
  )

  return (
    <>
      <PageHeader
        eyebrow="Super Admin"
        title="Log Audit"
        description="Jejak setiap aktivitas penting: masuk, perubahan data, persetujuan, verifikasi, dan pembayaran."
      />

      <section className="panel">
        <div className="bilah-alat">
          <select value={aksi} onChange={(e) => setAksi(e.target.value)} aria-label="Jenis aktivitas">
            <option value="">Semua aktivitas</option>
            {Object.entries(LABEL_AKSI_AUDIT).map(([nilai, label]) => (
              <option key={nilai} value={nilai}>
                {label}
              </option>
            ))}
          </select>
          <input type="date" aria-label="Dari tanggal" value={dari} onChange={(e) => setDari(e.target.value)} />
          <input type="date" aria-label="Sampai tanggal" min={dari} value={sampai} onChange={(e) => setSampai(e.target.value)} />
          {pencarian && <span className="status biru">Pencarian: “{pencarian}”</span>}
          <button type="button" className="btn kecil dorong" onClick={muatUlang}>
            <Icon name="segarkan" size={15} />
            Segarkan
          </button>
        </div>

        <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={8}>
          {(hasil) =>
            hasil.data.length === 0 ? (
              <Kosong ikon="clock" judul="Tidak ada catatan" pesan="Tidak ada aktivitas yang cocok dengan penyaring." />
            ) : (
              <>
                <div className="pembungkus-tabel">
                  <table className="tabel">
                    <thead>
                      <tr>
                        <th>Waktu</th>
                        <th>Pengguna</th>
                        <th>Aktivitas</th>
                        <th>Keterangan</th>
                        <th>Alamat IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasil.data.map((log) => (
                        <tr key={log.id}>
                          <td className="sel-sekunder" style={{ whiteSpace: 'nowrap' }}>
                            {waktu(log.created_at)}
                          </td>
                          <td>
                            <div className="sel-utama">{log.user?.name ?? 'Sistem'}</div>
                            <div className="sel-sekunder">{log.user?.email}</div>
                          </td>
                          <td>
                            <span className="status netral">{LABEL_AKSI_AUDIT[log.action] ?? log.action_label}</span>
                          </td>
                          <td>{log.description}</td>
                          <td className="sel-sekunder angka">{log.ip_address ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Paginasi meta={hasil.meta} satuan="catatan" onPindah={setHalaman} />
              </>
            )
          }
        </Muatan>
      </section>
    </>
  )
}
