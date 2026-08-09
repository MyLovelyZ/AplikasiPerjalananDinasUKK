import { useState, type FormEvent } from 'react'

import { Icon } from '@/components/ui/Icon'
import { EMPTY_TRIP_FORM, TRANSPORT_OPTIONS } from '@/features/trips/tripService'
import type { TripFormValues } from '@/types/trip'

interface TripFormModalProps {
  onClose: () => void
  onSubmit: (values: TripFormValues) => void
}

/**
 * Modal form pengajuan perjalanan dinas.
 * Nilai form disimpan lokal sehingga otomatis bersih setiap modal ditutup.
 */
export function TripFormModal({ onClose, onSubmit }: TripFormModalProps) {
  const [values, setValues] = useState<TripFormValues>(EMPTY_TRIP_FORM)

  const updateField = <Field extends keyof TripFormValues>(
    field: Field,
    value: TripFormValues[Field],
  ) => {
    setValues((previous) => ({ ...previous, [field]: value }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Ajukan Perjalanan Dinas"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">Pengajuan baru</p>
            <h2>Ajukan Perjalanan Dinas</h2>
          </div>
          <button type="button" className="close" aria-label="Tutup" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Tujuan Perjalanan
              <input
                required
                value={values.tujuan}
                onChange={(event) => updateField('tujuan', event.target.value)}
                placeholder="Contoh: Jakarta"
              />
            </label>
            <label>
              Transportasi
              <select
                value={values.transportasi}
                onChange={(event) => updateField('transportasi', event.target.value)}
              >
                {TRANSPORT_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label>
              Tanggal Berangkat
              <input
                required
                type="date"
                value={values.mulai}
                onChange={(event) => updateField('mulai', event.target.value)}
              />
            </label>
            <label>
              Tanggal Kembali
              <input
                required
                type="date"
                value={values.selesai}
                onChange={(event) => updateField('selesai', event.target.value)}
              />
            </label>
            <label className="full">
              Kegiatan / Keperluan
              <textarea
                required
                rows={3}
                value={values.kegiatan}
                onChange={(event) => updateField('kegiatan', event.target.value)}
                placeholder="Jelaskan tujuan dan kegiatan perjalanan..."
              />
            </label>
            <label className="full">
              Catatan Tambahan
              <textarea
                rows={2}
                value={values.catatan}
                onChange={(event) => updateField('catatan', event.target.value)}
                placeholder="Opsional"
              />
            </label>
          </div>

          <div className="modal-foot">
            <button type="button" className="outline" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="primary">
              Kirim Pengajuan <Icon name="arrow" size={17} />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
