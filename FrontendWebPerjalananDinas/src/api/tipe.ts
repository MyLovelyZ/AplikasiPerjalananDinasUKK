/**
 * Bentuk data yang dikirim backend.
 * Penamaan kolom sengaja dibiarkan snake_case persis seperti respons API,
 * supaya tidak ada lapisan penerjemah yang harus ikut diubah setiap kali
 * backend menambah kolom.
 */

/** Amplop respons tunggal — lihat app/Support/respons.js di backend. */
export interface Respons<T> {
  sukses: boolean
  pesan: string
  data: T
  galat?: unknown
}

/** Amplop respons berhalaman. */
export interface ResponsHalaman<T> extends Respons<T[]> {
  halaman: {
    halaman_saat_ini: number
    per_halaman: number
    total_data: number
    total_halaman: number
  }
}

export interface Halaman {
  halaman_saat_ini: number
  per_halaman: number
  total_data: number
  total_halaman: number
}

// ── Autentikasi ───────────────────────────────────────────────────────

export interface HasilMasuk {
  access_token: string
  refresh_token: string
  pengguna: {
    id: number
    username: string
    nama_lengkap?: string
    peran: string[]
  }
}

export interface ProfilPengguna {
  id: number
  username: string
  status_akun: string
  terakhir_masuk: string | null
  karyawan: {
    id: number
    nip: string
    nama_lengkap: string
    email: string
    departemen_id: number
    jabatan_id: number
  } | null
  peran: Array<{ kode: string; nama: string }>
  hak_akses: string[]
}

// ── Data master ───────────────────────────────────────────────────────

export type Zona = 'DALAM_KOTA' | 'LUAR_KOTA' | 'LUAR_NEGERI'

export interface Lokasi {
  id: number
  nama_kota: string
  provinsi: string | null
  negara: string
  zona: Zona
  status: string
}

export interface KategoriBiaya {
  id: number
  kode: string
  nama: string
  satuan: string
  wajib_bukti: boolean
  status: string
}

export interface Departemen {
  id: number
  kode: string
  nama: string
  status: string
}

export interface Jabatan {
  id: number
  kode: string
  nama: string
  level_jabatan: number
  status: string
}

// ── SPPD ──────────────────────────────────────────────────────────────

export type StatusSppd =
  | 'DRAFT'
  | 'DIAJUKAN'
  | 'MENUNGGU_PERSETUJUAN'
  | 'REVISI'
  | 'DISETUJUI'
  | 'DITOLAK'
  | 'DIBATALKAN'
  | 'DALAM_PERJALANAN'
  | 'MENUNGGU_LAPORAN'
  | 'SELESAI'

export interface RingkasKaryawan {
  id: number
  nip: string
  nama_lengkap: string
  email?: string
}

export interface RincianBiaya {
  id: number
  kategori_biaya_id: number
  deskripsi: string | null
  kuantitas: string
  satuan: string
  harga_satuan: string
  subtotal: string
  melebihi_plafon: boolean
  kategoriBiaya?: KategoriBiaya
}

export interface Persetujuan {
  id: number
  urutan: number
  penyetuju_id: number
  status: 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK' | 'REVISI' | 'DIDELEGASIKAN' | 'DILEWATI'
  catatan: string | null
  tanggal_ditugaskan: string
  tanggal_aksi: string | null
  penyetuju?: { id: number; nama_lengkap: string }
  penyetujuAsli?: { id: number; nama_lengkap: string } | null
  tahap?: { id: number; nama_tahap: string; tipe_penyetuju: string }
}

export interface Sppd {
  id: number
  nomor_sppd: string
  karyawan_id: number
  departemen_id: number
  lokasi_tujuan_id: number | null
  tujuan_lainnya: string | null
  jenis_perjalanan: Zona
  keperluan: string
  agenda: string | null
  tanggal_berangkat: string
  tanggal_kembali: string
  jumlah_hari: number
  moda_transportasi: string
  estimasi_biaya: string
  uang_muka_diminta: string
  uang_muka_disetujui: string
  status: StatusSppd
  tahap_saat_ini: number
  catatan_pemohon: string | null
  tanggal_pengajuan: string | null
  dibuat_pada: string
  label_ringkas?: string
  dapat_diubah?: boolean
  pemohon?: RingkasKaryawan
  departemen?: Departemen
  lokasiTujuan?: Lokasi
  rincianBiaya?: RincianBiaya[]
  persetujuan?: Persetujuan[]
  laporan?: Laporan | null
  itinerary?: Itinerary[]
  dokumen?: DokumenPendukung[]
  pencairan?: Pencairan[]
}

export interface Itinerary {
  id: number
  urutan: number
  tanggal: string
  waktu_mulai: string | null
  waktu_selesai: string | null
  kegiatan: string
  lokasi: string | null
}

export interface DokumenPendukung {
  id: number
  jenis_dokumen: string
  nama_file: string
  path_file: string
  ukuran_byte: number
}

