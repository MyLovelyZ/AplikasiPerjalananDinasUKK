# DinasGo — Frontend Web Perjalanan Dinas

Antarmuka web portal perjalanan dinas: pengajuan, persetujuan atasan, verifikasi
anggaran, laporan biaya, pencairan dana, dan administrasi akun. Dibangun dengan
**React 19 + TypeScript + Vite** dan terhubung ke backend Laravel di
`../BackendPerjalananDinas` (Sanctum token, prefiks `/api`).

## Menjalankan

Prasyarat: Node.js 20+, serta backend Laravel yang sudah dimigrasi dan di-seed
(PHP perlu ekstensi `intl`).

```bash
# Backend
cd ../BackendPerjalananDinas
php artisan migrate --seed
php artisan serve                # http://127.0.0.1:8000

# Frontend
cp .env.example .env             # VITE_API_URL=http://127.0.0.1:8000
npm install
npm run dev
```

Akun hasil seeder (kata sandi semuanya `password`):

| Peran       | Email                          |
| ----------- | ------------------------------ |
| Super Admin | `admin@citramandiri.test`      |
| Atasan      | `supervisor@citramandiri.test` |
| Keuangan    | `finance@citramandiri.test`    |
| Pegawai     | `employee@citramandiri.test`   |

| Perintah            | Kegunaan                                   |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Dev server Vite dengan hot reload           |
| `npm run build`     | Type check (`tsc -b`) lalu build produksi   |
| `npm run typecheck` | Type check saja, tanpa build                |
| `npm run lint`      | ESLint untuk seluruh berkas `.ts` / `.tsx`  |
| `npm run preview`   | Menjalankan hasil build dari folder `dist/` |

## Alur & menu per peran

| Peran       | Menu                                                     |
| ----------- | -------------------------------------------------------- |
| Pegawai     | Dashboard, Perjalanan Saya, Laporan Biaya                |
| Atasan      | Dashboard, Persetujuan                                   |
| Keuangan    | Dashboard, Verifikasi, Pencairan, Anggaran, Laporan Keuangan |
| Super Admin | Dashboard, Pengguna, Departemen, Log Audit               |

Semua peran juga memiliki halaman **Profil** (ubah nama, telepon, foto, kata sandi).

1. Pegawai menyimpan pengajuan sebagai draf atau langsung mengajukannya ke atasan.
2. Atasan menyetujui (diteruskan ke Keuangan) atau menolak dengan alasan.
3. Keuangan memverifikasi anggaran departemen dan menetapkan uang muka; uang muka
   dibayar di menu Pencairan.
4. Setelah berangkat, pegawai mengisi laporan biaya beserta nota lalu mengajukannya.
5. Keuangan menyetujui tiap pengeluaran (penuh/sebagian/nol); selisih dengan uang
   muka menjadi reimbursement atau pengembalian. Pembayaran terakhir menyelesaikan
   perjalanan.

## Struktur Folder

```
src/
├── App.tsx            # State lintas halaman, pemilihan halaman, modal global
├── api/
│   ├── klien.ts       #   fetch + token Bearer + galat validasi 422 + unduh berkas
│   ├── endpoint.ts    #   seluruh endpoint backend di satu tempat
│   └── tipe.ts        #   bentuk respons API Resource Laravel
├── auth/              # Konteks sesi (login, logout, peran)
├── layouts/           # Sidebar (menu per peran), topbar, kerangka
├── components/ui/     # Komponen pakai-ulang: Modal, Paginasi, StatCard, Keadaan, ...
├── features/
│   ├── dashboard/     #   satu dashboard per peran
│   ├── trips/         #   daftar, formulir, dan detail perjalanan (+ panel keputusan)
│   ├── reports/       #   laporan biaya pegawai
│   ├── approvals/     #   antrean persetujuan atasan
│   ├── finance/       #   verifikasi, pencairan, anggaran, laporan keuangan
│   ├── admin/         #   pengguna, departemen, log audit
│   └── profile/
├── constants/         # Label Indonesia untuk enum backend, menu navigasi
├── hooks/             # usePermintaan, useKirim, useHalaman, useToast
└── styles/            # Stylesheet global, dipecah per lapisan
```

- Backend mengirim label berbahasa Inggris; antarmuka memakai label Indonesia dari
  `constants/label.ts` berdasarkan nilai enum.
- Unggah berkas memakai `multipart/form-data`; pembaruan berkas dikirim sebagai
  `POST` + `_method=PUT` karena PHP tidak mem-parse multipart pada `PUT`.
- Alias `@/` menunjuk ke `src/`.

### Lapisan CSS

`src/styles/index.css` mengimpor berkas berikut **berurutan** — urutan ini
menentukan cascade, jangan diacak:

| Berkas           | Isi                                                   |
| ---------------- | ----------------------------------------------------- |
| `base.css`       | Design token (`:root`), reset, tipografi dasar         |
| `layout.css`     | Sidebar, topbar, area konten                           |
| `components.css` | Elemen pakai-ulang: tombol, panel, tabel, modal, toast |
| `pages.css`      | Gaya khusus tiap halaman                               |
| `responsive.css` | Breakpoint tablet (≤1050px) dan mobile (≤760px)        |
