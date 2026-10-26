import type { Perjalanan } from '@/api/tipe'
import { Icon } from '@/components/ui/Icon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { RUPA_STATUS_PERJALANAN } from '@/constants/label'
import type { Keputusan } from '@/features/approvals/components/ModalKeputusan'
import { rentangTanggal, rupiah, sejak } from '@/utils/format'

interface KartuPersetujuanProps {
  perjalanan: Perjalanan
  onLihatDetail: () => void
  /** Tidak diisi untuk pengajuan yang sudah diputuskan. */
  onPutuskan?: (jenis: Keputusan) => void
}

/** Kartu ringkas satu pengajuan: siapa, untuk apa, empat angka pokok, lalu aksi. */
export function KartuPersetujuan({ perjalanan: p, onLihatDetail, onPutuskan }: KartuPersetujuanProps) {
  return (
    <article className="kartu-setuju">
      <div className="kartu-setuju-head">
        <b className="angka">{p.request_number}</b>
        <StatusBadge {...RUPA_STATUS_PERJALANAN[p.status]} />
      </div>

      <div className="kartu-setuju-orang">
        <strong>{p.requester?.name ?? '—'}</strong>
        <small>
          {p.department?.name ?? '—'}
          {p.submitted_at ? ` · diajukan ${sejak(p.submitted_at)}` : ''}
        </small>
      </div>

      <p className="kartu-setuju-keperluan">{p.purpose}</p>
      {p.notes && <p className="kartu-setuju-catatan">Catatan: {p.notes}</p>}

      <dl className="kartu-setuju-isi">
        <div>
          <dt>Tujuan</dt>
          <dd>{p.destination}</dd>
        </div>
        <div>
          <dt>Tanggal · {p.duration_days} hari</dt>
          <dd>{rentangTanggal(p.departure_date, p.return_date)}</dd>
        </div>
        <div>
          <dt>Estimasi biaya</dt>
          <dd className="angka">{rupiah(p.estimated_cost)}</dd>
        </div>
        <div>
          <dt>Uang muka</dt>
          <dd className="angka">{rupiah(p.advance_requested)}</dd>
        </div>
      </dl>

      <div className="kartu-setuju-kaki">
        {onPutuskan && (
          <>
            <button type="button" className="btn sukses" onClick={() => onPutuskan('setujui')}>
              <Icon name="check" size={15} />
              Setujui
            </button>
            <button type="button" className="btn bahaya" onClick={() => onPutuskan('tolak')}>
              <Icon name="tolak" size={15} />
              Tolak
            </button>
          </>
        )}
        <button type="button" className="btn-tautan" onClick={onLihatDetail}>
          Rincian
          <Icon name="chevron" size={13} />
        </button>
      </div>
    </article>
  )
}
