import { useState } from 'react'
import type { FormEvent } from 'react'

import { apiBuatPengguna, apiDaftarPengguna, apiHapusPengguna, apiOpsiPengguna, apiUbahPengguna } from '@/api/endpoint'
import type { FormulirPengguna } from '@/api/endpoint'
import type { Pengguna, Peran } from '@/api/tipe'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Memuat, Muatan } from '@/components/ui/Keadaan'
import { KotakGalat, Modal, PesanKolom } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Paginasi } from '@/components/ui/Paginasi'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LABEL_PERAN, opsiDari } from '@/constants/label'
import { useAuth } from '@/auth/useAuth'
import { useHalaman } from '@/hooks/useHalaman'
import { useKirim } from '@/hooks/useKirim'
import { usePermintaan } from '@/hooks/usePermintaan'
import { inisial, waktu } from '@/utils/format'

interface PenggunaPageProps {
  pencarian: string
  onSukses: (pesan: string) => void
  penandaSegar: number
}

export function PenggunaPage({ pencarian, onSukses, penandaSegar }: PenggunaPageProps) {
  const { pengguna: saya } = useAuth()
  const [peran, setPeran] = useState<Peran | ''>('')
  const [status, setStatus] = useState<'active' | 'inactive' | ''>('')
  const [halaman, setHalaman] = useHalaman(peran, status, pencarian)
  const [diubah, setDiubah] = useState<Pengguna | 'baru' | null>(null)
  const [dihapus, setDihapus] = useState<Pengguna | null>(null)

  const { data, memuat, galat, muatUlang } = usePermintaan(
    () => apiDaftarPengguna({ search: pencarian, role: peran, status, page: halaman }),
    [pencarian, peran, status, halaman, penandaSegar],
  )

  const selesai = (pesan: string) => {
    setDiubah(null)
    setDihapus(null)
    onSukses(pesan)
  }

  return (
    <>
      <PageHeader
        eyebrow="Super Admin"
        title="Pengguna"
        description="Akun seluruh pegawai, atasan, dan tim keuangan. Setiap pegawai wajib memiliki atasan agar dapat mengajukan perjalanan."
        action={
          <button type="button" className="btn utama" onClick={() => setDiubah('baru')}>
            <Icon name="plus" size={17} />
            Tambah Pengguna
          </button>
        }
      />

      <section className="panel">
        <div className="bilah-alat">
          <select value={peran} onChange={(e) => setPeran(e.target.value as Peran | '')} aria-label="Peran">
            <option value="">Semua peran</option>
            {opsiDari(LABEL_PERAN).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'inactive' | '')} aria-label="Status">
            <option value="">Semua status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
          {pencarian && <span className="status biru">Pencarian: “{pencarian}”</span>}
          <button type="button" className="btn kecil dorong" onClick={muatUlang}>
            <Icon name="segarkan" size={15} />
            Segarkan
          </button>
        </div>

        <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={6}>
          {(hasil) =>
            hasil.data.length === 0 ? (
              <Kosong ikon="users" judul="Tidak ada pengguna" pesan="Tidak ada pengguna yang cocok dengan penyaring." />
            ) : (
              <>
                <div className="pembungkus-tabel">
                  <table className="tabel">
                    <thead>
                      <tr>
                        <th>Nama</th>
                        <th>Peran</th>
                        <th>Departemen &amp; atasan</th>
                        <th>Status</th>
                        <th>Terakhir masuk</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {hasil.data.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                                {inisial(u.name)}
                              </div>
                              <div>
                                <div className="sel-utama">{u.name}</div>
                                <div className="sel-sekunder">
                                  {u.email}
                                  {u.employee_number ? ` · ${u.employee_number}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="sel-utama">{LABEL_PERAN[u.role]}</div>
                            <div className="sel-sekunder">{u.position ?? '—'}</div>
                          </td>
                          <td>
                            <div className="sel-utama">{u.department?.name ?? '—'}</div>
                            <div className="sel-sekunder">{u.supervisor ? `Atasan: ${u.supervisor.name}` : ''}</div>
                          </td>
                          <td>
                            <StatusBadge label={u.is_active ? 'Aktif' : 'Nonaktif'} warna={u.is_active ? 'hijau' : 'netral'} />
                          </td>
                          <td className="sel-sekunder">{waktu(u.last_login_at)}</td>
                          <td className="kanan" style={{ whiteSpace: 'nowrap' }}>
                            <button type="button" className="btn kecil" onClick={() => setDiubah(u)}>
                              Ubah
                            </button>{' '}
                            {u.id !== saya?.id && (
                              <button type="button" className="btn kecil bahaya" onClick={() => setDihapus(u)}>
                                Hapus
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Paginasi meta={hasil.meta} satuan="pengguna" onPindah={setHalaman} />
              </>
            )
          }
        </Muatan>
      </section>

      {diubah && (
        <ModalPengguna pengguna={diubah === 'baru' ? undefined : diubah} onTutup={() => setDiubah(null)} onSelesai={selesai} />
      )}

      {dihapus && <ModalHapus pengguna={dihapus} onTutup={() => setDihapus(null)} onSelesai={selesai} />}
    </>
  )
}

function ModalHapus({ pengguna, onTutup, onSelesai }: { pengguna: Pengguna; onTutup: () => void; onSelesai: (pesan: string) => void }) {
  const { mengirim, galat, jalankan } = useKirim()

  const hapus = async () => {
    const hasil = await jalankan(() => apiHapusPengguna(pengguna.id))
    if (hasil) onSelesai(hasil.message)
  }

  return (
    <Modal
      judul="Hapus pengguna"
      keterangan="Akun dinonaktifkan dan seluruh sesinya dicabut. Riwayat pengajuan tetap tersimpan."
      ukuran="sempit"
      onTutup={onTutup}
      kaki={
        <>
          <button type="button" className="btn" onClick={onTutup} disabled={mengirim}>
            Batal
          </button>
          <button type="button" className="btn bahaya" onClick={hapus} disabled={mengirim}>
            {mengirim ? 'Menghapus...' : 'Hapus'}
          </button>
        </>
      }
    >
      <KotakGalat pesan={galat} />
      <div className="kotak-info">
        <strong>{pengguna.name}</strong>
        {pengguna.email} · {LABEL_PERAN[pengguna.role]}
      </div>
    </Modal>
  )
}

const kosongJadiNull = (teks: string) => (teks.trim() === '' ? null : teks.trim())

function ModalPengguna({
  pengguna,
  onTutup,
  onSelesai,
}: {
  pengguna?: Pengguna
  onTutup: () => void
  onSelesai: (pesan: string) => void
}) {
  const opsi = usePermintaan(() => apiOpsiPengguna(), [])
  const { mengirim, galat, galatKolom, jalankan } = useKirim()
  const modeUbah = pengguna !== undefined

  const [isian, setIsian] = useState({
    name: pengguna?.name ?? '',
    email: pengguna?.email ?? '',
    password: '',
    role: pengguna?.role ?? ('employee' as Peran),
    employee_number: pengguna?.employee_number ?? '',
    position: pengguna?.position ?? '',
    phone: pengguna?.phone ?? '',
    department_id: pengguna?.department_id ? String(pengguna.department_id) : '',
    supervisor_id: pengguna?.supervisor_id ? String(pengguna.supervisor_id) : '',
    bank_name: pengguna?.bank_name ?? '',
    bank_account_number: pengguna?.bank_account_number ?? '',
    bank_account_name: pengguna?.bank_account_name ?? '',
    is_active: pengguna?.is_active ?? true,
  })

  const ubah = <K extends keyof typeof isian>(kunci: K, nilai: (typeof isian)[K]) =>
    setIsian((sebelum) => ({ ...sebelum, [kunci]: nilai }))

  const atasanTersedia = (opsi.data?.supervisors ?? []).filter(
    (s) =>
      s.id !== pengguna?.id &&
      (!isian.department_id ||
        s.department_id === Number(isian.department_id) ||
        String(s.id) === isian.supervisor_id),
  )

  const kirim = async (peristiwa: FormEvent) => {
    peristiwa.preventDefault()
    const isi: FormulirPengguna = {
      name: isian.name.trim(),
      email: isian.email.trim(),
      role: isian.role,
      employee_number: kosongJadiNull(isian.employee_number),
      position: kosongJadiNull(isian.position),
      phone: kosongJadiNull(isian.phone),
      department_id: isian.department_id ? Number(isian.department_id) : null,
      supervisor_id: isian.role === 'employee' && isian.supervisor_id ? Number(isian.supervisor_id) : null,
      bank_name: kosongJadiNull(isian.bank_name),
      bank_account_number: kosongJadiNull(isian.bank_account_number),
      bank_account_name: kosongJadiNull(isian.bank_account_name),
      is_active: isian.is_active,
    }
    if (isian.password) isi.password = isian.password

    const hasil = await jalankan(() => (modeUbah ? apiUbahPengguna(pengguna.id, isi) : apiBuatPengguna(isi)))
    if (hasil) onSelesai(hasil.message)
  }

  return (
    <Modal
      judul={modeUbah ? `Ubah ${pengguna.name}` : 'Tambah pengguna'}
      keterangan={modeUbah ? 'Kosongkan kata sandi bila tidak ingin mengubahnya.' : 'Kata sandi minimal 8 karakter.'}
      ukuran="lebar"
      onTutup={onTutup}
      onKirim={kirim}
      kaki={
        <>
          <button type="button" className="btn" onClick={onTutup} disabled={mengirim}>
            Batal
          </button>
          <button type="submit" className="btn utama" disabled={mengirim || opsi.memuat}>
            {mengirim ? 'Menyimpan...' : 'Simpan'}
          </button>
        </>
      }
    >
      <KotakGalat pesan={galat} />
      {opsi.memuat && !opsi.data ? (
        <Memuat baris={6} />
      ) : (
        <>
          <div className="baris-bidang">
            <div className="bidang">
              <label htmlFor="nama">
                Nama lengkap<span className="wajib">*</span>
              </label>
              <input id="nama" value={isian.name} maxLength={120} onChange={(e) => ubah('name', e.target.value)} required />
              <PesanKolom pesan={galatKolom.name} />
            </div>
            <div className="bidang">
              <label htmlFor="email-pengguna">
                Email<span className="wajib">*</span>
              </label>
              <input
                id="email-pengguna"
                type="email"
                value={isian.email}
                onChange={(e) => ubah('email', e.target.value)}
                required
              />
              <PesanKolom pesan={galatKolom.email} />
            </div>
            <div className="bidang">
              <label htmlFor="sandi-pengguna">
                Kata sandi{!modeUbah && <span className="wajib">*</span>}
              </label>
              <input
                id="sandi-pengguna"
                type="password"
                autoComplete="new-password"
                value={isian.password}
                onChange={(e) => ubah('password', e.target.value)}
                required={!modeUbah}
              />
              <PesanKolom pesan={galatKolom.password} />
            </div>
          </div>

          <div className="baris-bidang">
            <div className="bidang">
              <label htmlFor="peran">
                Peran<span className="wajib">*</span>
              </label>
              <select id="peran" value={isian.role} onChange={(e) => ubah('role', e.target.value as Peran)}>
                {opsiDari(LABEL_PERAN).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <PesanKolom pesan={galatKolom.role} />
            </div>
            <div className="bidang">
              <label htmlFor="departemen-pengguna">
                Departemen{isian.role !== 'super_admin' && <span className="wajib">*</span>}
              </label>
              <select
                id="departemen-pengguna"
                value={isian.department_id}
                onChange={(e) => ubah('department_id', e.target.value)}
              >
                <option value="">— Tidak ada —</option>
                {(opsi.data?.departments ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <PesanKolom pesan={galatKolom.department_id} />
            </div>
            {isian.role === 'employee' && (
              <div className="bidang">
                <label htmlFor="atasan">
                  Atasan<span className="wajib">*</span>
                </label>
                <select id="atasan" value={isian.supervisor_id} onChange={(e) => ubah('supervisor_id', e.target.value)}>
                  <option value="">— Pilih —</option>
                  {atasanTersedia.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <PesanKolom pesan={galatKolom.supervisor_id} />
              </div>
            )}
          </div>

          <div className="baris-bidang">
            <div className="bidang">
              <label htmlFor="nip">Nomor pegawai</label>
              <input
                id="nip"
                value={isian.employee_number}
                maxLength={30}
                onChange={(e) => ubah('employee_number', e.target.value)}
              />
              <PesanKolom pesan={galatKolom.employee_number} />
            </div>
            <div className="bidang">
              <label htmlFor="jabatan">Jabatan</label>
              <input id="jabatan" value={isian.position} maxLength={100} onChange={(e) => ubah('position', e.target.value)} />
            </div>
            <div className="bidang">
              <label htmlFor="telepon">Telepon</label>
              <input id="telepon" value={isian.phone} maxLength={20} onChange={(e) => ubah('phone', e.target.value)} />
            </div>
          </div>

          <div className="baris-bidang">
            <div className="bidang">
              <label htmlFor="bank">Bank</label>
              <input id="bank" value={isian.bank_name} maxLength={50} onChange={(e) => ubah('bank_name', e.target.value)} />
            </div>
            <div className="bidang">
              <label htmlFor="rekening">Nomor rekening</label>
              <input
                id="rekening"
                value={isian.bank_account_number}
                maxLength={40}
                onChange={(e) => ubah('bank_account_number', e.target.value)}
              />
            </div>
            <div className="bidang">
              <label htmlFor="pemilik-rekening">Atas nama</label>
              <input
                id="pemilik-rekening"
                value={isian.bank_account_name}
                maxLength={120}
                onChange={(e) => ubah('bank_account_name', e.target.value)}
              />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={isian.is_active} onChange={(e) => ubah('is_active', e.target.checked)} />
            Akun aktif (pengguna nonaktif tidak dapat masuk)
          </label>
        </>
      )}
    </Modal>
  )
}
