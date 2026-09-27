import { useState } from 'react'

import { apiDaftarKaryawan, apiDepartemen } from '@/api/endpoint'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Muatan } from '@/components/ui/Keadaan'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { usePermintaan } from '@/hooks/usePermintaan'
import { inisial, manusiawi } from '@/utils/format'

/** Warna lencana status kepegawaian. */
const WARNA_STATUS = {
  AKTIF: 'hijau' as const,
  CUTI: 'kuning' as const,
  NONAKTIF: 'netral' as const,
}

/** Direktori karyawan beserta akun dan perannya. */
export function EmployeesPage({ pencarian }: { pencarian: string }) {
  const [departemenId, setDepartemenId] = useState('')
  const [halaman, setHalaman] = useState(1)

  const departemen = usePermintaan(() => apiDepartemen(), [])
  const { data, memuat, galat, muatUlang } = usePermintaan(
    () =>
      apiDaftarKaryawan({
        halaman,
        per_halaman: 15,
        cari: pencarian || undefined,
        departemen_id: departemenId ? Number(departemenId) : undefined,
      }),
    [halaman, departemenId, pencarian],
  )

  const gantiDepartemen = (nilai: string) => {
    setDepartemenId(nilai)
    setHalaman(1)
  }

  return (
    <>
      <PageHeader
        eyebrow="Data Master"
        title="Direktori Pegawai"
        description="Daftar karyawan beserta departemen, atasan langsung, dan peran akunnya di sistem."
      />

      <section className="panel">
        <div className="bilah-alat">
          <select
            value={departemenId}
            onChange={(e) => gantiDepartemen(e.target.value)}
            aria-label="Saring berdasarkan departemen"
          >
            <option value="">Semua departemen</option>
            {(departemen.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.nama}
              </option>
            ))}
          </select>

          {pencarian && <span className="status biru">Pencarian: “{pencarian}”</span>}

          <button type="button" className="btn kecil dorong" onClick={muatUlang}>
            <Icon name="segarkan" size={15} />
            Segarkan
          </button>
        </div>

        <Muatan
          data={data}
          memuat={memuat}
          galat={galat}
          onCobaLagi={muatUlang}
          barisRangka={6}
        >
          {(hasil) =>
            hasil.data.length === 0 ? (
              <Kosong
                ikon="users"
                judul="Tidak ada pegawai"
                pesan="Tidak ada data yang cocok dengan penyaring saat ini."
              />
            ) : (
              <>
                <div className="pembungkus-tabel">
                  <table className="tabel">
                    <thead>
                      <tr>
                        <th>Nama &amp; NIP</th>
                        <th>Departemen</th>
                        <th>Jabatan</th>
                        <th>Atasan langsung</th>
                        <th>Akun &amp; peran</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasil.data.map((karyawan) => (
                        <tr key={karyawan.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span className="avatar" style={{ width: 31, height: 31 }}>
                                {inisial(karyawan.nama_lengkap)}
                              </span>
                              <span>
                                <div className="sel-utama">{karyawan.nama_lengkap}</div>
                                <div className="sel-sekunder angka">{karyawan.nip}</div>
                              </span>
                            </div>
                          </td>
                          <td>{karyawan.departemen?.nama ?? '—'}</td>
                          <td>
                            <div className="sel-utama">{karyawan.jabatan?.nama ?? '—'}</div>
                            <div className="sel-sekunder">
                              Level {karyawan.jabatan?.level_jabatan ?? '—'}
                            </div>
                          </td>
                          <td className="sel-sekunder">
                            {karyawan.atasan?.nama_lengkap ?? '—'}
                          </td>
                          <td>
                            <div className="sel-utama angka">
                              {karyawan.akun?.username ?? 'Tanpa akun'}
                            </div>
                            <div className="daftar-peran">
                              {(karyawan.akun?.peran ?? []).map((p) => (
                                <span key={p.id} className="status biru">
                                  {p.nama}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <StatusBadge
                              label={manusiawi(karyawan.status_karyawan)}
                              warna={WARNA_STATUS[karyawan.status_karyawan]}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="paginasi">
                  <span>
                    Menampilkan {hasil.data.length} dari {hasil.halaman.total_data} pegawai ·
                    halaman {hasil.halaman.halaman_saat_ini} / {hasil.halaman.total_halaman}
                  </span>
                  <div className="tombol-halaman">
                    <button
                      type="button"
                      className="btn kecil"
                      disabled={halaman <= 1}
                      onClick={() => setHalaman((n) => n - 1)}
                    >
                      Sebelumnya
                    </button>
                    <button
                      type="button"
                      className="btn kecil"
                      disabled={halaman >= hasil.halaman.total_halaman}
                      onClick={() => setHalaman((n) => n + 1)}
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              </>
            )
          }
        </Muatan>
      </section>
    </>
  )
}