/** Satu baris antrean persetujuan. */
export interface TugasPersetujuan extends Persetujuan {
  perjalanan: Sppd
  ada_pelanggaran_plafon: boolean
}

// ── Laporan & keuangan ────────────────────────────────────────────────

export type StatusLaporan = 'DRAFT' | 'DIAJUKAN' | 'REVISI' | 'DIVERIFIKASI' | 'DITOLAK'

export interface BuktiPengeluaran {
  id: number
  nama_file: string
  path_file: string
  tipe_mime: string
  ukuran_byte: number
  status_verifikasi: 'BELUM' | 'VALID' | 'TIDAK_VALID'
}

export interface KlaimBiaya {
  id: number
  kategori_biaya_id: number
  tanggal_transaksi: string
  deskripsi: string
  jumlah_diajukan: string
  jumlah_disetujui: string | null
  status: 'DIAJUKAN' | 'DISETUJUI' | 'DISETUJUI_SEBAGIAN' | 'DITOLAK'
  melebihi_plafon: boolean
  catatan_verifikasi: string | null
  kategoriBiaya?: KategoriBiaya
  bukti?: BuktiPengeluaran[]
}

export interface Laporan {
  id: number
  perjalanan_id: number
  nomor_laporan: string
  tanggal_lapor: string
  ringkasan_kegiatan: string
  hasil_capaian: string | null
  total_realisasi: string
  total_uang_muka: string
  selisih: string
  jenis_selisih: 'KURANG_BAYAR' | 'LEBIH_BAYAR' | 'NIHIL'
  status: StatusLaporan
  catatan_verifikator: string | null
  tanggal_verifikasi: string | null
  perjalanan?: Sppd
  klaim?: KlaimBiaya[]
  pencairan?: Pencairan[]
}

export interface Pencairan {
  id: number
  perjalanan_id: number
  laporan_id: number | null
  jenis: 'UANG_MUKA' | 'REIMBURSEMENT' | 'PENGEMBALIAN'
  jumlah: string
  metode: string
  nama_bank: string | null
  no_rekening: string | null
  nomor_referensi: string | null
  referensi_payroll: string | null
  tanggal_pencairan: string | null
  status: 'MENUNGGU' | 'DIPROSES' | 'SELESAI' | 'GAGAL'
  perjalanan?: Sppd
  laporan?: { id: number; nomor_laporan: string } | null
}

// ── Dashboard ─────────────────────────────────────────────────────────

export interface TitikTren {
  bulan: number
  nama_bulan: string
  jumlah: number
  total_biaya: number
}

export interface SerapanAnggaran {
  anggaran_id: number
  departemen: string
  kode_departemen: string | null
  pagu: number
  terpakai: number
  realisasi: number
  sisa: number
  persen_terpakai: number
}

export interface RingkasanDashboard {
  tahun: number
  total_sppd: number
  per_status: Record<string, number>
  kartu: {
    draf: number
    menunggu: number
    perlu_revisi: number
    disetujui: number
    diproses: number
    selesai: number
    ditolak: number
  }
  biaya: {
    total_estimasi: number
    total_uang_muka: number
  }
  tugas_persetujuan_saya: number
  tren_bulanan: TitikTren[]
  tujuan_teratas: Array<{
    lokasi_id: number
    nama_kota: string
    zona: Zona | null
    jumlah: number
    total_biaya: number
  }>
  perjalanan_terkini: Sppd[]
  serapan_anggaran: SerapanAnggaran[] | null
  antrean_keuangan: {
    laporan_menunggu_verifikasi: number
    uang_muka_belum_dicairkan: number
    pencairan_berjalan: number
  } | null
}

// ── Karyawan & notifikasi ─────────────────────────────────────────────

export interface Karyawan {
  id: number
  nip: string
  nama_lengkap: string
  email: string
  no_telepon: string | null
  departemen_id: number
  jabatan_id: number
  atasan_id: number | null
  status_karyawan: 'AKTIF' | 'CUTI' | 'NONAKTIF'
  departemen?: Departemen
  jabatan?: Jabatan
  atasan?: RingkasKaryawan | null
  akun?: {
    id: number
    username: string
    status_akun: string
    terakhir_masuk: string | null
    peran: Array<{ id: number; kode: string; nama: string }>
  } | null
}

export interface Notifikasi {
  id: number
  judul: string
  pesan: string
  tipe: string
  sudah_dibaca: boolean
  referensi_tabel: string | null
  referensi_id: number | null
  dibuat_pada: string
}

export interface PengaturanSistem {
  id: number
  kunci: string
  nilai: string
  tipe_nilai: 'TEKS' | 'ANGKA' | 'BOOLEAN' | 'JSON'
  kelompok: string
  deskripsi: string | null
}

export interface OpsiSppd {
  jenis_perjalanan: Zona[]
  moda_transportasi: string[]
  status_pengajuan: StatusSppd[]
  jenis_dokumen: string[]
}
