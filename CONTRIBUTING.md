# 🤝 Panduan Kontribusi (Contributing Guide)

Terima kasih atas ketertarikan Anda untuk berkontribusi pada **SocialHub**! Kami menyambut baik kontribusi berupa perbaikan bug, penambahan platform baru, optimalisasi selektor Playwright, maupun peningkatan dokumentasi.

---

## 📋 Langkah Berkontribusi

1. **Fork Repositori**: Klik tombol **Fork** di pojok kanan atas halaman GitHub repositori ini.
2. **Clone ke Lokal**:
   ```bash
   git clone https://github.com/<username-anda>/socialhub.git
   cd socialhub
   ```
3. **Install Dependencies**:
   ```bash
   npm install
   npx playwright install chromium
   ```
4. **Buat Branch Fitur Baru**:
   ```bash
   git checkout -b fitur/nama-fitur-baru
   # atau
   git checkout -b fix/perbaikan-bug
   ```
5. **Lakukan Perubahan & Uji Lokal**:
   - Pastikan kode berjalan tanpa error (`npm run dashboard` atau `npm run cli`).
   - Validasi sintaks kode dengan menjalankan:
     ```bash
     node --check src/server.js src/cli.js
     ```
6. **Commit & Push**:
   ```bash
   git commit -m "feat: tambahkan fitur X"
   git push origin fitur/nama-fitur-baru
   ```
7. **Buka Pull Request**: Buka Pull Request ke branch `main` repositori utama dan jelaskan perubahan yang Anda lakukan.

---

## 🔒 Aturan Keamanan Penting

- **DILARANG KERAS** melakukan commit pada file sesi login atau cookie asli (`cookies/*.json` selain `.example.json`).
- Jangan menyertakan API Key OpenAI / custom provider dalam commit (`ai-config.json`).
- Selalu periksa `git status` sebelum melakukan `git commit` untuk memastikan tidak ada data rahasia yang terunggah.

---

## 💡 Ide Kontribusi

- Menambahkan platform baru (misal: Pinterest, Reddit, Bluesky, Mastodon).
- Peningkatan selektor DOM otomasi Playwright agar lebih tahan terhadap update tampilan platform media sosial.
- Fitur penjadwalan postingan (scheduler / cron).
- Multi-akun per platform.
