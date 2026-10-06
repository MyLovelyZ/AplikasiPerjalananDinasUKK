import { useCallback, useState } from 'react'

import { apiAntreanAtasan, apiAntreanKeuangan } from '@/api/endpoint'
import type { Perjalanan } from '@/api/tipe'
import { useAuth } from '@/auth/useAuth'
import { Toast } from '@/components/feedback/Toast'
import { Memuat } from '@/components/ui/Keadaan'
import { DEFAULT_PAGE, NAV_ITEMS, PROFILE_PAGE } from '@/constants/navigation'
import { AuditLogPage } from '@/features/admin/AuditLogPage'
import { DepartemenPage } from '@/features/admin/DepartemenPage'
import { PenggunaPage } from '@/features/admin/PenggunaPage'
import { ApprovalsPage } from '@/features/approvals/ApprovalsPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { AnggaranPage } from '@/features/finance/AnggaranPage'
import { LaporanKeuanganPage } from '@/features/finance/LaporanKeuanganPage'
import { PencairanPage } from '@/features/finance/PencairanPage'
import { VerifikasiPage } from '@/features/finance/VerifikasiPage'
import { ProfilPage } from '@/features/profile/ProfilPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { LaporanModal } from '@/features/reports/components/LaporanModal'
import { TripsPage } from '@/features/trips/TripsPage'
import { DetailPerjalananModal } from '@/features/trips/components/DetailPerjalananModal'
import type { SudutPandang } from '@/features/trips/components/DetailPerjalananModal'
import { FormulirPerjalananModal } from '@/features/trips/components/FormulirPerjalananModal'
import { usePermintaan } from '@/hooks/usePermintaan'
import { useToast } from '@/hooks/useToast'
import { AppLayout } from '@/layouts/AppLayout'
import type { PageKey } from '@/types/navigation'

