import { useEffect, useRef, useState } from 'react'

import { apiBacaNotifikasi, apiBacaSemuaNotifikasi, apiNotifikasi } from '@/api/endpoint'
import { Icon } from '@/components/ui/Icon'
import { Kosong, Memuat } from '@/components/ui/Keadaan'
import { useAuth } from '@/auth/useAuth'
import { usePermintaan } from '@/hooks/usePermintaan'
import { inisial, sejak } from '@/utils/format'
import type { PageKey } from '@/types/navigation'

interface TopbarProps {
  activePage: PageKey
  searchQuery: string
  onSearchChange: (value: string) => void
  onBukaMenu: () => void
  /** Diberi tahu saat notifikasi dibaca, agar hitungan di tempat lain ikut turun. */
  onNotifikasiBerubah: () => void
  jumlahBelumDibaca: number
}

/** Bilah atas: breadcrumb, pencarian, laci notifikasi, dan avatar. */
export function Topbar({
  activePage,
  searchQuery,
  onSearchChange,
  onBukaMenu,
  onNotifikasiBerubah,
  jumlahBelumDibaca,
}: TopbarProps) {
  const { profil } = useAuth()
  const [laciTerbuka, setLaciTerbuka] = useState(false)
  const pembungkusRef = useRef<HTMLDivElement>(null)

  const {
    data: notifikasi,
    memuat,
    muatUlang,
  } = usePermintaan(async () => (await apiNotifikasi()).data, [laciTerbuka])

  // Laci ditutup saat pengguna mengklik di luar area atau menekan Escape.
  useEffect(() => {
    if (!laciTerbuka) return

    const klikDiLuar = (peristiwa: MouseEvent) => {
      if (!pembungkusRef.current?.contains(peristiwa.target as Node)) {
        setLaciTerbuka(false)
      }
    }
    const tekanEscape = (peristiwa: KeyboardEvent) => {
      if (peristiwa.key === 'Escape') setLaciTerbuka(false)
    }

    document.addEventListener('mousedown', klikDiLuar)
    document.addEventListener('keydown', tekanEscape)
    return () => {
      document.removeEventListener('mousedown', klikDiLuar)
      document.removeEventListener('keydown', tekanEscape)
    }
  }, [laciTerbuka])

  const bacaSatu = async (id: number, sudahDibaca: boolean) => {
    if (sudahDibaca) return
    await apiBacaNotifikasi(id).catch(() => null)
    muatUlang()
    onNotifikasiBerubah()
  }

  const bacaSemua = async () => {
    await apiBacaSemuaNotifikasi().catch(() => null)
    muatUlang()
    onNotifikasiBerubah()
  }

  const nama = profil?.karyawan?.nama_lengkap ?? profil?.username ?? ''

  return (
    <header className="topbar">
      <button
        type="button"
        className="mobile-menu"
        aria-label="Buka menu navigasi"
        onClick={onBukaMenu}
      >
        <Icon name="menu" />
      </button>

      <div className="crumb">
        <span>Portal</span>
        <b>/</b>
        <strong>{activePage}</strong>
      </div>

      <div className="top-actions">
        <div className="search">
          <Icon name="search" size={17} />
          <input
            aria-label="Cari nomor SPPD atau keperluan"
            placeholder="Cari SPPD atau keperluan..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        <div className="pembungkus-notif" ref={pembungkusRef}>
          <button
            type="button"
            className="icon-btn"
            aria-label={`Notifikasi, ${jumlahBelumDibaca} belum dibaca`}
            aria-expanded={laciTerbuka}
            onClick={() => setLaciTerbuka((buka) => !buka)}
          >
            <Icon name="bell" />
            {jumlahBelumDibaca > 0 && (
              <i className="titik">{jumlahBelumDibaca > 9 ? '9+' : jumlahBelumDibaca}</i>
            )}
          </button>

          {laciTerbuka && (
            <div className="laci-notif">
              <div className="laci-notif-head">
                <h3>Notifikasi</h3>
                {jumlahBelumDibaca > 0 && (
                  <button type="button" className="btn-tautan" onClick={bacaSemua}>
                    Tandai semua dibaca
                  </button>
                )}
              </div>

              <div className="laci-notif-isi">
                {memuat && !notifikasi ? (
                  <Memuat baris={3} />
                ) : !notifikasi?.length ? (
                  <Kosong
                    ikon="bell"
                    judul="Belum ada notifikasi"
                    pesan="Pemberitahuan pengajuan dan persetujuan akan muncul di sini."
                  />
                ) : (
                  notifikasi.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className={`notif-baris ${n.sudah_dibaca ? 'sudah' : 'belum'}`}
                      onClick={() => bacaSatu(n.id, n.sudah_dibaca)}
                    >
                      <span className="penanda" />
                      <span className="teks">
                        <b>{n.judul}</b>
                        <p>{n.pesan}</p>
                        <small>{sejak(n.dibuat_pada)}</small>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="top-avatar" title={nama}>
          {inisial(nama)}
        </div>
      </div>
    </header>
  )
}
