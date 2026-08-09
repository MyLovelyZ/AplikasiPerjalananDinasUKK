/** Mengambil maksimal dua huruf awal dari nama untuk dipakai pada avatar. */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
}
