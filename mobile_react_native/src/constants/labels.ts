// Label & pemetaan status dalam Bahasa Indonesia + utilitas pemformatan
// Selaras 100% dengan FrontendWebPerjalananDinas/src/constants/label.ts & src/utils/format.ts

import { Colors } from '../theme/colors';
import type {
  JenisDokumen,
  JenisPencairan,
  JenisPerjalanan,
  KategoriBiaya,
  MetodeBayar,
  Notifikasi,
  Peran,
  StatusLaporan,
  StatusPencairan,
  StatusPengeluaran,
  StatusPerjalanan,
  Transportasi,
} from '../api/types';

export type WarnaStatus =
  | 'netral'
  | 'biru'
  | 'kuning'
  | 'hijau'
  | 'merah'
  | 'ungu';

export interface RupaStatus {
  label: string;
  warna: WarnaStatus;
  badgeBg: string;
  badgeText: string;
  border: string;
  dot: string;
  dashed?: boolean;
}

/**
 * Mengubah kategori warna status menjadi gaya badge 3-warna sesuai components.css:
 * - kuning / biru (perlu perhatian): latar #E08806, teks #19273A
 * - hijau / ungu (selesai / disetujui): latar #19273A, teks #DFDFDF
 * - merah (ditolak / gagal): latar #DFDFDF, teks #19273A, garis #19273A
 * - netral (draf / dibatalkan): latar #DFDFDF, teks lembut, garis putus-putus
 */
function buatRupaStatus(label: string, warna: WarnaStatus): RupaStatus {
  switch (warna) {
    case 'kuning':
    case 'biru':
      return {
        label,
        warna,
        badgeBg: Colors.ketiga,
        badgeText: Colors.kedua,
        border: Colors.kedua,
        dot: Colors.kedua,
      };
    case 'hijau':
    case 'ungu':
      return {
        label,
        warna,
        badgeBg: Colors.kedua,
        badgeText: Colors.utama,
        border: Colors.kedua,
        dot: Colors.ketiga,
      };
    case 'merah':
      return {
        label,
        warna,
        badgeBg: Colors.utama,
        badgeText: Colors.kedua,
        border: Colors.kedua,
        dot: Colors.kedua,
      };
    case 'netral':
    default:
      return {
        label,
        warna: 'netral',
        badgeBg: Colors.utama,
        badgeText: Colors.tintaLembut,
        border: Colors.garisTegas,
        dot: Colors.tintaLembut,
        dashed: true,
      };
  }
}

export const RUPA_STATUS_PERJALANAN: Record<StatusPerjalanan, RupaStatus> = {
  draft: buatRupaStatus('Draf', 'netral'),
  submitted: buatRupaStatus('Menunggu Supervisor', 'kuning'),
  supervisor_approved: buatRupaStatus('Menunggu Keuangan', 'biru'),
  approved: buatRupaStatus('Disetujui', 'hijau'),
  rejected: buatRupaStatus('Ditolak', 'merah'),
  completed: buatRupaStatus('Selesai', 'ungu'),
  cancelled: buatRupaStatus('Dibatalkan', 'netral'),
};

export const RUPA_STATUS_LAPORAN: Record<StatusLaporan, RupaStatus> = {
  draft: buatRupaStatus('Draf', 'netral'),
  submitted: buatRupaStatus('Menunggu Verifikasi', 'kuning'),
  verified: buatRupaStatus('Terverifikasi', 'biru'),
  returned: buatRupaStatus('Dikembalikan', 'merah'),
  settled: buatRupaStatus('Tuntas', 'hijau'),
};

export const RUPA_STATUS_PENGELUARAN: Record<StatusPengeluaran, RupaStatus> = {
  pending: buatRupaStatus('Menunggu', 'kuning'),
  approved: buatRupaStatus('Disetujui', 'hijau'),
  rejected: buatRupaStatus('Ditolak', 'merah'),
};

export const RUPA_STATUS_PENCAIRAN: Record<StatusPencairan, RupaStatus> = {
  pending: buatRupaStatus('Menunggu', 'kuning'),
  processing: buatRupaStatus('Diproses', 'biru'),
  paid: buatRupaStatus('Dibayarkan', 'hijau'),
  failed: buatRupaStatus('Gagal', 'merah'),
};

export const LABEL_PERAN: Record<Peran, string> = {
  employee: 'Karyawan',
  supervisor: 'Supervisor',
  finance: 'Keuangan',
  admin: 'Administrator',
};

