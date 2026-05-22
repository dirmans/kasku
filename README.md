# KasKu

Aplikasi pencatatan keuangan pribadi modern berbasis web. Dibangun menggunakan React, TypeScript, Vite, Tailwind CSS, dan Supabase.

## Fitur Utama
- **Manajemen Transaksi**: Catat pemasukan dan pengeluaran dengan mudah.
- **Kategori Kustom**: Kustomisasi kategori dengan emoji dan tipe (pemasukan/pengeluaran).
- **Dasbor Interaktif**: Visualisasi data arus kas dan pengeluaran menggunakan Chart.js.
- **Laporan Keuangan**: Unduh ringkasan transaksi dalam format PDF (otomatis merangkum per kategori).
- **Rekap Modal & Stok**: Lacak harga beli, harga jual, kuantitas inventaris, dan estimasi profit.

## Persyaratan Sistem
Sebelum memulai, pastikan Anda telah menginstal:
- [Node.js](https://nodejs.org/) (disarankan versi 18 atau lebih baru)
- `npm` (biasanya terinstal bersama Node.js)
- Akun [Supabase](https://supabase.com/) untuk layanan *database* dan otentikasi.

## Langkah Instalasi

1. **Kloning Repositori**
   Pastikan Anda berada di dalam folder proyek setelah melakukan *clone*:
   ```bash
   git clone <url-repo-anda>
   cd kasku
   ```

2. **Instalasi Dependensi**
   Jalankan perintah berikut untuk menginstal semua kebutuhan *library*:
   ```bash
   npm install
   ```

3. **Konfigurasi Environment**
   - Salin file `.env.example` menjadi `.env.local`
     ```bash
     cp .env.example .env.local
     ```
   - Buka file `.env.local` lalu lengkapi kredensial Supabase Anda:
     ```env
     VITE_SUPABASE_URL=https://[ID-PROYEK-ANDA].supabase.co
     VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
     ```

4. **Konfigurasi Database (Supabase)**
   Aplikasi ini membutuhkan tabel khusus. Cara mengaturnya:
   - Masuk ke dashboard proyek Supabase Anda.
   - Pilih menu **SQL Editor** di panel sebelah kiri.
   - Buka file `db/database_schema.sql` yang ada di proyek ini, salin seluruh isinya.
   - Tempel (*paste*) ke dalam SQL Editor di Supabase, lalu tekan **Run**.
   - Proses ini akan otomatis membuat semua tabel (`users`, `categories`, `transactions`, `capital_records`) beserta kebijakan keamanannya (RLS).

## Menjalankan Aplikasi

Untuk menjalankan aplikasi di mode pengembangan lokal (*development*):
```bash
npm run dev
```
Aplikasi dapat langsung diakses melalui browser pada alamat yang muncul di terminal (biasanya `http://localhost:5173`).

## Panduan Perintah (Scripts)
- `npm run dev` : Menjalankan *development server*.
- `npm run build` : Membuat versi produksi (dist) yang sudah dioptimasi.
- `npm run check` : Memeriksa masalah gaya penulisan kode (*linter/formatter*) menggunakan Biome.
- `npm run format` : Memperbaiki masalah format penulisan kode secara otomatis.

*(Catatan: Proyek ini menggunakan **Husky** yang akan otomatis menjalankan pemeriksaan tipe data dan sintaks sebelum Anda melakukan `git commit` untuk memastikan proyek selalu dalam kondisi stabil).*
