import type { Perjalanan } from '@/api/tipe'
import { Icon } from '@/components/ui/Icon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LABEL_TRANSPORTASI, RUPA_STATUS_PERJALANAN } from '@/constants/label'
import type { Keputusan } from '@/features/approvals/components/ModalKeputusan'
import { rentangTanggal, rupiah, sejak } from '@/utils/format'

interface KartuPersetujuanProps {
  perjalanan: Perjalanan
  onLihatDetail: () => void
  /** Tidak diisi untuk pengajuan yang sudah diputuskan. */
  onPutuskan?: (jenis: Keputusan) => void
}

export function KartuPersetujuan({ perjalanan: p, onLihatDetail, onPutuskan }: KartuPersetujuanProps) {
  return (
    <article className="kartu-setuju">
      <div className="kartu-setuju-head">
        <div>
          <b className="angka">{p.request_number}</b>
          <strong>{p.requester?.name ?? '—'}</strong>
          <small>
            {p.department?.name ?? '—'}
            {p.submitted_at ? ` · diajukan ${sejak(p.submitted_at)}` : ''}
          </small>
        </div>
        <StatusBadge {...RUPA_STATUS_PERJALANAN[p.status]} />
      </div>

      <div className="kartu-setuju-isi">
        <div className="pasangan">
          <span>Keperluan</span>
          <b style={{ maxWidth: '62%', fontWeight: 500 }}>{p.purpose}</b>
        </div>
        <div className="pasangan">
          <span>Tujuan</span>
          <b>{p.destination}</b>
        </div>
        <div className="pasangan">
          <span>Tanggal</span>
          <b>
            {rentangTanggal(p.departure_date, p.return_date)} ({p.duration_days} hari)
          </b>
        </div>
        <div className="pasangan">
          <span>Estimasi biaya</span>
          <b>{rupiah(p.estimated_cost)}</b>
        </div>
        <div className="pasangan">
          <span>Uang muka diminta</span>
          <b>{rupiah(p.advance_requested)}</b>
        </div>
        {p.notes && (
          <div className="pasangan" style={{ alignItems: 'flex-start' }}>
            <span>Catatan</span>
            <b style={{ maxWidth: '62%', fontWeight: 500 }}>{p.notes}</b>
          </div>
        )}

        <button type="button" className="btn-tautan" onClick={onLihatDetail} style={{ alignSelf: 'flex-start' }}>
          Lihat rincian lengkap
          <Icon name="chevron" size={13} />
        </button>

        <span className="sel-sekunder">Transportasi: {LABEL_TRANSPORTASI[p.transportation]}</span>
      </div>

      {onPutuskan && (
        <div className="kartu-setuju-kaki">
          <button type="button" className="btn sukses" onClick={() => onPutuskan('setujui')}>
            <Icon name="check" size={15} />
            Setujui
          </button>
          <button type="button" className="btn bahaya" onClick={() => onPutuskan('tolak')}>
            <Icon name="tolak" size={15} />
            Tolak
          </button>
        </div>
      )}
    </article>
  )
}
