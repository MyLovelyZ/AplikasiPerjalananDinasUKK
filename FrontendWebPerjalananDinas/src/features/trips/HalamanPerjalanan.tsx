import { useNavigate, useParams } from 'react-router'

import { apiFormUbahPerjalanan } from '@/api/endpoint'
import type { OpsiFormPerjalanan, Perjalanan } from '@/api/tipe'
import { Muatan } from '@/components/ui/Keadaan'
import { SebagaiHalaman } from '@/components/ui/Modal'
import { HalamanGalat } from '@/features/errors/HalamanGalat'
import { DetailPerjalananModal } from '@/features/trips/components/DetailPerjalananModal'
import type { SudutPandang } from '@/features/trips/components/DetailPerjalananModal'
import { FormulirPerjalananModal } from '@/features/trips/components/FormulirPerjalananModal'
import { LaporanModal } from '@/features/trips/components/LaporanModal'
import { usePermintaan } from '@/hooks/usePermintaan'
import { useAplikasi } from '@/layouts/konteksAplikasi'

/** Halaman daftar tempat kembali dari detail, per peran. */
const DAFTAR: Record<SudutPandang, string> = {
  employee: '/employee/requests',
  supervisor: '/supervisor/approvals',
  finance: '/finance/approvals',
}

function useIdRute(): number | null {
  const { id } = useParams()
  const angka = Number(id)
  return Number.isInteger(angka) && angka > 0 ? angka : null
}

/** /employee/requests/:id · /supervisor/approvals/:id · /finance/approvals/:id */
export function HalamanDetailPerjalanan({ sudut }: { sudut: SudutPandang }) {
  const id = useIdRute()
  const navigate = useNavigate()
  const { sukses } = useAplikasi()

  if (id === null) return <HalamanGalat kode={404} />

  return (
    <SebagaiHalaman>
      <DetailPerjalananModal
        key={id}
        perjalananId={id}
        sudut={sudut}
        onTutup={() => navigate(DAFTAR[sudut])}
        onBerubah={sukses}
        onUbah={(p) => navigate(`/employee/requests/${p.id}/edit`)}
        onBukaLaporan={(p) => navigate(`/employee/requests/${p.id}/expenses`)}
      />
    </SebagaiHalaman>
  )
}

/** /employee/requests/new dan /employee/requests/:id/edit */
export function HalamanFormPerjalanan() {
  const { id } = useParams()
  const idUbah = useIdRute()

  if (id === undefined) return <FormulirDiHalaman />
  if (idUbah === null) return <HalamanGalat kode={404} />
  return <FormulirUbah key={idUbah} id={idUbah} />
}

function FormulirUbah({ id }: { id: number }) {
  const { data, memuat, galat, muatUlang } = usePermintaan(() => apiFormUbahPerjalanan(id), [id])

  return (
    <Muatan data={data} memuat={memuat} galat={galat} onCobaLagi={muatUlang} barisRangka={8}>
      {(isi) => <FormulirDiHalaman perjalanan={isi.travel_request} opsi={isi.options} />}
    </Muatan>
  )
}

function FormulirDiHalaman({ perjalanan, opsi }: { perjalanan?: Perjalanan; opsi?: OpsiFormPerjalanan }) {
  const navigate = useNavigate()
  const { sukses } = useAplikasi()

  return (
    <SebagaiHalaman>
      <FormulirPerjalananModal
        perjalanan={perjalanan}
        opsiAwal={opsi}
        onTutup={() => navigate(perjalanan ? `/employee/requests/${perjalanan.id}` : '/employee/requests')}
        onTersimpan={(tersimpan, pesan) => {
          sukses(pesan)
          navigate(`/employee/requests/${tersimpan.id}`, { replace: true })
        }}
      />
    </SebagaiHalaman>
  )
}

/** /employee/requests/:id/expenses — laporan biaya (LPJ). */
export function HalamanLaporanBiaya() {
  const id = useIdRute()
  const navigate = useNavigate()
  const { sukses } = useAplikasi()

  if (id === null) return <HalamanGalat kode={404} />

  return (
    <SebagaiHalaman>
      <LaporanModal
        key={id}
        perjalananId={id}
        onTutup={() => navigate(`/employee/requests/${id}`)}
        onBerubah={sukses}
      />
    </SebagaiHalaman>
  )
}