export default function App() {
  const { pengguna, memuat: memuatSesi, keluar } = useAuth()
  const { pesan: pesanToast, tampilkan } = useToast()

  const [halamanAktif, setHalamanAktif] = useState<PageKey>(DEFAULT_PAGE)
  const [pencarian, setPencarian] = useState('')

  const [formPerjalanan, setFormPerjalanan] = useState<{ perjalanan?: Perjalanan } | null>(null)
  const [perjalananDibuka, setPerjalananDibuka] = useState<number | null>(null)
  const [laporanDibuka, setLaporanDibuka] = useState<number | null>(null)

  // Dinaikkan setiap kali ada aksi yang mengubah data, memaksa halaman aktif mengambil ulang.
  const [penandaSegar, setPenandaSegar] = useState(0)

  const peran = pengguna?.role
  const { data: jumlahAntrean } = usePermintaan(async () => {
    if (peran === 'supervisor') return (await apiAntreanAtasan({ status: 'pending', per_page: 1 })).meta.total
    if (peran === 'finance') return (await apiAntreanKeuangan({ per_page: 1 })).meta.total
    return 0
  }, [peran, penandaSegar])

  const sukses = useCallback(
    (teks: string) => {
      tampilkan(teks, 'sukses')
      setPenandaSegar((n) => n + 1)
    },
    [tampilkan],
  )

  if (memuatSesi) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div style={{ width: 260 }}>
          <Memuat baris={3} />
        </div>
      </div>
    )
  }

  if (!pengguna) return <LoginPage />

  // Halaman terakhir bisa milik peran lain bila sesi berganti tanpa memuat ulang.
  const bolehDibuka =
    halamanAktif === PROFILE_PAGE ||
    NAV_ITEMS.some((item) => item.key === halamanAktif && item.peran.includes(pengguna.role))
  const halaman = bolehDibuka ? halamanAktif : DEFAULT_PAGE

  const sudut: SudutPandang | null =
    pengguna.role === 'employee' || pengguna.role === 'supervisor' || pengguna.role === 'finance'
      ? pengguna.role
      : null

  const pindahHalaman = (halaman: PageKey) => {
    setHalamanAktif(halaman)
    setPencarian('')
  }

  const bukaFormBaru = () => setFormPerjalanan({})

  const bukaLaporan = (perjalananId: number) => {
    setPerjalananDibuka(null)
    setLaporanDibuka(perjalananId)
  }

  const setelahSimpan = (perjalanan: Perjalanan, pesan: string) => {
    setFormPerjalanan(null)
    sukses(pesan)
    setPerjalananDibuka(perjalanan.id)
  }

  const renderHalaman = () => {
    switch (halaman) {
      case 'Dashboard':
        return (
          <DashboardPage
            onNavigate={pindahHalaman}
            onBukaPerjalanan={setPerjalananDibuka}
            onBuatPerjalanan={bukaFormBaru}
            onBukaLaporan={bukaLaporan}
            penandaSegar={penandaSegar}
          />
        )
      case 'Perjalanan Saya':
        return (
          <TripsPage
            pencarian={pencarian}
            onBuatPerjalanan={bukaFormBaru}
            onBukaPerjalanan={setPerjalananDibuka}
            penandaSegar={penandaSegar}
          />
        )
      case 'Laporan Biaya':
        return <ReportsPage pencarian={pencarian} onBukaLaporan={bukaLaporan} penandaSegar={penandaSegar} />
      case 'Persetujuan':
        return (
          <ApprovalsPage
            pencarian={pencarian}
            onSukses={sukses}
            onBukaPerjalanan={setPerjalananDibuka}
            penandaSegar={penandaSegar}
          />
        )
      case 'Verifikasi':
        return <VerifikasiPage pencarian={pencarian} onBukaPerjalanan={setPerjalananDibuka} penandaSegar={penandaSegar} />
      case 'Pencairan':
        return (
          <PencairanPage
            pencarian={pencarian}
            onSukses={sukses}
            onBukaPerjalanan={setPerjalananDibuka}
            penandaSegar={penandaSegar}
          />
        )
      case 'Anggaran':
        return <AnggaranPage onSukses={sukses} penandaSegar={penandaSegar} />
      case 'Laporan Keuangan':
        return <LaporanKeuanganPage />
      case 'Pengguna':
        return <PenggunaPage pencarian={pencarian} onSukses={sukses} penandaSegar={penandaSegar} />
      case 'Departemen':
        return <DepartemenPage onSukses={sukses} penandaSegar={penandaSegar} />
      case 'Log Audit':
        return <AuditLogPage pencarian={pencarian} />
      case 'Profil':
        return <ProfilPage onSukses={sukses} />
    }
  }

  return (
    <AppLayout
      activePage={halaman}
      onNavigate={pindahHalaman}
      onSignOut={keluar}
      searchQuery={pencarian}
      onSearchChange={setPencarian}
      jumlahAntrean={jumlahAntrean ?? 0}
      overlays={
        <>
          {formPerjalanan && (
            <FormulirPerjalananModal
              perjalanan={formPerjalanan.perjalanan}
              onTutup={() => setFormPerjalanan(null)}
              onTersimpan={setelahSimpan}
            />
          )}

          {perjalananDibuka !== null && sudut && (
            <DetailPerjalananModal
              perjalananId={perjalananDibuka}
              sudut={sudut}
              onTutup={() => setPerjalananDibuka(null)}
              onBerubah={sukses}
              onUbah={(perjalanan) => {
                setPerjalananDibuka(null)
                setFormPerjalanan({ perjalanan })
              }}
              onBukaLaporan={(perjalanan) => bukaLaporan(perjalanan.id)}
            />
          )}

          {laporanDibuka !== null && (
            <LaporanModal perjalananId={laporanDibuka} onTutup={() => setLaporanDibuka(null)} onBerubah={sukses} />
          )}

          {pesanToast && <Toast pesan={pesanToast} />}
        </>
      }
    >
      {renderHalaman()}
    </AppLayout>
  )
}
