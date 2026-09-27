import { useCallback, useState } from 'react'

import { apiAntreanPersetujuan, apiJumlahNotifikasi } from '@/api/endpoint'
import { Toast } from '@/components/feedback/Toast'
import { Memuat } from '@/components/ui/Keadaan'
import { DEFAULT_PAGE } from '@/constants/navigation'
import { useAuth } from '@/auth/useAuth'
import { ApprovalsPage } from '@/features/approvals/ApprovalsPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { EmployeesPage } from '@/features/employees/EmployeesPage'
import { FinancePage } from '@/features/finance/FinancePage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { LaporanModal } from '@/features/reports/components/LaporanModal'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { SubmissionPage } from '@/features/submissions/SubmissionPage'
import { FormulirSppdModal } from '@/features/submissions/components/FormulirSppdModal'
import { TripsPage } from '@/features/trips/TripsPage'
import { DetailSppdModal } from '@/features/trips/components/DetailSppdModal'
import { usePermintaan } from '@/hooks/usePermintaan'
import { useToast } from '@/hooks/useToast'
import { AppLayout } from '@/layouts/AppLayout'
import type { PageKey } from '@/types/navigation'
import type { Sppd } from '@/api/tipe'

/**
 * Akar aplikasi.
 *
 * Menyimpan state yang benar-benar lintas halaman: halaman aktif, kata kunci
 * pencarian, modal yang sedang terbuka, toast, serta dua angka lencana
 * (antrean persetujuan dan notifikasi belum dibaca). Data isi halaman
 * diambil masing-masing halaman lewat usePermintaan, bukan diteruskan
 * dari sini — supaya satu halaman yang lambat tidak menahan yang lain.
 */