export const LABEL_JENIS_PERJALANAN: Record<JenisPerjalanan, string> = {
  local: 'Dalam Kota',
  domestic: 'Luar Kota (Domestik)',
  international: 'Luar Negeri',
};

export const LABEL_TRANSPORTASI: Record<Transportasi, string> = {
  plane: 'Pesawat Udara',
  train: 'Kereta Api',
  bus: 'Bus / Travel',
  ship: 'Kapal Laut',
  office_vehicle: 'Kendaraan Dinas',
  private_vehicle: 'Kendaraan Pribadi',
  other: 'Lainnya',
};

export const LABEL_KATEGORI_BIAYA: Record<KategoriBiaya, string> = {
  transportation: 'Transportasi',
  accommodation: 'Akomodasi / Penginapan',
  daily_allowance: 'Uang Harian',
  meals: 'Konsumsi / Makan',
  other: 'Lain-lain',
};

export const LABEL_JENIS_DOKUMEN: Record<JenisDokumen, string> = {
  assignment_letter: 'Surat Tugas',
  invitation: 'Undangan Kegiatan',
  itinerary: 'Jadwal Perjalanan',
  other: 'Dokumen Pendukung',
};

export const LABEL_JENIS_PENCAIRAN: Record<JenisPencairan, string> = {
  advance: 'Uang Muka',
  reimbursement: 'Reimbursement',
  refund_To_company: 'Pengembalian ke Perusahaan',
};

export const LABEL_METODE_BAYAR: Record<MetodeBayar, string> = {
  bank_transfer: 'Transfer Bank',
  cash: 'Tunai',
  payroll: 'Potong / Tambah Gaji',
};

export const LABEL_PENYELESAIAN: Record<
  'reimbursement' | 'refund' | 'balanced',
  string
> = {
  reimbursement: 'Perusahaan membayar kekurangan',
  refund: 'Karyawan mengembalikan kelebihan',
  balanced: 'Seimbang (nihil)',
};

export const LABEL_TAHAP: Record<'supervisor' | 'finance', string> = {
  supervisor: 'Persetujuan Supervisor',
  finance: 'Persetujuan Keuangan',
};

export const LABEL_KEPUTUSAN: Record<'approved' | 'rejected', string> = {
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

export const STATUS_PERJALANAN_TERURUT: StatusPerjalanan[] = [
  'draft',
  'submitted',
  'supervisor_approved',
  'approved',
  'completed',
  'rejected',
  'cancelled',
];

// =========================================================================
// Utilitas Format (Selaras dengan FrontendWebPerjalananDinas/src/utils/format.ts)
// =========================================================================

const pemformatRupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const pemformatAngka = new Intl.NumberFormat('id-ID');

export function formatRupiah(nilai: number | null | undefined): string {
  if (nilai === null || nilai === undefined || Number.isNaN(Number(nilai))) {
    return 'Rp 0';
  }
  return pemformatRupiah.format(Number(nilai));
}

export const rupiah = formatRupiah;

export function formatAngka(nilai: number | null | undefined): string {
  if (nilai === null || nilai === undefined || Number.isNaN(Number(nilai))) {
    return '0';
  }
  return pemformatAngka.format(Number(nilai));
}

export function rupiahRingkas(nilai: number | null | undefined): string {
  const n = Number(nilai ?? 0);
  const abs = Math.abs(n);
  const tanda = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    return `${tanda}Rp ${(abs / 1_000_000_000).toFixed(1).replace('.', ',')} M`;
  }
  if (abs >= 1_000_000) {
    return `${tanda}Rp ${(abs / 1_000_000).toFixed(1).replace('.', ',')} jt`;
  }
  if (abs >= 1_000) {
    return `${tanda}Rp ${Math.round(abs / 1_000)} rb`;
  }
  return formatRupiah(n);
}

const BULAN_PENDEK = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

