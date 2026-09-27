import { minta, mintaDenganPesan, mintaHalaman } from '@/api/klien'
import type {
  Departemen,
  HasilMasuk,
  Jabatan,
  Karyawan,
  KategoriBiaya,
  Laporan,
  Lokasi,
  Notifikasi,
  OpsiSppd,
  Pencairan,
  PengaturanSistem,
  ProfilPengguna,
  RingkasanDashboard,
  SerapanAnggaran,
  Sppd,
  TugasPersetujuan,
} from '@/api/tipe'

/**
 * Seluruh endpoint backend dalam satu tempat.
 *
 * Halaman tidak menuliskan string URL sendiri: kalau backend memindahkan
 * sebuah endpoint, hanya berkas ini yang perlu menyesuaikan.
 */

// ── Autentikasi ───────────────────────────────────────────────────────

export const apiMasuk = (username: string, kataSandi: string) =>
  minta<HasilMasuk>('/auth/masuk', {
    metode: 'POST',
    body: { username, kata_sandi: kataSandi },
  })

export const apiProfil = () => minta<ProfilPengguna>('/auth/saya')

export const apiKeluar = (refreshToken: string | null) =>
  minta<null>('/auth/keluar', {
    metode: 'POST',
    body: { refresh_token: refreshToken },
  })

// ── Dashboard ─────────────────────────────────────────────────────────

export const apiRingkasanDashboard = (tahun?: number) =>
  minta<RingkasanDashboard>('/dashboard/ringkasan', { query: { tahun } })

export const apiSerapanAnggaran = (tahun?: number) =>
  minta<SerapanAnggaran[]>('/dashboard/anggaran', { query: { tahun } })

// ── SPPD ──────────────────────────────────────────────────────────────

export interface FilterSppd {
  halaman?: number
  per_halaman?: number
  status?: string
  jenis?: string
  cari?: string
}

export const apiDaftarSppd = (filter: FilterSppd = {}) =>
  mintaHalaman<Sppd>('/sppd', { query: { ...filter } })

export const apiDetailSppd = (id: number | string) => minta<Sppd>(`/sppd/${id}`)

export const apiOpsiSppd = () => minta<OpsiSppd>('/sppd/meta/opsi')

export interface BaruRincianBiaya {
  kategori_biaya_id: number
  deskripsi?: string
  kuantitas: number
  harga_satuan: number
}

export interface FormulirSppd {
  jenis_perjalanan: string
  moda_transportasi: string
  keperluan: string
  agenda?: string
  tanggal_berangkat: string
  tanggal_kembali: string
  lokasi_tujuan_id?: number
  tujuan_lainnya?: string
  uang_muka_diminta?: number
  catatan_pemohon?: string
  rincian_biaya: BaruRincianBiaya[]
}

export const apiBuatSppd = (formulir: FormulirSppd) =>
  mintaDenganPesan<Sppd>('/sppd', { metode: 'POST', body: formulir })

export const apiUbahSppd = (id: number, formulir: Partial<FormulirSppd>) =>
  mintaDenganPesan<Sppd>(`/sppd/${id}`, { metode: 'PUT', body: formulir })

export const apiHapusSppd = (id: number) =>
  mintaDenganPesan<null>(`/sppd/${id}`, { metode: 'DELETE' })

export const apiAjukanSppd = (id: number) =>
  mintaDenganPesan<Sppd>(`/sppd/${id}/ajukan`, { metode: 'POST' })

export const apiBatalkanSppd = (id: number, alasan: string) =>
  mintaDenganPesan<Sppd>(`/sppd/${id}/batalkan`, { metode: 'POST', body: { alasan } })

export const apiSelesaiPerjalanan = (id: number) =>
  mintaDenganPesan<Sppd>(`/sppd/${id}/selesai-perjalanan`, { metode: 'POST' })

// ── Persetujuan ───────────────────────────────────────────────────────

export const apiAntreanPersetujuan = (halaman = 1, perHalaman = 20) =>
  mintaHalaman<TugasPersetujuan>('/persetujuan/antrean', {
    query: { halaman, per_halaman: perHalaman },
  })

export const apiRiwayatPersetujuan = (halaman = 1, perHalaman = 20) =>
  mintaHalaman<TugasPersetujuan>('/persetujuan/riwayat', {
    query: { halaman, per_halaman: perHalaman },
  })

export const apiSetujui = (id: number, catatan?: string) =>
  mintaDenganPesan<Sppd>(`/persetujuan/${id}/setujui`, { metode: 'POST', body: { catatan } })

export const apiTolak = (id: number, catatan: string) =>
  mintaDenganPesan<Sppd>(`/persetujuan/${id}/tolak`, { metode: 'POST', body: { catatan } })

export const apiMintaRevisi = (id: number, catatan: string) =>
  mintaDenganPesan<Sppd>(`/persetujuan/${id}/revisi`, { metode: 'POST', body: { catatan } })

// ── Laporan ───────────────────────────────────────────────────────────

export const apiDaftarLaporan = (filter: { halaman?: number; status?: string; cari?: string } = {}) =>
  mintaHalaman<Laporan>('/laporan', { query: { per_halaman: 20, ...filter } })

