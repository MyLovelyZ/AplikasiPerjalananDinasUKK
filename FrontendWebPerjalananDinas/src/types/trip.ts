/** Status siklus hidup sebuah pengajuan perjalanan dinas. */
export type TripStatus = 'Disetujui' | 'Menunggu' | 'Diproses' | 'Ditolak'

export interface Trip {
  /** Nomor pengajuan, contoh: `PD-2026-018`. */
  id: string
  /** Nama pegawai pengaju. */
  name: string
  tujuan: string
  kegiatan: string
  /** Rentang tanggal dalam bentuk teks siap tampil. */
  tanggal: string
  status: TripStatus
  /** Estimasi biaya dalam bentuk teks siap tampil, `—` bila belum tersedia. */
  biaya: string
}

/** Nilai form pada modal pengajuan perjalanan dinas. */
export interface TripFormValues {
  tujuan: string
  kegiatan: string
  mulai: string
  selesai: string
  transportasi: string
  catatan: string
}