function uraiTanggal(input: string | null | undefined): Date | null {
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [t, b, h] = input.split('-').map(Number);
    return new Date(t, b - 1, h);
  }
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatTanggal(
  input: string | null | undefined,
  opsi?: { lengkap?: boolean }
): string {
  const d = uraiTanggal(input);
  if (!d) return '—';
  if (opsi?.lengkap) {
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  return `${d.getDate()} ${BULAN_PENDEK[d.getMonth()]} ${d.getFullYear()}`;
}

export const tanggal = formatTanggal;

export function rentangTanggal(
  mulai: string | null | undefined,
  selesai: string | null | undefined
): string {
  const a = uraiTanggal(mulai);
  const b = uraiTanggal(selesai);
  if (!a && !b) return '—';
  if (a && !b) return formatTanggal(mulai);
  if (!a && b) return formatTanggal(selesai);
  if (!a || !b) return '—';

  const samaTahun = a.getFullYear() === b.getFullYear();
  const samaBulan = samaTahun && a.getMonth() === b.getMonth();
  const samaHari = samaBulan && a.getDate() === b.getDate();

  if (samaHari) {
    return `${a.getDate()} ${BULAN_PENDEK[a.getMonth()]} ${a.getFullYear()}`;
  }
  if (samaBulan) {
    return `${a.getDate()}–${b.getDate()} ${BULAN_PENDEK[a.getMonth()]} ${a.getFullYear()}`;
  }
  if (samaTahun) {
    return `${a.getDate()} ${BULAN_PENDEK[a.getMonth()]} – ${b.getDate()} ${BULAN_PENDEK[b.getMonth()]} ${a.getFullYear()}`;
  }
  return `${formatTanggal(mulai)} – ${formatTanggal(selesai)}`;
}

export function formatWaktu(input: string | null | undefined): string {
  const d = uraiTanggal(input);
  if (!d) return '—';
  const jam = String(d.getHours()).padStart(2, '0');
  const menit = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${BULAN_PENDEK[d.getMonth()]} ${d.getFullYear()}, ${jam}.${menit}`;
}

export function sejak(input: string | null | undefined): string {
  const d = uraiTanggal(input);
  if (!d) return '';
  const detik = Math.floor((Date.now() - d.getTime()) / 1000);
  if (detik < 45) return 'baru saja';
  const menit = Math.floor(detik / 60);
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 7) return `${hari} hari lalu`;
  return formatTanggal(input);
}

export function ukuranBerkas(bytes: number | null | undefined): string {
  const b = Number(bytes ?? 0);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

export function inisial(nama: string | null | undefined): string {
  if (!nama) return 'P';
  const bagian = nama.trim().split(/\s+/).slice(0, 2);
  return bagian.map((s) => s[0]?.toUpperCase() ?? '').join('') || 'P';
}

export function hariIni(tambahHari = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + tambahHari);
  const t = d.getFullYear();
  const b = String(d.getMonth() + 1).padStart(2, '0');
  const h = String(d.getDate()).padStart(2, '0');
  return `${t}-${b}-${h}`;
}

export function teksNotifikasi(n: Notifikasi): {
  judul: string;
  pesan: string;
} {
  const nomor = n.request_number ?? 'Perjalanan';
  const tujuan = n.destination ? ` ke ${n.destination}` : '';
  const aktor = n.actor_name ?? 'Sistem';

  switch (n.event) {
    case 'request_submitted':
      return {
        judul: `Pengajuan baru ${nomor}`,
        pesan: `${aktor} mengajukan perjalanan${tujuan} (${n.purpose ?? ''}).`,
      };
    case 'request_supervisor_approved':
      return {
        judul: `${nomor} disetujui Supervisor`,
        pesan: `${aktor} menyetujui pengajuan${tujuan}. Menunggu persetujuan akhir Keuangan.`,
      };
    case 'request_approved':
      return {
        judul: `${nomor} disetujui Keuangan`,
        pesan: `Perjalanan${tujuan} telah disetujui penuh oleh ${aktor}.`,
      };
    case 'request_rejected':
      return {
        judul: `${nomor} ditolak`,
        pesan: `${aktor} menolak pengajuan${tujuan}${n.note ? `: "${n.note}"` : '.'}`,
      };
    case 'expense_report_submitted':
      return {
        judul: `Laporan biaya ${nomor} diajukan`,
        pesan: `${aktor} mengirim laporan pengeluaran perjalanan${tujuan} untuk diverifikasi.`,
      };
    case 'expense_report_verified':
      return {
        judul: `Laporan biaya ${nomor} diverifikasi`,
        pesan: `${aktor} telah memverifikasi laporan pengeluaran perjalanan${tujuan}.`,
      };
    case 'expense_report_returned':
      return {
        judul: `Laporan biaya ${nomor} dikembalikan`,
        pesan: `${aktor} mengembalikan laporan untuk diperbaiki${n.note ? `: "${n.note}"` : '.'}`,
      };
    case 'disbursement_paid':
      return {
        judul: `Dana ${nomor} telah dibayarkan`,
        pesan: `${aktor} mencatat pembayaran dana perjalanan${tujuan}.`,
      };
    default:
      return {
        judul: `Pembaruan ${nomor}`,
        pesan: n.note || `Terdapat pembaruan pada perjalanan${tujuan}.`,
      };
  }
}

