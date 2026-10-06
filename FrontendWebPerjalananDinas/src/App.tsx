import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router'

import type { Peran } from '@/api/tipe'
import { useAuth } from '@/auth/useAuth'
import { Memuat } from '@/components/ui/Keadaan'
import { BERANDA_PERAN, tujuanSetelahMasuk } from '@/constants/navigation'
import { AuditLogPage } from '@/features/admin/AuditLogPage'
import { DepartemenPage } from '@/features/admin/DepartemenPage'
import { HalamanFormPengguna, PenggunaPage } from '@/features/admin/PenggunaPage'
import { ApprovalsPage } from '@/features/approvals/ApprovalsPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { HalamanGalat } from '@/features/errors/HalamanGalat'
import { AnggaranPage } from '@/features/finance/AnggaranPage'
import { LaporanKeuanganPage } from '@/features/finance/LaporanKeuanganPage'
import { PencairanPage } from '@/features/finance/PencairanPage'
import { VerifikasiPage } from '@/features/finance/VerifikasiPage'
import { ProfilPage } from '@/features/profile/ProfilPage'
import {
  HalamanDetailPerjalanan,
  HalamanFormPerjalanan,
  HalamanLaporanBiaya,
} from '@/features/trips/HalamanPerjalanan'
import { TripsPage } from '@/features/trips/TripsPage'
import { AppLayout } from '@/layouts/AppLayout'

/**
 * Peta rute mengikuti endpointAPI.md: setiap peran punya awalan URL yang sama
 * dengan prefiks API-nya (`/employee`, `/supervisor`, `/finance`, `/admin`).
 */
export default function App() {
  const { memuat } = useAuth()

  if (memuat) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div style={{ width: 260 }}>
          <Memuat baris={3} />
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<RuteMasuk />} />

      <Route element={<WajibMasuk />}>
        <Route index element={<KeBeranda />} />
        <Route path="profile" element={<ProfilPage />} />

        <Route path="employee" element={<KhususPeran peran="employee" />}>
          <Route index element={<DashboardPage />} />
          <Route path="requests" element={<TripsPage />} />
          <Route path="requests/new" element={<HalamanFormPerjalanan />} />
          <Route path="requests/:id" element={<HalamanDetailPerjalanan sudut="employee" />} />
          <Route path="requests/:id/edit" element={<HalamanFormPerjalanan />} />
          <Route path="requests/:id/expenses" element={<HalamanLaporanBiaya />} />
        </Route>

        <Route path="supervisor" element={<KhususPeran peran="supervisor" />}>
          <Route index element={<DashboardPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="approvals/:id" element={<HalamanDetailPerjalanan sudut="supervisor" />} />
        </Route>

        <Route path="finance" element={<KhususPeran peran="finance" />}>
          <Route index element={<DashboardPage />} />
          <Route path="approvals" element={<VerifikasiPage />} />
          <Route path="approvals/:id" element={<HalamanDetailPerjalanan sudut="finance" />} />
          <Route path="budgets" element={<AnggaranPage />} />
          <Route path="disbursements" element={<PencairanPage />} />
          <Route path="reports" element={<LaporanKeuanganPage />} />
        </Route>

        <Route path="admin" element={<KhususPeran peran="super_admin" />}>
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<PenggunaPage />} />
          <Route path="users/new" element={<HalamanFormPengguna />} />
          <Route path="users/:id/edit" element={<HalamanFormPengguna />} />
          <Route path="departments" element={<DepartemenPage />} />
          <Route path="audit-logs" element={<AuditLogPage />} />
        </Route>

        <Route path="*" element={<HalamanGalat kode={404} />} />
      </Route>
    </Routes>
  )
}

function RuteMasuk() {
  const { pengguna } = useAuth()
  const { state } = useLocation()

  if (!pengguna) return <LoginPage />
  const asal = (state as { dari?: string } | null)?.dari
  return <Navigate to={tujuanSetelahMasuk(pengguna.role, asal)} replace />
}

/** Belum login → ke /login sambil mengingat URL tujuan. */
function WajibMasuk() {
  const { pengguna } = useAuth()
  const { pathname, search } = useLocation()

  if (!pengguna) return <Navigate to="/login" replace state={{ dari: `${pathname}${search}` }} />
  return <AppLayout />
}

function KeBeranda() {
  const { pengguna } = useAuth()
  return pengguna ? <Navigate to={BERANDA_PERAN[pengguna.role]} replace /> : null
}

/** Wilayah URL milik satu peran; peran lain mendapat halaman 403. */
function KhususPeran({ peran }: { peran: Peran }) {
  const { berperan } = useAuth()
  return berperan(peran) ? <Outlet /> : <HalamanGalat kode={403} />
}