export const apiDetailLaporan = (id: number | string) => minta<Laporan>(`/laporan/${id}`)

export const apiBuatLaporan = (
  sppdId: number,
  isi: { ringkasan_kegiatan: string; hasil_capaian?: string; tanggal_lapor?: string },
) => mintaDenganPesan<Laporan>(`/sppd/${sppdId}/laporan`, { metode: 'POST', body: isi })

export const apiTambahKlaim = (
  laporanId: number,
  isi: {
    kategori_biaya_id: number
    tanggal_transaksi: string
    deskripsi: string
    jumlah_diajukan: number
  },
) => mintaDenganPesan<unknown>(`/laporan/${laporanId}/klaim`, { metode: 'POST', body: isi })

export const apiHapusKlaim = (laporanId: number, klaimId: number) =>
  mintaDenganPesan<null>(`/laporan/${laporanId}/klaim/${klaimId}`, { metode: 'DELETE' })

export const apiUnggahBukti = (laporanId: number, klaimId: number, berkas: File) => {
  const formulir = new FormData()
  formulir.append('berkas', berkas)
  formulir.append('sumber', 'UNGGAH_WEB')

  return mintaDenganPesan<unknown>(`/laporan/${laporanId}/klaim/${klaimId}/bukti`, {
    metode: 'POST',
    formulir,
  })
}

export const apiAjukanLaporan = (id: number) =>
  mintaDenganPesan<Laporan>(`/laporan/${id}/ajukan`, { metode: 'POST' })

export interface KeputusanKlaim {
  klaim_id: number
  status: 'DISETUJUI' | 'DISETUJUI_SEBAGIAN' | 'DITOLAK'
  jumlah_disetujui: number
  catatan?: string
}

export const apiVerifikasiLaporan = (
  id: number,
  isi: { catatan?: string; klaim: KeputusanKlaim[] },
) => mintaDenganPesan<Laporan>(`/laporan/${id}/verifikasi`, { metode: 'POST', body: isi })

export const apiRevisiLaporan = (id: number, catatan: string) =>
  mintaDenganPesan<Laporan>(`/laporan/${id}/revisi`, { metode: 'POST', body: { catatan } })

// ── Pencairan ─────────────────────────────────────────────────────────

export const apiDaftarPencairan = (filter: { status?: string; jenis?: string } = {}) =>
  mintaHalaman<Pencairan>('/pencairan', { query: { per_halaman: 20, ...filter } })

export const apiCairkanUangMuka = (sppdId: number, jumlah?: number) =>
  mintaDenganPesan<Pencairan>(`/sppd/${sppdId}/uang-muka`, {
    metode: 'POST',
    body: { jumlah },
  })

export const apiPencairanDariLaporan = (laporanId: number) =>
  mintaDenganPesan<Pencairan>(`/laporan/${laporanId}/pencairan`, { metode: 'POST' })

export const apiProsesPencairan = (
  id: number,
  isi: { status?: string; referensi_payroll?: string; nomor_referensi?: string },
) => mintaDenganPesan<Pencairan>(`/pencairan/${id}/proses`, { metode: 'POST', body: isi })

// ── Data master ───────────────────────────────────────────────────────

export const apiLokasi = () => minta<Lokasi[]>('/master/lokasi', { query: { status: 'AKTIF' } })
export const apiKategoriBiaya = () =>
  minta<KategoriBiaya[]>('/master/kategori-biaya', { query: { status: 'AKTIF' } })
export const apiDepartemen = () => minta<Departemen[]>('/master/departemen')
export const apiJabatan = () => minta<Jabatan[]>('/master/jabatan')

// ── Karyawan ──────────────────────────────────────────────────────────

export const apiDaftarKaryawan = (
  filter: { halaman?: number; per_halaman?: number; cari?: string; departemen_id?: number } = {},
) => mintaHalaman<Karyawan>('/karyawan', { query: { per_halaman: 20, ...filter } })

// ── Notifikasi ────────────────────────────────────────────────────────

export const apiNotifikasi = (belumDibaca = false) =>
  mintaHalaman<Notifikasi>('/notifikasi', {
    query: { per_halaman: 20, belum_dibaca: belumDibaca ? 'true' : undefined },
  })

export const apiJumlahNotifikasi = () =>
  minta<{ jumlah: number }>('/notifikasi/jumlah-belum-dibaca')

export const apiBacaNotifikasi = (id: number) =>
  mintaDenganPesan<Notifikasi>(`/notifikasi/${id}/baca`, { metode: 'POST' })

export const apiBacaSemuaNotifikasi = () =>
  mintaDenganPesan<{ jumlah: number }>('/notifikasi/baca-semua', { metode: 'POST' })

// ── Pengaturan sistem ─────────────────────────────────────────────────

export const apiPengaturan = () => minta<PengaturanSistem[]>('/pengaturan')

export const apiUbahPengaturan = (kunci: string, nilai: string) =>
  mintaDenganPesan<PengaturanSistem>(`/pengaturan/${kunci}`, {
    metode: 'PUT',
    body: { nilai },
  })
