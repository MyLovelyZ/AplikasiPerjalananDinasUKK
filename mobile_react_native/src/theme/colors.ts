/**
 * Sistem Warna Travel Portal — PT. Citra Mandiri (Mobile React Native)
 *
 * Selaras 100% dengan FrontendWebPerjalananDinas/src/styles/base.css:
 * Aturan 60-30-10 dengan hanya 3 warna:
 *   60% Utama  (#DFDFDF) — latar halaman, permukaan ruang kerja, teks di atas warna kedua
 *   30% Kedua  (#19273A) — navigasi/header, teks utama, tombol utama, garis batas
 *   10% Ketiga (#E08806) — aksen, sorotan aktif, lencana perhatian, indikator penting
 */

export const Colors = {
  // 3 Warna Inti (60-30-10)
  utama: '#DFDFDF',
  kedua: '#19273A',
  ketiga: '#E08806',

  // Turunan transparan dari 3 warna inti (identik dengan variabel CSS di base.css)
  latar: '#DFDFDF',
  latarGelap: 'rgba(25, 39, 58, 0.06)',
  latarKartu: '#DFDFDF',
  latarSidebar: '#19273A',
  latarSorot: 'rgba(25, 39, 58, 0.06)',
  latarSorotKuat: 'rgba(25, 39, 58, 0.12)',

  tinta: '#19273A',
  tintaLembut: 'rgba(25, 39, 58, 0.72)',
  tintaRedup: 'rgba(25, 39, 58, 0.52)',

  garis: 'rgba(25, 39, 58, 0.18)',
  garisTegas: 'rgba(25, 39, 58, 0.45)',
  garisPutih: 'rgba(223, 223, 223, 0.12)',

  aksen: '#E08806',
  aksenGelap: '#19273A',
  aksenLatar: '#E08806',

  // Teks di atas permukaan gelap (#19273A)
  utamaRedup: 'rgba(223, 223, 223, 0.65)',
  utamaSamar: 'rgba(223, 223, 223, 0.45)',
  putihTransparan: 'rgba(223, 223, 223, 0.10)',
  putihSamar: 'rgba(223, 223, 223, 0.06)',

  // Alias kompatibilitas komponen
  primary: '#DFDFDF',
  secondary: '#19273A',
  accent: '#E08806',
  background: '#DFDFDF',
  card: '#DFDFDF',
  text: '#19273A',
  textSecondary: 'rgba(25, 39, 58, 0.72)',
  textMuted: 'rgba(25, 39, 58, 0.52)',
  border: 'rgba(25, 39, 58, 0.18)',
  borderStrong: 'rgba(25, 39, 58, 0.45)',
  utamaTerang: 'rgba(25, 39, 58, 0.06)',
  ketigaLembut: 'rgba(224, 136, 6, 0.16)',
  tintaLunak: 'rgba(25, 39, 58, 0.72)',
  garisStrong: 'rgba(25, 39, 58, 0.45)',
};

export const Radii = {
  sm: 6,
  md: 8,
  lg: 12,
  pill: 999,
  penuh: 999,
};

