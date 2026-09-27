import { useState } from 'react'

import { apiPengaturan, apiUbahPengaturan } from '@/api/endpoint'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Muatan } from '@/components/ui/Keadaan'
import { PageHeader } from '@/components/ui/PageHeader'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { useAuth } from '@/auth/useAuth'
import { usePermintaan } from '@/hooks/usePermintaan'
import { inisial, manusiawi, waktu } from '@/utils/format'
import type { PengaturanSistem } from '@/api/tipe'

interface SettingsPageProps {
  onSukses: (pesan: string) => void
  onGalat: (penyebab: unknown) => void
}

/** Nama kelompok pengaturan dalam bahasa yang lebih ramah. */
const NAMA_KELOMPOK: Record<string, string> = {
  penomoran: 'Penomoran Dokumen',
  unggahan: 'Unggahan Berkas',
  pelaporan: 'Pelaporan',
  keuangan: 'Keuangan',
  anggaran: 'Anggaran',
  notifikasi: 'Notifikasi',
  persetujuan: 'Persetujuan',
}

/**
 * Halaman pengaturan.
 *
 * Profil pengguna tampil untuk semua orang; daftar pengaturan sistem hanya
 * bagi pemegang hak `pengaturan.kelola`, karena nilainya langsung mengubah
 * perilaku aturan bisnis di backend.
 */
export function SettingsPage({ onSukses, onGalat }: SettingsPageProps) {
  const { profil, boleh } = useAuth()
  const bolehKelola = boleh('pengaturan.kelola')

  const { data, memuat, galat, muatUlang } = usePermintaan(
    () => (bolehKelola ? apiPengaturan() : Promise.resolve([] as PengaturanSistem[])),
    [bolehKelola],
  )

  const [draf, setDraf] = useState<Record<string, string>>({})
  const [sedangSimpan, setSedangSimpan] = useState<string | null>(null)

  const simpan = async (kunci: string) => {
    const nilai = draf[kunci]
    if (nilai === undefined) return

    setSedangSimpan(kunci)
    try {
      const { pesan } = await apiUbahPengaturan(kunci, nilai)
      onSukses(pesan)
      setDraf((sebelumnya) => {
        const salinan = { ...sebelumnya }
        delete salinan[kunci]
        return salinan
      })
      muatUlang()
    } catch (penyebab: unknown) {
      onGalat(penyebab)
    } finally {
      setSedangSimpan(null)
    }
  }

  // Pengaturan dikelompokkan agar tidak tampil sebagai satu daftar panjang.
  const perKelompok = (data ?? []).reduce<Record<string, PengaturanSistem[]>>((peta, baris) => {
    ;(peta[baris.kelompok] ??= []).push(baris)
    return peta
  }, {})

  const nama = profil?.karyawan?.nama_lengkap ?? profil?.username ?? ''

  return (
    <>
      <PageHeader
        eyebrow="Sistem"
        title="Pengaturan"
        description="Profil akun Anda dan, bagi Super Admin, parameter yang mengatur perilaku sistem."
      />

      <div className="grid-dua">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {bolehKelola ? (
            <Muatan
              data={data}
              memuat={memuat}
              galat={galat}
              onCobaLagi={muatUlang}
              barisRangka={6}
            >
              {(daftar) =>
                daftar.length === 0 ? (
                  <section className="panel">
                    <Kosong
                      ikon="settings"
                      judul="Belum ada pengaturan"
                      pesan="Tabel pengaturan sistem masih kosong."
                    />
                  </section>
                ) : (
                  <>
                    {Object.entries(perKelompok).map(([kelompok, baris]) => (
                      <section className="panel" key={kelompok}>
                        <PanelHeader
                          title={NAMA_KELOMPOK[kelompok] ?? manusiawi(kelompok)}
                          subtitle={`${baris.length} parameter`}
                        />
                        <div>
                          {baris.map((p) => {
                            const nilaiTampil = draf[p.kunci] ?? p.nilai
                            const berubah = draf[p.kunci] !== undefined

                            return (
                              <div className="baris-pengaturan" key={p.kunci}>
                                <div className="keterangan">
                                  <b>{p.deskripsi ?? p.kunci}</b>
                                  <small>
                                    {p.kunci} · {p.tipe_nilai.toLowerCase()}
                                  </small>
                                </div>

                                <div className="kendali">
                                  {p.tipe_nilai === 'BOOLEAN' ? (
                                    <select
                                      value={nilaiTampil}
                                      onChange={(e) =>
                                        setDraf((d) => ({ ...d, [p.kunci]: e.target.value }))
                                      }
                                    >
                                      <option value="true">Aktif</option>
                                      <option value="false">Nonaktif</option>
                                    </select>
                                  ) : (
                                    <input
                                      type={p.tipe_nilai === 'ANGKA' ? 'number' : 'text'}
                                      value={nilaiTampil}
                                      onChange={(e) =>
                                        setDraf((d) => ({ ...d, [p.kunci]: e.target.value }))
                                      }
                                    />
                                  )}

                                  <button
                                    type="button"
                                    className="btn kecil utama"
                                    disabled={!berubah || sedangSimpan === p.kunci}
                                    onClick={() => simpan(p.kunci)}
                                  >
                                    {sedangSimpan === p.kunci ? '...' : 'Simpan'}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </section>
                    ))}
                  </>
                )
              }
            </Muatan>
          ) : (
            <section className="panel">
              <PanelHeader
                title="Pengaturan Sistem"
                subtitle="Parameter yang mengatur perilaku aplikasi"
              />
              <Kosong
                ikon="kunci"
                judul="Akses terbatas"
                pesan="Hanya Super Admin yang dapat mengubah pengaturan sistem. Hubungi administrator bila ada parameter yang perlu disesuaikan."
              />
            </section>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="panel">
            <PanelHeader title="Profil Akun" subtitle="Identitas Anda pada sistem" />
            <div className="kartu-profil">
              <div className="avatar-besar">{inisial(nama)}</div>
              <div>
                <h3>{nama}</h3>
                <p>{profil?.karyawan?.email ?? '—'}</p>
                <div className="daftar-peran">
                  {(profil?.peran ?? []).map((p) => (
                    <span key={p.kode} className="status biru">
                      {p.nama}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="panel-body" style={{ borderTop: '1px solid var(--garis)', display: 'grid', gap: 9 }}>
              <div className="pasangan">
                <span>Username</span>
                <b className="angka">{profil?.username}</b>
              </div>
              <div className="pasangan">
                <span>NIP</span>
                <b className="angka">{profil?.karyawan?.nip ?? '—'}</b>
              </div>
              <div className="pasangan">
                <span>Status akun</span>
                <b>{manusiawi(profil?.status_akun)}</b>
              </div>
              <div className="pasangan">
                <span>Terakhir masuk</span>
                <b>{waktu(profil?.terakhir_masuk)}</b>
              </div>
            </div>
          </section>

          <section className="panel">
            <PanelHeader
              title="Hak Akses"
              subtitle={`${profil?.hak_akses.length ?? 0} hak akses aktif`}
            />
            <div className="panel-body">
              <div className="daftar-peran">
                {(profil?.hak_akses ?? []).map((kode) => (
                  <span key={kode} className="status netral">
                    {kode}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--redup)', marginTop: 11 }}>
                <Icon name="kunci" size={12} /> Hak akses ditentukan oleh peran Anda dan
                hanya dapat diubah Super Admin.
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
