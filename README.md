# 🚀 SocialHub - Multi-Platform Social Media Publisher (Cookie-Based)

[![CI](https://github.com/webmestudio/socialhub/actions/workflows/ci.yml/badge.svg)](https://github.com/webmestudio/socialhub/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Playwright](https://img.shields.io/badge/Automated%20with-Playwright-45ba4b.svg)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

Sistem otomasi publikasi konten serentak ke berbagai media sosial: **Threads**, **X (Twitter)**, **Facebook (Pribadi & Page)**, **LinkedIn**, **Instagram**, **TikTok**, dan **YouTube** menggunakan sesi cookie browser tanpa biaya API resmi atau proses review developer yang rumit.

Dilengkapi dengan **Web Dashboard interaktif** lokal dan **CLI tool** yang ringan dan cepat.

---

## 🔒 Keamanan & Privasi Akun (Security Notice)

> **PENTING:** Repositori ini telah dikonfigurasi dengan `.gitignore` ketat untuk menjaga keamanan akun Anda:
> - Seluruh file cookie asli (`cookies/*.json`) **DIBLOKIR** dari Git tracking dan tidak akan pernah terunggah ke GitHub publik.
> - File konfigurasi API Key (`ai-config.json`) dan riwayat lokal (`history.json`) juga otomatis diabaikan oleh Git.
> - Repositori hanya menyertakan template contoh (`*.example.json`) untuk panduan format.

---

## 📥 Instalasi & Setup Cepat

### 1. Clone Repositori
```bash
git clone https://github.com/webmestudio/socialhub.git
cd socialhub
```

### 2. Install Dependensi & Browser
Pastikan Anda sudah menginstal **Node.js (versi 18 ke atas)**:
```bash
npm install
npx playwright install chromium
```

---

## 🌟 Fitur Utama

- **Multi-Platform Support**:
  - 🧵 **Threads**: Otomasi pembuatan thread teks, link, dan lampiran gambar/video.
  - 𝕏 **X (Twitter)**: Tweet status dengan link dan lampiran media.
  - 👤 **Facebook Pribadi**: Posting feed status profil pribadi.
  - 📄 **Facebook Page**: Otomasi switch profil dan posting status/media ke Halaman Bisnis (Facebook Page).
  - 💼 **LinkedIn**: Posting status profesional, artikel, tautan, dan lampiran foto/video.
  - 📸 **Instagram**: Posting foto/video ke feed (Crop -> Filter -> Caption -> Share).
  - 🎵 **TikTok**: Upload video/media melalui TikTok Studio web uploader.
  - ▶️ **YouTube**: Upload video / YouTube Shorts otomatis melalui YouTube Studio web.
- **✨ AI Creator Studio (Default Bebas Kuota & Custom API)**:
  - 🔄 **Pilihan Provider Fleksibel**:
    - **Default (Pollinations AI)**: Gratis 100%, bebas kuota, tanpa API key (bawaan).
    - **Custom API (OpenAI-Compatible)**: Hubungkan API Key Anda sendiri (OpenAI, Groq, OpenRouter, DeepSeek, atau Ollama lokal) lengkap dengan tombol tes koneksi langsung dari dashboard.
  - ✍️ **AI Text Generator**: Otomasi pembuatan status/caption media sosial (pilihan nada santai, programmer/anak IT, tech lead, profesional, edukatif, humor, promosi, lengkap dengan emoji & hashtag).
  - 🎨 **AI Image Generator (Flux & DALL-E)**: Otomasi pembuatan gambar visual berkualitas tinggi (Photorealistic, 3D Render, Anime, Vector, Cyberpunk, Developer Desk dalam rasio 1:1, 9:16, 16:9).
  - ⚡ **Paket AI Lengkap**: Sekali klik langsung membuat teks dan mendesain gambar yang serasi lalu otomatis memasangnya di form postingan!
- **Dukungan Media & Tautan**:
  - Lampirkan foto & video (JPG, PNG, GIF, MP4, WebM hingga 100MB).
  - Smart link handling dengan pembuatan rich link preview otomatis.
- **Web Dashboard Interaktif** (`http://localhost:3456`):
  - Terbagi menjadi dua mode jelas: **Mode Teks & Status** dan **Mode Media Visual (Wajib Media)**.
  - Manajemen cookie visual (pasang/update JSON cookie langsung dari UI).
  - Riwayat postingan (History) real-time.
- **One-Click Launchers (Windows)**:
  - `Buka Dashboard.bat`: Membuka server dan web dashboard di browser.
  - `CEK_COOKIE.bat`: Memeriksa status masa aktif dan verifikasi login sesi cookie langsung dari terminal.
  - `POSTING.bat`: Prompt interaktif untuk posting teks/status cepat (Threads, Twitter, Facebook, LinkedIn).
  - `POSTING_MEDIA.bat`: Prompt interaktif untuk posting foto/video (Instagram, TikTok, YouTube, dll).

---

## 📁 Struktur Folder

```text
socialhub/
├── .github/
│   ├── workflows/ci.yml       <-- Otomasi CI GitHub Actions
│   └── ISSUE_TEMPLATE/        <-- Template issue & bug report
├── cookies/                   <-- File sesi cookie login (JSON)
│   ├── .gitkeep
│   ├── threads.example.json
│   ├── twitter.example.json
│   ├── facebook.example.json
│   ├── linkedin.example.json
│   ├── instagram.example.json
│   ├── tiktok.example.json
│   └── youtube.example.json
├── public/
│   └── index.html             <-- Web Dashboard UI lokal (dilengkapi tombol Tes Cookie)
├── src/
│   ├── platforms/
│   │   ├── threads.js         <-- Otomasi Threads
│   │   ├── twitter.js         <-- Otomasi X / Twitter
│   │   ├── facebook.js        <-- Otomasi Facebook Pribadi
│   │   ├── facebook-page.js   <-- Otomasi Facebook Page
│   │   ├── linkedin.js        <-- Otomasi LinkedIn Feed
│   │   ├── instagram.js       <-- Otomasi Instagram Feed
│   │   ├── tiktok.js          <-- Otomasi TikTok Studio
│   │   └── youtube.js         <-- Otomasi YouTube Studio Video Upload
│   ├── utils/
│   │   ├── ai-helper.js       <-- Integrasi Pollinations AI & OpenAI API
│   │   ├── cookie-checker.js  <-- Pemeriksa masa aktif & verifikasi login Playwright
│   │   └── cookie-helper.js   <-- Normalisasi format cookie Playwright
│   ├── server.js              <-- Backend Express API & static server
│   └── cli.js                 <-- CLI script
├── uploads/                   <-- Folder penampung media yang diunggah
├── .env.example               <-- Contoh environment variables
├── .gitignore                 <-- Pengabaian file kredensial & node_modules
├── ai-config.example.json     <-- Template konfigurasi AI
├── Buka Dashboard.bat         <-- Launcher Dashboard Web
├── CEK_COOKIE.bat             <-- Launcher Pemeriksa Status Cookie
├── POSTING.bat                <-- Launcher posting teks (Threads, X, FB, LinkedIn)
├── POSTING_MEDIA.bat          <-- Launcher posting foto/video (Instagram, TikTok, YouTube, dll)
├── package.json
├── LICENSE                    <-- Lisensi open-source (MIT)
└── README.md
```

---

## 🛠️ Panduan Menyiapkan Cookie Akun

Otomasi ini menggunakan cookie sesi dari browser Anda.

1. Install ekstensi browser **Cookie-Editor** ([Chrome Web Store](https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm) / [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/cookie-editor/)).
2. Buka tab situs masing-masing platform dan pastikan akun Anda sudah login:
   - Threads: `threads.net`
   - Twitter / X: `x.com`
   - Facebook: `facebook.com`
   - LinkedIn: `linkedin.com`
   - Instagram: `instagram.com`
   - TikTok: `tiktok.com`
   - YouTube: `studio.youtube.com`
3. Klik ikon ekstensi **Cookie-Editor** -> klik **Export** -> pilih **Export as JSON**.
4. Pasang cookie dengan salah satu cara berikut:
   - **Lewat Web Dashboard (Paling Mudah)**: Buka dashboard di `http://localhost:3456`, pada panel *Manajemen Cookie*, klik tombol **+ Pasang / Update**, lalu paste JSON dan simpan. Anda bisa langsung klik tombol **🔍 Tes** untuk menguji apakah sesi berhasil login!
   - **Lewat File Manual**: Simpan langsung ke folder `cookies/` dengan nama:
     - `cookies/threads.json`
     - `cookies/twitter.json`
     - `cookies/facebook.json`
     - `cookies/linkedin.json`
     - `cookies/instagram.json`
     - `cookies/tiktok.json`
     - `cookies/youtube.json`

*(Catatan: Cookie Facebook otomatis mencakup akses ke Facebook Page yang Anda kelola).*

---

## 🔍 Pemeriksaan Status & Validitas Cookie

Anda dapat memeriksa apakah cookie masih aktif, mendekati kedaluwarsa, atau sudah expired tanpa harus melakukan posting terlebih dahulu:

### Cara 1: Lewat Web Dashboard
- Buka dashboard di `http://localhost:3456`.
- Pada panel **🔑 Manajemen Cookie**, status masa berlaku cookie ditampilkan secara otomatis di samping setiap platform.
- Klik tombol **🔍 Tes** pada akun tertentu untuk melakukan verifikasi login browser secara langsung.
- Klik tombol **🧪 Tes Semua Cookie** di header card untuk menguji seluruh akun sekaligus.

### Cara 2: Lewat Launcher Windows
Klik ganda file:
```
CEK_COOKIE.bat
```
Pilih opsi **[1] Pengecekan Cepat** (instan) atau **[2] Pengecekan Live Browser** (uji login Playwright).

### Cara 3: Lewat CLI Terminal
```bash
# Pengecekan masa aktif dan kelengkapan cookie (instan):
node src/cli.js --check-cookies

# Pengecekan live browser (menguji apakah sesi login masih valid):
node src/cli.js --check-cookies --live

# Pengecekan hanya untuk platform tertentu:
node src/cli.js --check-cookies --platforms twitter,threads --live
```

---

## 🚀 Cara Menjalankan

### Cara 1: Menggunakan Web Dashboard (Rekomendasi)
Klik ganda file:
```
Buka Dashboard.bat
```
Atau jalankan server secara manual:
```bash
npm run dashboard
# atau: node src/server.js
```
Akses di browser Anda: **`http://localhost:3456`**

### Cara 2: Menggunakan CLI (Command Line Interface)
Jalankan perintah langsung di terminal:

```bash
# Posting teks ke semua platform teks yang aktif cookienya
node src/cli.js --text "Halo semua dari SocialHub!"

# Menggunakan AI untuk generate teks otomatis:
node src/cli.js --ai-text "5 tips produktivitas kerja remote" --platforms threads,linkedin

# Menggunakan AI untuk generate gambar & teks paket lengkap serentak:
node src/cli.js --ai-bundle "Tips memilih laptop programmer pemula" --platforms threads,instagram,linkedin

# Posting dengan lampiran media gambar / video
node src/cli.js --text "Video update terbaru" --media "path/video.mp4"

# Posting hanya ke platform tertentu
node src/cli.js --text "Postingan khusus" --media "path/video.mp4" --platforms instagram,tiktok,youtube

# Posting dengan link dan mode browser terlihat (bukan headless)
node src/cli.js --text "Cek artikel terbaru kami" --link "https://contoh.com" --visible
```

#### Parameter CLI:
- `--text`, `-t` : Konten teks postingan atau caption/judul.
- `--ai-text`    : Generate teks postingan otomatis dengan AI berdasarkan topik.
- `--ai-image`   : Generate gambar visual otomatis dengan AI berdasarkan prompt.
- `--ai-bundle`  : Generate teks dan gambar serasi sekaligus dalam 1 perintah.
- `--check-cookies`, `-c`: Memeriksa kelengkapan dan masa berlaku cookie sesi.
- `--live`       : Mengaktifkan pengujian login nyata ke browser Playwright saat cek cookie.
- `--link`, `-l` : Tautan / URL yang ingin dilampirkan.
- `--media`, `-m`: Path file gambar atau video lokal.
- `--platforms`, `-p`: Daftar platform yang dituju dipisahkan koma (`threads`, `twitter`, `facebook`, `facebook_page`, `linkedin`, `instagram`, `tiktok`, `youtube`).
- `--visible`, `--no-headless`: Menampilkan jendela browser saat proses automasi berjalan.
- `--link`, `-l` : Tautan / URL yang ingin dilampirkan.
- `--media`, `-m`: Path file gambar atau video lokal.
- `--platforms`, `-p`: Daftar platform yang dituju dipisahkan koma (`threads`, `twitter`, `facebook`, `facebook_page`, `linkedin`, `instagram`, `tiktok`, `youtube`).
- `--visible`, `--no-headless`: Menampilkan jendela browser saat proses automasi berjalan.

---

## 📌 Catatan Teknis Media & Format

1. **Instagram, TikTok & YouTube**:
   - Web uploader platform ini **mewajibkan adanya file media**. 
   - YouTube Studio mewajibkan file bertipe video (`.mp4`, `.mov`, `.webm`, dll).
2. **Facebook Page**:
   - Untuk memposting sebagai Halaman/Page, pastikan profil Facebook yang diekspor cookienya memiliki hak akses admin ke Halaman tersebut.
3. **Browser Engine**:
   - Menggunakan Playwright dengan deteksi otomatis Microsoft Edge bawaan Windows (`channel: 'msedge'`) atau Chromium standar.

---

## 🤝 Kontribusi

Kontribusi selalu terbuka! Silakan baca [Panduan Kontribusi](CONTRIBUTING.md) untuk detail alur pembuatan Pull Request dan aturan pengembangan.

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah lisensi MIT - lihat file [LICENSE](LICENSE) untuk detail lengkap.
