# Desain Implementasi Tampilan Mobile PCOSmart (Stitch Mobile Responsive)

**Status**: Disetujui Pengguna  
**Referensi Desain**: Google Stitch Project `projects/10694131672610044016` (31 layar `PCOSmart Mobile`, `width: 780`, `deviceType: MOBILE`)

## 1. Tujuan & Batasan (Non-Negotiable Constraints)
- Menyesuaikan seluruh rute aplikasi web **PCOSmart** di layar `<1024px` (mobile & tablet portrait) agar mengikuti tata letak, tipografi, *bottom navigation*, *mobile stack header*, dan *bottom sheet* dari desain *PCOSmart Mobile* di Stitch.
- Mempertahankan **100% fitur, alur bisnis, *state management*, dan integrasi backend yang sudah diperbaiki**, termasuk:
  - Voice Recorder & Transkripsi Suara (`VoiceJournalRecorder`, `CheckinPage`, `HistoryPage`, Gemini 3.5 Flash)
  - Google OAuth Publik (`signInWithGoogle`, `AuthContext`, `LoginPage`, `RegisterPage`, `OnboardingPage`)
  - Dual-Mode Supabase Cloud & Local Fallback (`localBackend.js`)
  - Crisis & Safety Classifier (`ChatPage`), Ekspor JSON (`ProfilePage`), Cetak A4 Ringkasan Dokter (`HistoryPage`), serta Pustaka Edukasi (`EducationPage`).
- Mempertahankan tampilan Desktop (`>=1024px` / `lg+`) tetap konsisten dengan implementasi sebelumnya.

## 2. Arsitektur Pendekatan
**Pendekatan yang Dipilih: Satu *Codebase* Responsif Adaptif Berbasis `AppShell` + Utilitas Tailwind Mobile-First**
- Menghindari duplikasi file halaman terpisah (`*Mobile.jsx`) agar logika bisnis, *form validation*, *error handling*, dan integrasi API tidak pernah menyimpang antar ukuran layar.
- Mengabstraksi logika *mobile shell* di `AppShell.jsx` dan `PublicLayout.jsx` sesuai spesifikasi `shell-type` Stitch (`mobile_tab` vs `mobile_stack`).

## 3. Rincian Desain Sistem & Layar Mobile
1. **Viewport & CSS Foundation (`index.html`, `index.css`)**:
   - Tambahkan `viewport-fit=cover` pada `<meta name="viewport">`.
   - Tambahkan kelas `.pt-safe`, `.pb-safe`, `.no-scrollbar`, `overscroll-behavior-y: none`, dan `-webkit-tap-highlight-color: transparent` di `index.css`.
2. **AppShell Dual Mobile Navigation (`AppShell.jsx`)**:
   - **Deteksi Rute Dinamis**:
     - `mobile_tab`: `/dashboard`, `/history` (non-doctor), `/chat`, `/education` (katalog), `/profile`.
     - `mobile_stack`: `/checkin`, `/history?view=doctor`, dan mode baca detail artikel (dideteksi dari query/pathname atau props).
   - **Mobile Top Header (`lg:hidden`)**:
     - Mode `mobile_tab`: Overline `PCOSMART`, judul rute aktif (`Beranda`, `Riwayat & Wawasan`, `Asisten AI`, `Edukasi PCOS`, `Profil Akun`), tombol cepat Notifikasi/Asisten, dan avatar pengguna menuju `/profile`.
     - Mode `mobile_stack`: Tombol `arrow_back` (`w-11 h-11`) memanggil `navigate(-1)` atau kembali ke rute induk, judul layar aktif, dan avatar pengguna.
   - **Mobile Bottom Navigation (`lg:hidden`, hanya tampil di `mobile_tab`)**:
     - Tepat 5 slot seperti Stitch Mobile: `Beranda` (`/dashboard`), `Riwayat` (`/history`), tombol tengah melayang (`-mt-5 w-14 h-14 rounded-full bg-primary text-on-primary shadow-[0_8px_20px_rgba(84,48,156,0.35)]`) menuju `/checkin`, `Asisten` (`/chat`), `Edukasi` (`/education`).
     - Saat `print` atau mode `mobile_stack`, bottom nav disembunyikan (`hidden` / `print:hidden`).
3. **Public & Auth Screens (`PublicLayout`, `LandingPage`, `LoginPage`, `RegisterPage`, `CheckEmailPage`, `SessionExpiredPage`, `OnboardingPage`)**:
   - Menyesuaikan *padding* mobile (`px-margin`, `p-5 sm:p-10`), ukuran *heading* `text-headline-lg-mobile lg:text-display-lg`, tombol aksi penuh `h-12`, serta kartu afirmasi interaktif dan *step progress* ramping di `OnboardingPage` untuk layar `<640px`.
4. **Halaman Terautentikasi (`DashboardPage`, `CheckinPage`, `VoiceJournalRecorder`, `ChatPage`, `HistoryPage`, `EducationPage`, `ProfilePage`)**:
   - **DashboardPage**: Hero Check-in ringkas dengan 3 kotak mini (`Energi`, `Mood`, `Tubuh`), kartu Rekomendasi AI, Rangkuman Siklus, dan kartu Edukasi tersusun rapi satu kolom di mobile (`gap-4`).
   - **CheckinPage + VoiceJournalRecorder**: Kartu satu kolom compact di mobile + *sticky bottom bar* di `<lg` dengan CTA `Simpan Check-in` (`h-12`) & badge enkripsi.
   - **ChatPage**: Header konteks + *quick action chips* horizontal (`overflow-x-auto no-scrollbar`), modal `Tugas Hari Ini` menggunakan gaya **Bottom Sheet** di mobile (`items-end sm:items-center rounded-t-[2rem] sm:rounded-3xl`).
   - **HistoryPage**: Chip periode horizontal, tombol cepat `Untuk Dokter`, panel **Detail Hari Terpilih** memakai slide-up Bottom Sheet di mobile dan slide-over kanan di desktop, serta tata letak 1 kolom rapi di `/history?view=doctor`.
   - **EducationPage**: Filter kategori geser horizontal (`-mx-margin px-margin overflow-x-auto no-scrollbar`), kartu daftar artikel kompak dengan thumbnail `w-20 h-20` di mobile, dan *sticky bottom* bacaan pada mode Detail Artikel.
   - **ProfilePage**: Kartu ringkasan profil terpusat di mobile, navigasi tab ringkas di atas untuk `<lg`, dan seluruh modal (*Ubah Nama Panggilan*, *Hapus Akun*, *Dialog Keluar*) memakai **Bottom Sheet** responsif (`items-end sm:items-center rounded-t-[2rem] sm:rounded-3xl` + *drag handle*).
