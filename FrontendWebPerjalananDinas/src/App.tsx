import { useMemo, useState } from 'react'

import { Toast } from '@/components/feedback/Toast'
import { DEFAULT_PAGE } from '@/constants/navigation'
import { INITIAL_TRIPS } from '@/data/trips'
import { ApprovalsPage } from '@/features/approvals/ApprovalsPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { EmployeesPage } from '@/features/employees/EmployeesPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { SubmissionPage } from '@/features/submissions/SubmissionPage'
import { TripsPage } from '@/features/trips/TripsPage'
import { TripFormModal } from '@/features/trips/components/TripFormModal'
import { createTripFromForm, filterTrips } from '@/features/trips/tripService'
import { useToast } from '@/hooks/useToast'
import { AppLayout } from '@/layouts/AppLayout'
import type { PageKey } from '@/types/navigation'
import type { Trip, TripFormValues } from '@/types/trip'

/**
 * Akar aplikasi: menyimpan state bersama (halaman aktif, data perjalanan,
 * pencarian, modal, toast) lalu merender halaman sesuai menu yang dipilih.
 */
export default function App() {
  const [activePage, setActivePage] = useState<PageKey>(DEFAULT_PAGE)
  const [trips, setTrips] = useState<Trip[]>(INITIAL_TRIPS)
  const [searchQuery, setSearchQuery] = useState('')
  const [isTripFormOpen, setTripFormOpen] = useState(false)
  const { message: toastMessage, notify } = useToast()

  const filteredTrips = useMemo(
    () => filterTrips(trips, searchQuery),
    [trips, searchQuery],
  )

  const openTripForm = () => setTripFormOpen(true)
  const closeTripForm = () => setTripFormOpen(false)

  const handleCreateTrip = (values: TripFormValues) => {
    const trip = createTripFromForm(values, trips.length)
    setTrips((previous) => [trip, ...previous])
    closeTripForm()
    notify(`Pengajuan ${trip.id} berhasil dibuat`)
    setActivePage('Perjalanan Saya')
  }

  const renderPage = () => {
    switch (activePage) {
      case 'Dashboard':
        return (
          <DashboardPage
            trips={trips}
            onCreateTrip={openTripForm}
            onNavigate={setActivePage}
          />
        )
      case 'Pengajuan Dinas':
        return <SubmissionPage trips={trips} onCreateTrip={openTripForm} />
      case 'Perjalanan Saya':
        return (
          <TripsPage
            trips={filteredTrips}
            onCreateTrip={openTripForm}
            onNotify={notify}
          />
        )
      case 'Persetujuan':
        return <ApprovalsPage trips={trips} onNotify={notify} />
      case 'Laporan':
        return <ReportsPage onNotify={notify} />
      case 'Pegawai':
        return <EmployeesPage />
      case 'Pengaturan':
        return <SettingsPage onNotify={notify} />
    }
  }

  return (
    <AppLayout
      activePage={activePage}
      onNavigate={setActivePage}
      onSignOut={() => notify('Sesi keluar simulasi.')}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      overlays={
        <>
          {isTripFormOpen && (
            <TripFormModal onClose={closeTripForm} onSubmit={handleCreateTrip} />
          )}
          {toastMessage && <Toast message={toastMessage} />}
        </>
      }
    >
      {renderPage()}
    </AppLayout>
  )
}
