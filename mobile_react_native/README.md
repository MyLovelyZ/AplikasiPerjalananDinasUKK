# Aplikasi Mobile Perjalanan Dinas (React Native) — PT. Citra Mandiri

Aplikasi mobile perjalanan dinas berbasis **React Native + Expo**, dirancang sesuai spesifikasi dokumen **Proposal Perencanaan Perjalanan Dinas (Web & Mobile)** dan mockup desain **Figma**.

---

## 🎨 Desain Sesuai Figma ("Project Setup")

- **Main Colour**: `#E8ECEF` (Latar belakang modern dan bersih)
- **Secondary**: `#0C2340` (Navy gelap elegan untuk tombol, lingkaran dekoratif, dan header)
- **Third / Accent**: `#DE8B0E` (Kuning mustard/emas untuk kartu utama, aksen, dan lencana)
- **Dekorasi**: Lingkaran navy besar di sudut kanan-atas dan kiri-bawah.
- **Card**: Kartu rounded warna emas dengan input pill putih dan tombol aksi rounded pill.

---

## 📱 Fitur yang Disediakan (Sesuai Proposal PDF)

1. **Autentikasi (Login & Register)**:
   - Tampilan persis mockup Figma.
   - Pilihan akun cepat uji coba (Admin, Atasan, Keuangan, Pegawai) dengan sandi `password`.
   - Pengaturan IP backend dinamis agar bisa dijalankan di HP fisik maupun Emulator.
2. **Dashboard Pegawai**:
   - Ringkasan status SPPD (Menunggu, Disetujui, Berjalan, Selesai).
   - Profil pegawai dan departemen.
   - Daftar perjalanan dinas terkini.
3. **Modul Pengajuan (Request SPPD)**:
   - Formulir digital: Kota tujuan, tanggal berangkat & kembali, keperluan dinas, agenda.
   - Pemilihan moda transportasi (Pesawat, Kereta, Mobil Dinas, dsb).
   - Estimasi biaya (Transport, Hotel, Uang Saku) & permohonan uang muka (*advance*).
4. **Riwayat & Pencarian SPPD**:
   - Pencarian berdasarkan kota tujuan atau nomor pengajuan.
   - Status transparan (*real-time*).
5. **Detail Perjalanan & Persetujuan**:
   - Rincian estimasi biaya dan uang muka yang disetujui.
   - Alur persetujuan bertingkat (*workflow approval*).
   - Tombol **Setujui** dan **Tolak** langsung dari aplikasi mobile bagi Atasan/Supervisor.
6. **Pelaporan & Real Cost (LPJ)**:
   - Rincian realisasi pengeluaran dan perhitungan selisih lebih/kurang bayar uang muka.

---

## 🚀 Cara Menjalankan

### Prasyarat
- Node.js versi 18+ atau 20+
- Aplikasi **Expo Go** di HP Android / iOS (bisa diunduh gratis di Play Store / App Store)

### Langkah Menjalankan:

1. **Buka terminal dan masuk ke folder:**
   ```bash
   cd mobile_react_native
   ```

2. **Pasang dependensi (jika belum):**
   ```bash
   npm install
   ```

3. **Jalankan Expo Dev Server:**
   ```bash
   npx expo start
   ```

4. **Buka di Perangkat Anda:**
   - **Di HP Fisik:** Buka aplikasi **Expo Go**, lalu scan QR code yang muncul di terminal (pastikan HP dan laptop terhubung ke Wi-Fi yang sama).
   - **Di Browser (Web):** Tekan tombol **`w`** di terminal untuk melihat tampilan mobile di browser laptop.
   - **Di Emulator Android:** Tekan tombol **`a`** di terminal.
