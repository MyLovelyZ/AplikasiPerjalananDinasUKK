import type { Trip } from '@/types/trip'

/** Data contoh perjalanan dinas selama backend belum terhubung. */
export const INITIAL_TRIPS: Trip[] = [
  {
    id: 'PD-2026-018',
    name: 'Andi Pratama',
    tujuan: 'Jakarta',
    kegiatan: 'Rapat koordinasi program kerja',
    tanggal: '12–14 Agustus 2026',
    status: 'Disetujui',
    biaya: 'Rp 4.250.000',
  },
  {
    id: 'PD-2026-017',
    name: 'Siti Rahma',
    tujuan: 'Bandung',
    kegiatan: 'Workshop transformasi digital',
    tanggal: '18–20 Agustus 2026',
    status: 'Menunggu',
    biaya: 'Rp 3.180.000',
  },
  {
    id: 'PD-2026-016',
    name: 'Budi Santoso',
    tujuan: 'Surabaya',
    kegiatan: 'Monitoring proyek lapangan',
    tanggal: '25–28 Agustus 2026',
    status: 'Diproses',
    biaya: 'Rp 5.760.000',
  },
  {
    id: 'PD-2026-015',
    name: 'Dewi Lestari',
    tujuan: 'Yogyakarta',
    kegiatan: 'Pelatihan dan pendampingan',
    tanggal: '03–05 September 2026',
    status: 'Ditolak',
    biaya: 'Rp 2.950.000',
  },
  {
    id: 'PD-2026-014',
    name: 'Rizky Maulana',
    tujuan: 'Medan',
    kegiatan: 'Kunjungan kerja mitra',
    tanggal: '09–12 September 2026',
    status: 'Disetujui',
    biaya: 'Rp 6.420.000',
  },
]
