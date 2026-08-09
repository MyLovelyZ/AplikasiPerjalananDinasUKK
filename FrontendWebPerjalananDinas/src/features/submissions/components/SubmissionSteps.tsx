import { Fragment } from 'react'

const SUBMISSION_STEPS = ['Data Perjalanan', 'Anggaran', 'Review & Kirim']

interface SubmissionStepsProps {
  /** Indeks langkah yang sedang aktif (mulai dari 0). */
  currentStep?: number
}

/** Indikator tahapan pengajuan perjalanan dinas. */
export function SubmissionSteps({ currentStep = 0 }: SubmissionStepsProps) {
  return (
    <div className="form-intro">
      {SUBMISSION_STEPS.map((label, index) => (
        <Fragment key={label}>
          {index > 0 && <div className="line"></div>}
          <div className={index <= currentStep ? 'step done' : 'step'}>
            <span>{index + 1}</span>
            <b>{label}</b>
          </div>
        </Fragment>
      ))}
    </div>
  )
}
