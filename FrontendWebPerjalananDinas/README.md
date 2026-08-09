# DinasGo — Frontend Web Perjalanan Dinas

Antarmuka web portal perjalanan dinas: pengajuan, persetujuan, pelaporan, dan
manajemen pegawai. Dibangun dengan **React 19 + TypeScript + Vite**.

> Status: prototipe UI. Seluruh data masih berupa data statis pada `src/data/`
> dan disimpan di state React — belum terhubung ke backend.

## Menjalankan

Prasyarat: Node.js 20+.

```bash
npm install     # pasang dependency
npm run dev     # jalankan dev server
```

| Perintah            | Kegunaan                                       |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Dev server Vite dengan hot reload               |
| `npm run build`     | Type check (`tsc -b`) lalu build produksi       |
| `npm run typecheck` | Type check saja, tanpa build                    |
| `npm run lint`      | ESLint untuk seluruh berkas `.ts` / `.tsx`      |
| `npm run preview`   | Menjalankan hasil build dari folder `dist/`     |

## Struktur Folder

```
src/
├── App.tsx                 # Akar aplikasi: state bersama + pemilihan halaman
├── main.tsx                # Bootstrap React ke #root
│
├── layouts/                # Kerangka tampilan
│   ├── AppLayout.tsx       #   sidebar + topbar + area konten + overlay
│   ├── Sidebar.tsx
│   └── Topbar.tsx
│
├── components/             # Komponen lintas fitur (tanpa logika bisnis)
│   ├── feedback/Toast.tsx
│   └── ui/                 #   Icon, PageHeader, PanelHeader, StatCard, StatusBadge
│
├── features/               # Satu folder per fitur/halaman
│   ├── dashboard/          #   DashboardPage + components/
│   ├── submissions/        #   SubmissionPage + components/
│   ├── trips/              #   TripsPage + components/ + tripService.ts
│   ├── approvals/          #   ApprovalsPage + components/
│   ├── reports/            #   ReportsPage + components/
│   ├── employees/          #   EmployeesPage
│   └── settings/           #   SettingsPage
│
├── data/                   # Data contoh (kelak diganti respons API)
├── constants/              # Nilai tetap aplikasi & daftar menu
├── hooks/                  # Custom hook (useToast)
├── types/                  # Tipe domain: trip, employee, navigation, icon
├── utils/                  # Helper murni tanpa ketergantungan React
└── styles/                 # Stylesheet global, dipecah per lapisan
```

### Aturan yang dipakai

- **Feature-based**: setiap halaman berdiri di foldernya sendiri. Komponen yang
  hanya dipakai satu fitur tinggal di `features/<nama>/components/`, begitu
  dipakai lebih dari satu fitur baru dipindah ke `src/components/`.
- **Logika terpisah dari tampilan**: perhitungan dan transformasi data ada di
  `tripService.ts`, komponen hanya merender.
- **Data statis terpusat** di `src/data/` sehingga penggantian ke API cukup
  menyentuh satu lapisan.
- **Alias `@/`** menunjuk ke `src/` — impor tetap pendek dan tidak memakai
  `../../`. Dikonfigurasi di `vite.config.ts` dan `tsconfig.app.json`.
- **Tipe domain** berada di `src/types/`, dipakai bersama antara data, service,
  dan komponen.

### Lapisan CSS

`src/styles/index.css` mengimpor berkas berikut **berurutan** — urutan ini
menentukan cascade, jangan diacak:

| Berkas           | Isi                                                     |
| ---------------- | ------------------------------------------------------- |
| `base.css`       | Design token (`:root`), reset, tipografi dasar           |
| `layout.css`     | Sidebar, topbar, area konten                             |
| `components.css` | Elemen pakai-ulang: tombol, panel, tabel, modal, toast   |
| `pages.css`      | Gaya khusus tiap halaman                                 |
| `responsive.css` | Breakpoint tablet (≤1050px) dan mobile (≤760px)          |

## Fitur UI

- Dashboard ringkasan perjalanan beserta akses cepat
- Pengajuan perjalanan dinas melalui modal form
- Daftar perjalanan lengkap dengan pencarian dari topbar
- Halaman persetujuan berbentuk kartu
- Laporan dengan grafik tren per bulan
- Daftar pegawai
- Pengaturan notifikasi dan bahasa
- Responsif untuk desktop, tablet, dan mobile

## Langkah Berikutnya

1. Ganti isi `src/data/` dengan pemanggilan API backend.
2. Tambahkan router (mis. React Router) bila URL per halaman dibutuhkan.
3. Sambungkan autentikasi untuk mengisi `CURRENT_USER`.
