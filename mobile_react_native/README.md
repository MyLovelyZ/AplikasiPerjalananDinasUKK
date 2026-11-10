# Travel Portal Mobile (`mobile_react_native`) — PT. Citra Mandiri

Aplikasi mobile **React Native (Expo)** khusus **Karyawan (`role: employee`)** yang selaras **100%** dengan desain (aturan warna **60–30–10**: `#DFDFDF` · `#19273A` · `#E08806`) dan kontrak API `FrontendWebPerjalananDinas` serta `BackendPerjalananDinas`.

---

## Cara Membuka di HP Fisik (Android / iOS)

### 1. Jalankan Backend Laravel di Jaringan Wi-Fi (LAN)
Pastikan laptop dan HP terhubung ke **Wi-Fi / Hotspot yang sama**, lalu jalankan server Laravel agar bisa diakses dari jaringan lokal:
```powershell
cd BackendPerjalananDinas
php artisan serve --host=0.0.0.0 --port=8000
```

### 2. Cek Alamat IP Wi-Fi Laptop Anda
Jalankan perintah berikut di PowerShell untuk melihat IPv4 Wi-Fi laptop Anda (contoh: `192.168.18.17`):
```powershell
ipconfig
```

### 3. Jalankan Aplikasi React Native (Expo)
Buka terminal baru di folder `mobile_react_native`:
```powershell
cd mobile_react_native
npm install
npx expo start --lan
```
> Jika jaringan Wi-Fi memblokir koneksi antar-perangkat, gunakan `npx expo start --tunnel`.

### 4. Buka di HP melalui Expo Go
1. Unduh aplikasi **Expo Go** di Google Play Store (Android) atau App Store (iOS).
2. Scan **QR Code** yang muncul di terminal menggunakan aplikasi Expo Go (Android) atau aplikasi Kamera (iOS).
3. Di halaman **Masuk**, jika IP Wi-Fi laptop Anda berbeda dari default, ketuk **Ubah** pada bagian **ENDPOINT API**, masukkan `http://<IP-LAPTOP-ANDA>:8000/api`, lalu ketuk **Simpan Endpoint**.

---

## Akun Contoh Karyawan (Seeder)
- **Email**: `employee@citramandiri.test`
- **Kata sandi**: `password`

