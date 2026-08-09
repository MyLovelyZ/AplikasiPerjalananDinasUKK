import { PageHeader } from '@/components/ui/PageHeader'

const LANGUAGE_OPTIONS = ['Bahasa Indonesia', 'English']

interface SettingsPageProps {
  onNotify: (message: string) => void
}

/** Preferensi portal: notifikasi, pengingat, dan bahasa antarmuka. */
export function SettingsPage({ onNotify }: SettingsPageProps) {
  return (
    <>
      <PageHeader
        eyebrow="Konfigurasi"
        title="Pengaturan"
        description="Kelola profil dan preferensi portal."
      />
      <section className="panel settings">
        <div className="setting-row">
          <div>
            <b>Notifikasi Email</b>
            <span>Kirim pemberitahuan saat status pengajuan berubah.</span>
          </div>
          <label className="switch">
            <input type="checkbox" defaultChecked aria-label="Notifikasi email" />
            <i></i>
          </label>
        </div>

        <div className="setting-row">
          <div>
            <b>Pengingat Persetujuan</b>
            <span>Pengingat otomatis untuk pengajuan yang belum diproses.</span>
          </div>
          <label className="switch">
            <input type="checkbox" defaultChecked aria-label="Pengingat persetujuan" />
            <i></i>
          </label>
        </div>

        <div className="setting-row">
          <div>
            <b>Bahasa Portal</b>
            <span>Bahasa yang digunakan pada antarmuka.</span>
          </div>
          <select aria-label="Bahasa portal">
            {LANGUAGE_OPTIONS.map((language) => (
              <option key={language}>{language}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="primary"
          onClick={() => onNotify('Pengaturan disimpan')}
        >
          Simpan Perubahan
        </button>
      </section>
    </>
  )
}
