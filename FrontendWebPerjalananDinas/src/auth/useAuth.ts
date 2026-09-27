import { useContext } from 'react'

import { KonteksAuth } from '@/auth/konteks'

/** Akses identitas pengguna yang sedang masuk. */
export function useAuth() {
  const nilai = useContext(KonteksAuth)
  if (!nilai) {
    throw new Error('useAuth harus dipakai di dalam <PenyediaAuth>')
  }
  return nilai
}
