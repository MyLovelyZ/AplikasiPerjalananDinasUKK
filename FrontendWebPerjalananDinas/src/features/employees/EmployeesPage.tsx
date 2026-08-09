import { Icon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { EMPLOYEES } from '@/data/employees'

/** Daftar pegawai yang memakai portal perjalanan dinas. */
export function EmployeesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Manajemen pengguna"
        title="Pegawai"
        description="Daftar pegawai yang menggunakan portal perjalanan dinas."
        action={
          <button type="button" className="primary">
            <Icon name="plus" /> Tambah Pegawai
          </button>
        }
      />
      <div className="people-grid">
        {EMPLOYEES.map(({ name, role, initials }) => (
          <div className="person-card" key={name}>
            <div className="person-avatar">{initials}</div>
            <div>
              <b>{name}</b>
              <span>{role}</span>
              <small>Aktif · 4 perjalanan tahun ini</small>
            </div>
            <button type="button" className="dots" aria-label={`Aksi untuk ${name}`}>
              •••
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
