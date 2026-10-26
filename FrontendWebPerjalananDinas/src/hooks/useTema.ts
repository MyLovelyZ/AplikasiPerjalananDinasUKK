import { useCallback, useSyncExternalStore } from 'react'

export type Tema = 'terang' | 'gelap'

/** Kunci localStorage; skrip kecil di index.html membacanya sebelum React dimuat agar tidak berkedip. */
const KUNCI_TEMA = 'pd.tema'

const mediaGelap = () => window.matchMedia('(prefers-color-scheme: dark)')

/** Pilihan yang pernah disimpan pengguna; null bila belum pernah memilih (ikut sistem). */
function temaTersimpan(): Tema | null {
  try {
    const nilai = localStorage.getItem(KUNCI_TEMA)
    return nilai === 'terang' || nilai === 'gelap' ? nilai : null
  } catch {
    return null
  }
}

/** Pilihan di sesi ini; tetap berlaku walau localStorage diblokir peramban. */
let pilihanSesi: Tema | null = null

const temaAktif = (): Tema => pilihanSesi ?? temaTersimpan() ?? (mediaGelap().matches ? 'gelap' : 'terang')

const pendengar = new Set<() => void>()

function terapkan() {
  document.documentElement.dataset.tema = temaAktif()
  pendengar.forEach((panggil) => panggil())
}

function langganan(panggil: () => void) {
  pendengar.add(panggil)
  const media = mediaGelap()
  // Selama pengguna belum memilih, tema mengikuti perubahan pengaturan sistem.
  media.addEventListener('change', terapkan)
  return () => {
    pendengar.delete(panggil)
    media.removeEventListener('change', terapkan)
  }
}

/** Tema terang/gelap yang sedang aktif beserta pengubahnya; pilihan disimpan per peramban. */
export function useTema() {
  const tema = useSyncExternalStore(langganan, temaAktif)

  const gantiTema = useCallback(() => {
    pilihanSesi = temaAktif() === 'gelap' ? 'terang' : 'gelap'
    try {
      localStorage.setItem(KUNCI_TEMA, pilihanSesi)
    } catch {
      // Penyimpanan diblokir: pilihan hanya berlaku sampai halaman dimuat ulang.
    }
    terapkan()
  }, [])

  return { tema, gantiTema }
}
