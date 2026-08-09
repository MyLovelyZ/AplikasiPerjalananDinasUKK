import type { Employee } from '@/types/employee'

/**
 * Pengguna yang sedang masuk.
 * Masih statis — nantinya diganti data dari endpoint autentikasi backend.
 */
export const CURRENT_USER: Employee = {
  name: 'Hansen Charte',
  role: 'Administrator',
  initials: 'HC',
}
