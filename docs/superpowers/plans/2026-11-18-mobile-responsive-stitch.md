# PCOSmart Mobile Responsive (Stitch MCP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengimplementasikan desain antarmuka mobile PCOSmart dari Stitch MCP ke seluruh halaman aplikasi web secara responsif (`<1024px`) tanpa mengubah satu pun fitur, integrasi backend, Google OAuth, atau Voice Recorder yang sudah berjalan.

**Architecture:** Menggunakan satu *codebase* responsif berbasis breakpoint Tailwind (`<lg` untuk mobile Stitch, `lg:` untuk desktop). Fondasi safe-area & dual mobile shell (`mobile_tab` vs `mobile_stack`) dipasang di `index.html`, `index.css`, dan `AppShell.jsx`, lalu setiap halaman dipoles komponen responsifnya dan seluruh modal diubah menjadi *Bottom Sheet* di layar mobile.

**Tech Stack:** React 19, Vite 8, Tailwind CSS v3, Material Symbols Outlined & Rounded, React Router DOM.

**Spec:** `docs/superpowers/specs/2026-11-18-mobile-responsive-stitch-design.md`

## Global Constraints
- Dilarang mengubah perilaku bisnis, kontrak Supabase (`supabase.js`), `AuthContext.jsx`, alur Google OAuth publik (`signInWithGoogle`), maupun logika perekam/transkripsi `VoiceJournalRecorder.jsx`.
- Semua perubahan visual mobile harus terisolasi pada class responsif atau elemen mobile (`lg:hidden`) agar tata letak desktop (`lg:` ke atas) tetap utuh.
- Seluruh label UI wajib berbahasa Indonesia, ramah, tanpa memicu kecemasan (PCOS-safe).
- Zero `oxlint` errors (`npm run lint`) dan zero `vite build` errors (`npm run build`) setelah setiap tugas.

## Review Focus
- Tombol bottom navigation mobile tidak boleh menutupi sticky CTA di `/checkin`, `/history?view=doctor`, atau mode `print`.
- *Safe-area* (`pt-safe`, `pb-safe`) dan lebar `<390px` (iPhone SE / Android kecil) tidak boleh menimbulkan *horizontal overflow* (`scrollWidth > innerWidth`).
- Seluruh modal (*Tugas Hari Ini*, *Detail Hari Terpilih*, *Ubah Nama*, *Hapus Akun*, *Dialog Keluar*) tetap bisa ditutup dengan *backdrop* maupun tombol batal pada layar sentuh HP.
- Voice Recorder di `CheckinPage` dan `HistoryPage` tetap bisa diklik, diputar, dan ditranskrip di lebar 360px–430px tanpa teks terpotong.
- Semua tombol *Back* pada mode `mobile_stack` (`/checkin`, `/history?view=doctor`) kembali ke rute yang tepat tanpa terjebak loop.

---

