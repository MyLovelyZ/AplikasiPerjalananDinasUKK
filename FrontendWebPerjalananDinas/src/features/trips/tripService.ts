import type { Trip, TripFormValues, TripStatus } from '@/types/trip'

/** Awalan nomor pengajuan; nantinya nomor dibuat oleh backend. */
const TRIP_ID_PREFIX = 'PD-2026-'
const TRIP_ID_OFFSET = 19
const TRIP_ID_LENGTH = 3

/** Nilai awal form pengajuan perjalanan dinas. */
export const EMPTY_TRIP_FORM: TripFormValues = {
  tujuan: '',
  kegiatan: '',
  mulai: '',
  selesai: '',
  transportasi: 'Pesawat',
  catatan: '',
}

/** Pilihan moda transportasi pada form pengajuan. */
export const TRANSPORT_OPTIONS = [
  'Pesawat',
  'Kereta Api',
  'Kendaraan Dinas',
  'Kendaraan Pribadi',
]

/** Membentuk nomor pengajuan berikutnya dari jumlah perjalanan yang ada. */
export function buildTripId(existingCount: number): string {
  return `${TRIP_ID_PREFIX}${String(existingCount + TRIP_ID_OFFSET).padStart(TRIP_ID_LENGTH, '0')}`
}

/** Mengubah isian form menjadi entri perjalanan berstatus `Menunggu`. */
export function createTripFromForm(values: TripFormValues, existingCount: number): Trip {
  return {
    id: buildTripId(existingCount),
    name: 'Anda',
    tujuan: values.tujuan,
    kegiatan: values.kegiatan,
    tanggal: `${values.mulai || '—'} – ${values.selesai || '—'}`,
    status: 'Menunggu',
    biaya: '—',
  }
}

/** Pencarian bebas pada seluruh kolom perjalanan, tidak peka huruf besar/kecil. */
export function filterTrips(trips: Trip[], query: string): Trip[] {
  const keyword = query.toLowerCase()
  return trips.filter((trip) =>
    Object.values(trip).join(' ').toLowerCase().includes(keyword),
  )
}

/** Menghitung jumlah perjalanan pada satu status tertentu. */
export function countTripsByStatus(trips: Trip[], status: TripStatus): number {
  return trips.filter((trip) => trip.status === status).length
}