export default function App() {
  const { profil, memuat: memuatSesi, keluar, boleh } = useAuth()
  const { pesan: pesanToast, tampilkan, laporkanGalat } = useToast()

  const [halamanAktif, setHalamanAktif] = useState<PageKey>(DEFAULT_PAGE)
  const [pencarian, setPencarian] = useState('')

  const [formTerbuka, setFormTerbuka] = useState(false)
  const [sppdDibuka, setSppdDibuka] = useState<number | null>(null)
  const [laporanDibuka, setLaporanDibuka] = useState<number | null>(null)

  // Dinaikkan setiap kali ada aksi yang mengubah data, memaksa halaman
  // yang sedang tampil mengambil ulang isinya.
  const [penandaSegar, setPenandaSegar] = useState(0)
  const segarkanSemua = useCallback(() => setPenandaSegar((n) => n + 1), [])

  const bolehSetujui = boleh('sppd.setujui')

  /**
   * Dua angka lencana: notifikasi belum dibaca dan antrean persetujuan.
   * Keduanya diambil bersama supaya sidebar dan topbar tidak berkedip
   * bergantian, dan kegagalannya diabaikan — lencana yang tidak muncul
   * tidak boleh menghalangi seluruh aplikasi.
   */
  const lencana = usePermintaan(
    async () => {
      if (!profil) return { notifikasi: 0, antrean: 0 }

      const [notif, antrean] = await Promise.all([
        apiJumlahNotifikasi().catch(() => ({ jumlah: 0 })),
        bolehSetujui ? apiAntreanPersetujuan(1, 1).catch(() => null) : Promise.resolve(null),
      ])

      return { notifikasi: notif.jumlah, antrean: antrean?.halaman.total_data ?? 0 }
    },
    [profil?.id ?? 0, bolehSetujui, penandaSegar],
  )

  const muatLencana = lencana.muatUlang
  const jumlahNotifikasi = lencana.data?.notifikasi ?? 0
  const jumlahAntrean = lencana.data?.antrean ?? 0

  const sukses = useCallback(
    (teks: string) => {
      tampilkan(teks, 'sukses')
      segarkanSemua()
    },
    [tampilkan, segarkanSemua],
  )

  const bukaSppd = (id: number) => setSppdDibuka(id)

  const bukaLaporanDariSppd = (sppd: Sppd) => {
    if (sppd.laporan) {
      setSppdDibuka(null)
      setLaporanDibuka(sppd.laporan.id)
      return
    }
    // SPPD berstatus MENUNGGU_LAPORAN yang belum punya laporan diarahkan
    // ke halaman Laporan, tempat laporan baru dibuat.
    tampilkan('Laporan belum dibuat untuk SPPD ini. Buka halaman Laporan untuk menyusunnya.')
  }

  const setelahBuatSppd = (sppd: Sppd, pesan: string) => {
    setFormTerbuka(false)
    sukses(pesan)
    setHalamanAktif('Perjalanan Saya')
    setSppdDibuka(sppd.id)
  }

  // Sesi dipulihkan lebih dulu: tanpa ini layar login sempat berkedip
  // muncul pada setiap muat ulang halaman meski token masih berlaku.
  if (memuatSesi) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div style={{ width: 260 }}>
          <Memuat baris={3} />
        </div>
      </div>
    )
  }

  if (!profil) return <LoginPage />

  const renderHalaman = () => {
    switch (halamanAktif) {
      case 'Dashboard':
        return (
          <DashboardPage
            onBuatSppd={() => setFormTerbuka(true)}
            onNavigate={setHalamanAktif}
            onBukaSppd={bukaSppd}
          />
        )
      case 'Pengajuan Dinas':
        return (
          <SubmissionPage
            onBuatSppd={() => setFormTerbuka(true)}
            onBukaSppd={bukaSppd}
            penandaSegar={penandaSegar}
          />
        )
      case 'Perjalanan Saya':
        return (
          <TripsPage
            pencarian={pencarian}
            onBuatSppd={() => setFormTerbuka(true)}
            onBukaSppd={bukaSppd}
            penandaSegar={penandaSegar}
          />
        )
      case 'Persetujuan':
        return (
          <ApprovalsPage
            onSukses={sukses}
            onGalat={laporkanGalat}
            onBukaSppd={bukaSppd}
            penandaSegar={penandaSegar}
            onAntreanBerubah={muatLencana}
          />
        )
      case 'Laporan':
        return (
          <ReportsPage onBukaLaporan={setLaporanDibuka} penandaSegar={penandaSegar} />
        )
      case 'Keuangan':
        return (
          <FinancePage onSukses={sukses} onGalat={laporkanGalat} onBukaSppd={bukaSppd} />
        )
      case 'Pegawai':
        return <EmployeesPage pencarian={pencarian} />
      case 'Pengaturan':
        return <SettingsPage onSukses={sukses} onGalat={laporkanGalat} />
    }
  }

  return (
    <AppLayout
      activePage={halamanAktif}
      onNavigate={setHalamanAktif}
      onSignOut={keluar}
      searchQuery={pencarian}
      onSearchChange={setPencarian}
      jumlahAntrean={jumlahAntrean}
      jumlahNotifikasi={jumlahNotifikasi}
      onNotifikasiBerubah={muatLencana}
      overlays={
        <>
          {formTerbuka && (
            <FormulirSppdModal
              onTutup={() => setFormTerbuka(false)}
              onTersimpan={setelahBuatSppd}
            />
          )}

          {sppdDibuka !== null && (
            <DetailSppdModal
              sppdId={sppdDibuka}
              onTutup={() => setSppdDibuka(null)}
              onBerubah={sukses}
              onGalat={laporkanGalat}
              onBukaLaporan={bukaLaporanDariSppd}
            />
          )}

          {laporanDibuka !== null && (
            <LaporanModal
              laporanId={laporanDibuka}
              onTutup={() => setLaporanDibuka(null)}
              onBerubah={sukses}
              onGalat={laporkanGalat}
            />
          )}

          {pesanToast && <Toast pesan={pesanToast} />}
        </>
      }
    >
      {renderHalaman()}
    </AppLayout>
  )
}
