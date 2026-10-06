import { useState } from 'react'
import type { FormEvent } from 'react'

import { apiBuatDepartemen, apiDaftarDepartemen, apiHapusDepartemen, apiUbahDepartemen } from '@/api/endpoint'
import type { Departemen } from '@/api/tipe'
import { Icon } from '@/components/ui/Icon'
import { Muatan, Kosong } from '@/components/ui/Keadaan'
import { KotakGalat, Modal, PesanKolom } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useKirim } from '@/hooks/useKirim'
import { usePermintaan } from '@/hooks/usePermintaan'

interface DepartemenPageProps {
  onSukses: (pesan: string) => void
  penandaSegar: number
}

export function DepartemenPage({ onSukses, penandaSegar }: DepartemenPageProps) {
  const [diubah, setDiubah] = useState<Departemen | 'baru' | null>(null)
  const hapus = useKirim()
  const { data, memuat, galat, muatUlang } = usePermintaan(() => apiDaftarDepartemen(), [penandaSegar])

  const hapusDepartemen = async (d: Departemen) => {
    const hasil = await hapus.jalankan(() => apiHapusDepartemen(d.id))
    if (hasil) onSukses(hasil.message)
  }

  return (
    <>
      <PageHeader
        eyebrow="Super Admin"
        title="Departemen"
        description="Unit kerja tempat pegawai bernaung dan anggaran dialokasikan. Departemen yang masih dipakai cukup dinonaktifkan."
        action={
          <button type="button" className="btn utama" onClick={() => setDiubah('baru')}>
            <Icon name="plus" size={17} />
            Tambah Departemen
          </button>
        }
      />

      {hapus.galat && (
        <div className="kotak-galat" role="alert" style={{ marginBottom: 16 }}>
          <Icon name="peringatan" size={16} />
          <span>{hapus.galat}</span>
        </div>
      )}

      <section className="panel">
        <Muatan
          data={data}
          memuat={memuat}
          galat={galat}
          onCobaLagi={muatUlang}
          kosong={<Kosong ikon="gedung" judul="Belum ada departemen" pesan="Tambahkan departemen pertama." />}
        >
          {(daftar) => (
            <div className="pembungkus-tabel">
              <table className="tabel">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama</th>
                    <th className="kanan">Pengguna</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {daftar.map((d) => (
                    <tr key={d.id}>
                      <td className="sel-utama angka">{d.code}</td>
                      <td className="sel-utama">{d.name}</td>
                      <td className="kanan angka">{d.users_count ?? 0}</td>
                      <td>
                        <StatusBadge label={d.is_active ? 'Aktif' : 'Nonaktif'} warna={d.is_active ? 'hijau' : 'netral'} />
                      </td>
                      <td className="kanan" style={{ whiteSpace: 'nowrap' }}>
                        <button type="button" className="btn kecil" onClick={() => setDiubah(d)}>
                          Ubah
                        </button>{' '}
                        <button
                          type="button"
                          className="btn kecil bahaya"
                          disabled={hapus.mengirim}
                          onClick={() => hapusDepartemen(d)}
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Muatan>
      </section>

      {diubah && (
        <ModalDepartemen
          departemen={diubah === 'baru' ? undefined : diubah}
          onTutup={() => setDiubah(null)}
          onSelesai={(pesan) => {
            setDiubah(null)
            onSukses(pesan)
          }}
        />
      )}
    </>
  )
}

function ModalDepartemen({
  departemen,
  onTutup,
  onSelesai,
}: {
  departemen?: Departemen
  onTutup: () => void
  onSelesai: (pesan: string) => void
}) {
  const [kode, setKode] = useState(departemen?.code ?? '')
  const [nama, setNama] = useState(departemen?.name ?? '')
  const [aktif, setAktif] = useState(departemen?.is_active ?? true)
  const { mengirim, galat, galatKolom, jalankan } = useKirim()

  const kirim = async (peristiwa: FormEvent) => {
    peristiwa.preventDefault()
    const isi = { code: kode.trim(), name: nama.trim(), is_active: aktif }
    const hasil = await jalankan(() => (departemen ? apiUbahDepartemen(departemen.id, isi) : apiBuatDepartemen(isi)))
    if (hasil) onSelesai(hasil.message)
  }

  return (
    <Modal
      judul={departemen ? `Ubah ${departemen.name}` : 'Tambah departemen'}
      ukuran="sempit"
      onTutup={onTutup}
      onKirim={kirim}
      kaki={
        <>
          <button type="button" className="btn" onClick={onTutup} disabled={mengirim}>
            Batal
          </button>
          <button type="submit" className="btn utama" disabled={mengirim || !kode.trim() || !nama.trim()}>
            {mengirim ? 'Menyimpan...' : 'Simpan'}
          </button>
        </>
      }
    >
      <KotakGalat pesan={galat} />
      <div className="bidang">
        <label htmlFor="kode-departemen">
          Kode<span className="wajib">*</span>
        </label>
        <input id="kode-departemen" placeholder="mis. IT" maxLength={20} value={kode} onChange={(e) => setKode(e.target.value)} />
        <span className="petunjuk">Huruf, angka, tanda hubung, atau garis bawah.</span>
        <PesanKolom pesan={galatKolom.code} />
      </div>
      <div className="bidang">
        <label htmlFor="nama-departemen">
          Nama<span className="wajib">*</span>
        </label>
        <input id="nama-departemen" maxLength={100} value={nama} onChange={(e) => setNama(e.target.value)} />
        <PesanKolom pesan={galatKolom.name} />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
        <input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} />
        Departemen aktif
      </label>
    </Modal>
  )
}