### Task 1: Fondasi Safe-Area CSS & Dual Mobile AppShell + PublicLayout

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/components/AppShell.jsx`
- Modify: `frontend/src/components/PublicLayout.jsx`

- [ ] **Step 1: Update `frontend/index.html` dan `frontend/src/index.css`**
  - Tambah `viewport-fit=cover` pada meta viewport `frontend/index.html`.
  - Tambah kelas `.pt-safe`, `.pb-safe`, `.no-scrollbar` (menyembunyikan scrollbar pada horizontal pill list), `overscroll-behavior-y: none`, dan `-webkit-tap-highlight-color: transparent` pada `frontend/src/index.css`.
- [ ] **Step 2: Upgrade `frontend/src/components/AppShell.jsx` sesuai Stitch `mobile_tab` & `mobile_stack`**
  - Gunakan `useLocation` untuk mendeteksi judul halaman aktif dan `isStackRoute` (`/checkin` atau `/history` dengan `view=doctor`).
  - Mobile Header (`lg:hidden`): pada `mobile_tab`, tampilkan label `PCOSmart`, judul halaman, shortcut notifikasi (`/chat`), dan avatar profil (`/profile`). Pada `mobile_stack`, tampilkan tombol kembali `arrow_back`, judul halaman, dan avatar profil.
  - Mobile Bottom Nav (`lg:hidden`, disembunyikan saat `isStackRoute` dan `print`): 5 slot persis Stitch Mobile (`Beranda`, `Riwayat`, Floating CTA tengah `Check-in` `-mt-5 w-14 h-14 rounded-full bg-primary`, `Asisten`, `Edukasi`).
  - Tambah `pb-safe` dan `pb-24 lg:pb-8` pada `<main>` sehingga konten tidak tertutup bottom bar.
- [ ] **Step 3: Polish `frontend/src/components/PublicLayout.jsx` untuk layar HP**
  - Tambah `pt-safe`, `pb-safe`, serta *padding* `py-4 sm:py-space-xl` di `<main>` agar halaman auth & landing terasa pas di layar ponsel tanpa *vertical bloat*.
- [ ] **Step 4: Verifikasi build & lint**
  - Jalankan `npm --prefix frontend run lint` dan `npm --prefix frontend run build`.

---

### Task 2: Penyesuaian Mobile Layar Publik, Auth & Onboarding

**Files:**
- Modify: `frontend/src/pages/LandingPage.jsx`
- Modify: `frontend/src/pages/LoginPage.jsx`
- Modify: `frontend/src/pages/RegisterPage.jsx`
- Modify: `frontend/src/pages/CheckEmailPage.jsx`
- Modify: `frontend/src/pages/SessionExpiredPage.jsx`
- Modify: `frontend/src/pages/OnboardingPage.jsx`

- [ ] **Step 1: Poles `LandingPage.jsx` sesuai *PCOSmart Mobile - Welcome & Landing***
  - Gunakan ukuran judul `text-headline-lg-mobile sm:text-headline-lg lg:text-display-lg`, *padding* kartu kompak di mobile (`p-5 sm:p-10 lg:p-12`), tambahkan *interactive affirmation touchpoint* (siklus afirmasi hangat saat diketuk), serta pastikan CTA `Daftar Akun Baru` & `Sudah Punya Akun? Masuk` nyaman dijangkau di layar mobile tanpa mengubah rute `/register` & `/login`.
- [ ] **Step 2: Poles `LoginPage.jsx`, `RegisterPage.jsx`, `CheckEmailPage.jsx`, `SessionExpiredPage.jsx`**
  - Pastikan *card padding* (`p-5 sm:p-8`), tombol Google OAuth publik (`h-12`), serta banner error State tidak overflow di layar 360px. Jaga 100% logic `signInWithPassword`, `signUp`, `signInWithGoogle`, `pageshow`, dan `oauthError`.
- [ ] **Step 3: Poles `OnboardingPage.jsx` sesuai *Onboarding 1 & 2 Mobile***
  - Rapikan *step progress header* dan kartu pilihan rentang usia (`p-4 sm:p-5 rounded-[20px]`), persetujuan privasi, serta tombol CTA `Lanjutkan` / `Selesai` (`h-12`) agar proporsional di ponsel. Jangan ubah *state* `nicknameOverride` atau `saveOnboardingProfile`.
- [ ] **Step 4: Verifikasi lint & build**
  - Jalankan `npm --prefix frontend run lint` dan `npm --prefix frontend run build`.

---

### Task 3: Penyesuaian Mobile Beranda, Check-in Harian, Voice Recorder & Asisten AI

**Files:**
- Modify: `frontend/src/pages/DashboardPage.jsx`
- Modify: `frontend/src/pages/CheckinPage.jsx`
- Modify: `frontend/src/components/VoiceJournalRecorder.jsx`
- Modify: `frontend/src/pages/ChatPage.jsx`

- [ ] **Step 1: Poles `DashboardPage.jsx` sesuai *PCOSmart Mobile - Beranda***
  - Rapikan kartu Sapaan + badge fase siklus, Banner Afirmasi Pagi, Kartu Hero Check-in dengan 3 kotak status (`Tingkat Energi`, `Suasana Hati`, `Sinyal Tubuh`), kartu Rekomendasi AI, Rangkuman Siklus, dan shortcut Edukasi dengan jarak kompak `gap-4 sm:gap-6` dan padding `p-4 sm:p-6`.
- [ ] **Step 2: Poles `CheckinPage.jsx` & `VoiceJournalRecorder.jsx` sesuai *Check-in Harian Form Mobile***
  - Pastikan kartu form 1 kolom kompak di `<sm` (`p-4 sm:p-space-lg`), skala energi & mood 5 tombol tidak meluber pada 360px (`w-11 h-11 sm:w-12 sm:h-12`), kontrol Voice Recorder tetap rapi (`flex-wrap`, tombol kontrol minimal tinggi `min-h-[40px]`), dan bungkus tombol submit `Simpan Check-in` pada bar `sticky bottom-0 z-30` yang nyaman di mobile (`mobile_stack` tanpa bottom nav). Jaga seluruh handler `VoiceJournalRecorder` & `CheckinPage` tetap utuh.
- [ ] **Step 3: Poles `ChatPage.jsx` sesuai *Asisten Obrolan Utama & Status Krisis Mobile***
  - Pastikan *quick action prompt chips* memakai `overflow-x-auto no-scrollbar` agar bebas geser di HP tanpa pecah baris aneh, bar input pesan nyaman dengan `pb-safe`, dan modal *Tugas Hari Ini* tampil sebagai **Bottom Sheet** di mobile (`items-end sm:items-center` + `rounded-t-[2rem] sm:rounded-3xl` + indikator *drag handle*). Pertahankan `crisisModeActive`, classifier, dan pesan fallback.
- [ ] **Step 4: Verifikasi lint & build**
  - Jalankan `npm --prefix frontend run lint` dan `npm --prefix frontend run build`.

---

### Task 4: Penyesuaian Mobile Riwayat & Dokter, Edukasi & Profil (Bottom Sheet Modals)

**Files:**
- Modify: `frontend/src/pages/HistoryPage.jsx`
- Modify: `frontend/src/pages/EducationPage.jsx`
- Modify: `frontend/src/pages/ProfilePage.jsx`

- [ ] **Step 1: Poles `HistoryPage.jsx` sesuai *Riwayat, Detail Hari Terpilih & Ringkasan Dokter Mobile***
  - Buat chip rentang waktu + tombol `Untuk Dokter` dapat digeser halus horizontal di `<sm` (`overflow-x-auto no-scrollbar`).
  - Ubah panel **Detail Hari Terpilih** agar tampil sebagai slide-up **Bottom Sheet** (`max-h-[90dvh] rounded-t-[2rem] sm:rounded-none`) pada layar `<md` dan tetap drawer kanan pada desktop `md+`, dengan tetap menampilkan `renderVoiceJournalPanel`.
  - Pastikan `/history?view=doctor` (termasuk `renderVoiceJournalPanel`, statistik, dan tombol cetak/share) tertata rapi 1 kolom di mobile sambil menjaga tampilan cetak A4 tetap utuh (`print:*`).
- [ ] **Step 2: Poles `EducationPage.jsx` sesuai *Daftar & Detail Artikel Edukasi Mobile***
  - Chip filter kategori (`Semua`, `Apa itu PCOS`, `Makanan`, dll. + `Tersimpan`) menggunakan *horizontal scroll* nyaman (`-mx-margin px-margin overflow-x-auto no-scrollbar`) di mobile.
  - Tata kartu katalog agar bersih di layar HP (1 kolom dengan thumbnail sejajar ala Stitch Mobile) vs 3 kolom di desktop (`lg:grid-cols-3`).
- [ ] **Step 3: Poles `ProfilePage.jsx` sesuai *Profil, Edit Nama Bottom Sheet & Hapus Akun Mobile***
  - Pastikan tab switcher tampil rapi di mobile (pill scrollable/segmented card) dan profil ringkasan atas terpusat nyaman di `<sm`.
  - Konversi seluruh modal (`isEditingName` *Ubah Nama Panggilan*, modal *Hapus Akun* ketik `HAPUS`, dan modal *Konfirmasi Keluar*) menjadi **Bottom Sheet** di mobile (`items-end sm:items-center p-0 sm:p-4`, `rounded-t-[2rem] sm:rounded-3xl`, dengan indikator handle di atas sheet pada `<sm` + `pb-safe`).
- [ ] **Step 4: Verifikasi lint & build**
  - Jalankan `npm --prefix frontend run lint` dan `npm --prefix frontend run build`.

---

### Task 5: Audit Superpowers Akhir & Verifikasi Menyeluruh

- [ ] **Step 1: Audit diff dengan subagent Code Reviewer (`requesting-code-review`)**
  - Verifikasi tidak ada fitur yang berubah/rusak (Voice Recorder, Google OAuth, Local fallback, Doctor summary, Crisis chat, JSON export) dan tidak ada `overflow-x` atau konflik `z-index` di layar mobile `375px` maupun desktop `1280px`.
- [ ] **Step 2: Verifikasi `oxlint`, `vite build`, dan rute SPA (`verify_routes.mjs`)**
  - Jalankan lint (`0 errors`), production build (`vite build`), dan cek seluruh rute + aset bundel via preview server.
- [ ] **Step 3: Update artifact `task.md`**
  - Catat penyelesaian implementasi Stitch Mobile ke dalam `task.md`.
