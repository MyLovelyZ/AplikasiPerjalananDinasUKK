import { Icon } from '@/components/ui/Icon'

interface ToastProps {
  message: string
}

/** Notifikasi ringkas di pojok kanan bawah layar. */
export function Toast({ message }: ToastProps) {
  return (
    <div className="toast" role="status" aria-live="polite">
      <Icon name="check" size={18} />
      {message}
    </div>
  )
}
