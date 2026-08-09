import { Icon } from '@/components/ui/Icon'

interface SubmissionGuideProps {
  onStart: () => void
}

/** Panel ajakan memulai pengajuan ketika belum ada draf yang dibuka. */
export function SubmissionGuide({ onStart }: SubmissionGuideProps) {
  return (
    <div className="panel empty-guide">
      <div className="guide-icon">
        <Icon name="plane" size={28} />
      </div>
      <h2>Mulai pengajuan perjalanan dinas</h2>
      <p>
        Isi tujuan, tanggal, kegiatan, transportasi, dan informasi pendukung. Data dapat
        dilanjutkan ke proses persetujuan setelah dikirim.
      </p>
      <button type="button" className="primary" onClick={onStart}>
        Mulai Sekarang <Icon name="arrow" size={17} />
      </button>
    </div>
  )
}
