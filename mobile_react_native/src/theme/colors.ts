/**
 * Sistem Warna Travel Portal — PT. Citra Mandiri (Mobile React Native)
 *
 * Selaras 100% dengan FrontendWebPerjalananDinas/src/styles/base.css:
 * Aturan 60-30-10 dengan 3 warna inti:
 *   60% Utama  (#DFDFDF) — latar di mode terang / teks di mode gelap
 *   30% Kedua  (#19273A) — latar di mode gelap / teks di mode terang
 *   10% Ketiga (#E08806) — aksen, sorotan aktif, lencana perhatian
 */

export const LightThemeColors = {
  // 3 Warna Inti
  utama: '#DFDFDF',
  kedua: '#19273A',
  ketiga: '#E08806',

  // Peran warna Light Mode
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

  utamaRedup: 'rgba(223, 223, 223, 0.65)',
  utamaSamar: 'rgba(223, 223, 223, 0.45)',
  putihTransparan: 'rgba(223, 223, 223, 0.10)',
  putihSamar: 'rgba(223, 223, 223, 0.06)',

  // Kompatibilitas
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

export const DarkThemeColors = {
  // 3 Warna Inti yang sama, peran ditukar selaras base.css :root[data-tema='gelap']
  utama: '#19273A',
  kedua: '#DFDFDF',
  ketiga: '#E08806',

  // Peran warna Dark Mode
  latar: '#19273A',
  latarGelap: '#101a27',
  latarKartu: '#101a27',
  latarSidebar: '#101a27',
  latarSorot: 'rgba(223, 223, 223, 0.08)',
  latarSorotKuat: 'rgba(223, 223, 223, 0.14)',

  tinta: '#DFDFDF',
  tintaLembut: 'rgba(223, 223, 223, 0.75)',
  tintaRedup: 'rgba(223, 223, 223, 0.50)',

  garis: 'rgba(223, 223, 223, 0.18)',
  garisTegas: 'rgba(223, 223, 223, 0.38)',
  garisPutih: 'rgba(223, 223, 223, 0.15)',

  aksen: '#E08806',
  aksenGelap: '#E08806',
  aksenLatar: '#E08806',

  utamaRedup: 'rgba(223, 223, 223, 0.75)',
  utamaSamar: 'rgba(223, 223, 223, 0.45)',
  putihTransparan: 'rgba(223, 223, 223, 0.12)',
  putihSamar: 'rgba(223, 223, 223, 0.06)',

  // Kompatibilitas
  primary: '#19273A',
  secondary: '#DFDFDF',
  accent: '#E08806',
  background: '#19273A',
  card: '#101a27',
  text: '#DFDFDF',
  textSecondary: 'rgba(223, 223, 223, 0.75)',
  textMuted: 'rgba(223, 223, 223, 0.50)',
  border: 'rgba(223, 223, 223, 0.18)',
  borderStrong: 'rgba(223, 223, 223, 0.38)',
  utamaTerang: 'rgba(223, 223, 223, 0.08)',
  ketigaLembut: 'rgba(224, 136, 6, 0.22)',
  tintaLunak: 'rgba(223, 223, 223, 0.75)',
  garisStrong: 'rgba(223, 223, 223, 0.38)',
};

/** Objek Colors dinamis yang mengikuti mode tema */
export let isDarkModeGlobal = false;
export const Colors = { ...LightThemeColors };

export function setDarkMode(enabled: boolean) {
  isDarkModeGlobal = enabled;
  const target = enabled ? DarkThemeColors : LightThemeColors;
  Object.assign(Colors, target);
}

export const Radii = {
  sm: 6,
  md: 8,
  lg: 12,
  pill: 999,
  penuh: 999,
};
