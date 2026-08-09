import { useCallback, useEffect, useRef, useState } from 'react'

import { TOAST_DURATION_MS } from '@/constants/app'

/**
 * Mengelola satu pesan toast yang hilang otomatis.
 * Timer sebelumnya selalu dibatalkan agar pesan baru mendapat durasi penuh.
 */
export function useToast() {
  const [message, setMessage] = useState('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const notify = useCallback(
    (text: string) => {
      clearTimer()
      setMessage(text)
      timeoutRef.current = setTimeout(() => setMessage(''), TOAST_DURATION_MS)
    },
    [clearTimer],
  )

  useEffect(() => clearTimer, [clearTimer])

  return { message, notify }
}
