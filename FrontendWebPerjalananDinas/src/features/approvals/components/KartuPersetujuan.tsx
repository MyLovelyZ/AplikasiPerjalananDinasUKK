import { Icon } from '@/components/ui/Icon'
import type { TugasPersetujuan } from '@/api/tipe'
import type { Keputusan } from '@/features/approvals/components/ModalKeputusan'
import { manusiawi, rentangTanggal, rupiah, sejak } from '@/utils/format'

interface KartuPersetujuanProps {
  tugas: TugasPersetujuan
  onLihatDetail: () => void
  onPutuskan: (jenis: Keputusan) => void
}

/**
 * Satu pengajuan pada antrean penyetuju.
 *
 * Penanda over-budget dari langkah "Sesuai Travel Policy?" ditampilkan
 * menyolok: itulah informasi yang paling menentukan keputusan penyetuju,
 * dan menyembunyikannya di halaman detail berarti keputusan sering diambil
 * tanpa mengetahuinya.
 */
export function KartuPersetujuan({ tugas, onLihatDetail, onPutuskan }: KartuPersetujuanProps) {
  const sppd = tugas.perjalanan

  return (
    <article className={`kartu-setuju ${tugas.ada_pelanggaran_plafon ? 'perhatian' : ''}`}>
      <div className="kartu-setuju-head">
        <div>
          <b className="angka">{sppd.nomor_sppd}</b>
          <strong>{sppd.pemohon?.nama_lengkap ?? '—'}</strong>
          <small>
            {sppd.departemen?.nama ?? '—'} · diajukan {sejak(tugas.tanggal_ditugaskan)}
          </small>
        </div>
        <span className="status biru">Tahap {tugas.urutan}</span>
      </div>

      <div className="kartu-setuju-isi">
        <div className="pasangan">
          <span>Keperluan</span>
          <b style={{ maxWidth: '62%', fontWeight: 500 }}>{sppd.keperluan}</b>
        </div>
        <div className="pasangan">
          <span>Tujuan</span>
          <b>{sppd.lokasiTujuan?.nama_kota ?? sppd.tujuan_lainnya ?? '—'}</b>
        </div>
        <div className="pasangan">
          <span>Tanggal</span>
          <b>
            {rentangTanggal(sppd.tanggal_berangkat, sppd.tanggal_kembali)} ({sppd.jumlah_hari}h)
          </b>
        </div>
        <div className="pasangan">
          <span>Estimasi biaya</span>
          <b>{rupiah(sppd.estimasi_biaya)}</b>
        </div>
        <div className="pasangan">
          <span>Uang muka diminta</span>
          <b>{rupiah(sppd.uang_muka_diminta)}</b>
        </div>

        {tugas.penyetujuAsli && (
          <div className="pasangan">
            <span>Delegasi dari</span>
            <b>{tugas.penyetujuAsli.nama_lengkap}</b>
          </div>
        )}

        {tugas.ada_pelanggaran_plafon && (
          <div className="peringatan-plafon">
            <Icon name="peringatan" size={16} />
            <span>
              Ada rincian biaya di atas plafon travel policy. Periksa detailnya sebelum
              memutuskan.
            </span>
          </div>
        )}

        {sppd.catatan_pemohon && (
          <div className="pasangan" style={{ alignItems: 'flex-start' }}>
            <span>Catatan</span>
            <b style={{ maxWidth: '62%', fontWeight: 500 }}>{sppd.catatan_pemohon}</b>
          </div>
        )}

        <button
          type="button"
          className="btn-tautan"
          onClick={onLihatDetail}
          style={{ alignSelf: 'flex-start' }}
        >
          Lihat rincian lengkap
          <Icon name="chevron" size={13} />
        </button>

        <span className="sel-sekunder">Moda: {manusiawi(sppd.moda_transportasi)}</span>
      </div>

      <div className="kartu-setuju-kaki">
        <button type="button" className="btn sukses" onClick={() => onPutuskan('setujui')}>
          <Icon name="check" size={15} />
          Setujui
        </button>
        <button type="button" className="btn" onClick={() => onPutuskan('revisi')}>
          <Icon name="revisi" size={15} />
          Revisi
        </button>
        <button type="button" className="btn bahaya" onClick={() => onPutuskan('tolak')}>
          <Icon name="tolak" size={15} />
          Tolak
        </button>
      </div>
    </article>
  )
}
