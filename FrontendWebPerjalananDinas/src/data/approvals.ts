import type { Trip } from '@/types/trip'

/** Jumlah kartu persetujuan yang ditampilkan pada satu layar. */
export const APPROVAL_CARD_LIMIT = 3

/**
 * Pengajuan lintas unit yang belum masuk ke daftar perjalanan pengguna,
 * dipakai sebagai pelengkap antrean persetujuan.
 */
export const EXTRA_PENDING_APPROVALS: Trip[] = [
  {
    id: 'PD-2026-012',
    name: 'Fajar Hidayat',
    tujuan: 'Makassar',
    kegiatan: 'Koordinasi proyek regional',
    tanggal: '14–17 September 2026',
    status: 'Menunggu',
    biaya: 'Rp 5.100.000',
  },
]
