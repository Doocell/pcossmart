# Desain Fitur Snap and Score Meal Analyzer (Terintegrasi di Asisten PCOSmart)

**Status**: Draf Menunggu Persetujuan Pengguna  
**Tanggal**: 2026-11-19  
**Pendekatan**: Opsi 1 — Ringan & Privasi-Utama (Analisis via Edge Function `chat`, riwayat disimpan sebagai kartu terstruktur + ringkasan menu di `chat_messages` tanpa Storage foto permanen)

---

## 1. Tujuan & Alasan (*Intent & Why*)
- **Masalah yang Diselesaikan**: Pengguna PCOS sering bingung menilai makanan harian mereka di dunia nyata (nasi campur, camilan, minuman manis, dsb.) terkait dampaknya pada lonjakan gula darah dan resistensi insulin, sementara pendekatan kalori ketat justru mudah memicu stres dan lonjakan kortisol.
- **Tujuan Fitur**: Memungkinkan pengguna memotret atau mengunggah foto makanan langsung di halaman **Asisten** (`/chat`), lalu AI (`gemini-3.5-flash-lite`) mengenali komposisi makanan, memperkirakan **Skor Ramah PCOS (0–100)** berbasis perkiraan **Indeks Glikemik (Rendah / Sedang / Tinggi)**, dan memberikan saran penyeimbang lembut sesuai prinsip *Piring Seimbang* — **tanpa menambah tombol/tab navigasi baru** di sidebar maupun *bottom bar* mobile.
- **Kesinambungan Percakapan**: Karena berada langsung di dalam **Asisten**, hasil analisis & ringkasan menu tersimpan ke riwayat `chat_messages` sehingga pengguna tetap bisa bertanya lanjutan (misalnya *"kalau nasinya diganti setengah porsi bagaimana?"*) dan mendapat jawaban dengan konteks makanan + data check-in harian.

## 2. Batasan Cakupan (*Goals, Non-Goals, Anti-Goals*)
- **Goals**:
  1. Unggah/kamera foto makanan langsung dari composer chat di [ChatPage.jsx](file:///d:/SEMESTER%205/PEM%20WEB/PCOS%20SETUP/frontend/src/pages/ChatPage.jsx) pada tampilan Web & Mobile, lengkap dengan preview sebelum kirim dan catatan teks opsional.
  2. Kompresi gambar otomatis di sisi browser sebelum diunggah (resize maks sisi terpanjang `1024px`, JPEG quality `0.8`) untuk menjaga latensi tetap cepat dan hemat token.
  3. Endpoint backend terpusat di Supabase Edge Function [chat/index.ts](file:///d:/SEMESTER%205/PEM%20WEB/PCOS%20SETUP/supabase/functions/chat/index.ts) dengan `mode: "meal_analysis"` memakai model `gemini-3.5-flash-lite` + `responseMimeType: "application/json"`.
  4. Kartu hasil analisis terstruktur (**Meal Score Card**) berisi: nama hidangan, skor ramah PCOS `0–100`, kategori IG (`rendah` | `sedang` | `tinggi`), komponen makanan terdeteksi, dampak glikemik singkat, saran penyeimbang *Piring Seimbang* (1–2 poin), dan disclaimer edukatif.
  5. Penanganan ramah ketika foto bukan makanan atau terlalu buram (`is_food: false`) tanpa memaksakan skor asal-asalan.
  6. Penyimpanan riwayat percakapan & kartu skor pada kolom `content` dan `meta jsonb` tabel `chat_messages`.
- **Non-Goals**:
  1. Tidak menyimpan file foto asli ke Supabase Storage (tidak muncul thumbnail foto asli lagi setelah halaman di-refresh).
  2. Tidak menambah tabel Postgres baru ataupun menambah metrik nutrisi ke [HistoryPage.jsx](file:///d:/SEMESTER%205/PEM%20WEB/PCOS%20SETUP/frontend/src/pages/HistoryPage.jsx) dan laporan dokter A4.
  3. Tidak menghitung atau menampilkan target kalori harian/makro gram ketat.
- **Anti-Goals**:
  1. **Keamanan Kunci API**: Kunci `GEMINI_API_KEY` tidak boleh terekspos ke bundle produksi Vite (seluruh panggilan AI produksi harus melalui Edge Function `chat`).
  2. **Batasan Medis**: Skor harus eksplisit dinyatakan sebagai perkiraan edukatif berbasis visual makanan, bukan diagnosis medis atau pengukuran kadar glukosa darah pasti.
  3. **Integritas Keamanan**: Jangan melewati pembatasan `RATE_LIMIT` (20 pesan/jam per user), verifikasi JWT/onboarding (`consent_at`), maupun filter `checkSafety` bila user menyertakan teks keluhan bersama foto.

## 3. Batasan & Keputusan Teknis (*Constraints & Architectural Calls*)
- **Perubahan Database Minimal (Hanya Kebijakan RLS Delete)**:
  - Tidak ada penambahan tabel baru atau perubahan kolom pada `chat_messages` (`content text not null`, `meta jsonb`, `flag_level`, `role in ('user', 'model')`).
  - *Keputusan Review*: Karena [008_force_fix_chat_rls.sql](file:///d:/SEMESTER%205/PEM%20WEB/PCOS%20SETUP/supabase/migrations/008_force_fix_chat_rls.sql) hanya mendefinisikan kebijakan `FOR SELECT`, ditambahkan satu migrasi kecil `supabase/migrations/012_allow_chat_delete.sql` berisi kebijakan RLS `FOR DELETE TO authenticated USING (auth.uid() = user_id)` pada `public.chat_messages` (selaras dengan `daily_checkins`). Dengan ini fitur *Bersihkan Percakapan* di `ChatPage` dan penghapusan riwayat pada *Hapus Akun* di `AuthContext` benar-benar menghapus riwayat analisis makanan di server Cloud sesuai UU PDP.
- **Konfigurasi Model & Endpoint Gemini**:
  - *Keputusan Review*: `supabase/functions/_shared/gemini.ts` memakai prioritas `(mode === 'meal_analysis' ? Deno.env.get('GEMINI_MEAL_MODEL') : undefined) || Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash-lite'` pada endpoint `/v1/models/${model}:generateContent` dengan `generationConfig.responseMimeType: "application/json"` (terverifikasi `HTTP 200` pada `gemini-3.5-flash-lite`). Secret `GEMINI_MODEL` di Supabase Cloud sudah disetel ke `gemini-3.5-flash-lite`.
- **Ukuran & Format Gambar**:
  - Frontend hanya menerima `image/jpeg`, `image/png`, `image/webp` dan mengompresi via Canvas HTML5 menjadi JPEG maksimal `1024px` (ukuran tipikal `100–300 KB`). Jika browser gagal decode format non-standar (mis. HEIC), tampilkan pesan error ramah.
  - Backend Edge Function menolak base64 > `2.000.000` karakter (~`1.5 MB` biner) atau MIME di luar allowlist `['image/jpeg', 'image/png', 'image/webp']` dengan `400 VALIDATION_ERROR`.
- **Konteks Riwayat, Query Terbaru, & Kompatibilitas Kartu**:
  - `pinnedCard` di `ChatPage.jsx` tetap khusus untuk mode `"recommendation"` (`msg.meta?.card`), sedangkan hasil Meal Analyzer memakai kunci terpisah `msg.meta?.meal_analysis` agar tidak menimpa kartu *Rekomendasi Hari Ini* yang sedang disematkan.
  - *Keputusan Review*: Query riwayat di `ChatPage.jsx` diubah mengambil **50 pesan terbaru** (`order('created_at', { ascending: false }).limit(50)` lalu dibalik kronologis di client) menggantikan 50 pesan terlama agar kartu analisis makanan baru tetap muncul saat percakapan melewati 50 pesan.
  - Pesan user yang tersimpan di `chat_messages.content` untuk analisis foto makanan disimpan terstruktur (`"[Foto Makanan: <meal_name> • Skor PCOS <pcos_score>/100 (IG <gi_category>)]"` diikuti catatan opsional user bila ada), agar `getRecentMessages()` di [context.ts](file:///d:/SEMESTER%205/PEM%20WEB/PCOS%20SETUP/supabase/functions/_shared/context.ts#L15-L33) tetap memahami konteks makanan pada pertanyaan lanjutan tanpa perubahan query `context.ts`.

## 4. Pendekatan yang Dipertimbangkan (*Approaches*)
1. **Opsi 1 — Ringan & Privasi-Utama via `chat` + `chat_messages.meta` *(Dipilih)***:
   - Browser mengecilkan foto → kirim langsung ke Edge Function `chat` → LLM mengembalikan JSON terstruktur → disimpan ke `chat_messages` (`content` + `meta.meal_analysis`). Foto hanya tampil sebagai thumbnail selama sesi aktif di UI; setelah reload tampil sebagai badge menu `[Foto Makanan: ...]` + kartu skor lengkap.
   - *Trade-off*: Nol kebutuhan bucket Storage / migrasi DB, hemat kuota gratis Supabase, aman privasi UU PDP (auto-hapus bersama *Bersihkan Percakapan* & *Hapus Akun*), tetapi gambar foto asli tidak tampil ulang pasca-refresh.
2. **Opsi 2 — Riwayat Visual Penuh via Supabase Storage Privat *(Tidak dipilih)***:
   - Mengunggah foto ke bucket Storage privat dengan RLS pemilik, *signed URL*, dan cleanup file di fitur hapus percakapan/akun.
   - *Trade-off*: Foto tetap tampil setelah refresh, tetapi menambah kompleksitas migrasi bucket + RLS + signed URL dan memakan kuota Storage gratis.
3. **Opsi 3 — Terintegrasi ke Riwayat Harian & Laporan Sp.OG *(Tidak dipilih)***:
   - Menambahkan penyimpanan skor nutrisi ke `daily_checkins`/tabel terpisah + UI baru di [HistoryPage.jsx](file:///d:/SEMESTER%205/PEM%20WEB/PCOS%20SETUP/frontend/src/pages/HistoryPage.jsx) dan cetakan dokter A4.
   - *Trade-off*: Scope jauh lebih luas dan menuntut perubahan skema DB & laporan dokter.

## 5. Rincian Desain Teknis

### 5.1 Alur Pengguna & Antarmuka (`frontend/src/pages/ChatPage.jsx`)
- **Titik Masuk UI (Web & Mobile, Tanpa Tab Baru)**:
  - Menambahkan tombol ikon foto/kamera (`photo_camera`) di sebelah kiri kotak ketik dalam *composer pill* (di samping tombol `+` *Atur Tugas Hari Ini*), lengkap dengan input `<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" />` (yang di browser HP otomatis menawarkan pilihan Kamera atau Galeri).
  - Menambahkan 1 chip akses cepat `📸 Analisis Foto Makanan` di strip *quick prompts* horizontal mobile & daftar topik pendukung di panel kiri desktop yang langsung memicu *file picker* gambar tersebut.
- **Preview & Pengiriman**:
  - Memilih file mengompresi gambar secara asinkron dan menampilkan **preview thumbnail kecil** + nama/ukuran singkat + tombol hapus (`close`) tepat di atas input bar.
  - Tombol **Kirim** aktif bila ada foto terpilih **atau** ada teks pesan (`!inputText.trim() && !selectedImage` → disabled).
  - Saat foto dikirim bersama atau tanpa catatan teks:
    - Bubble user optimistik menampilkan thumbnail lokal (`previewDataUrl`) + catatan teks (atau label *"Analisis foto makanan ini"* bila teks kosong).
    - Jika sesi masih berjalan di tab yang sama, bubble tersebut tetap menampilkan preview thumbnail lokal (melalui state memori/map `localPhotoPreviews[msgId]`); setelah refresh halaman, pesan dari database ditampilkan dengan badge rapi `📷 Foto Makanan` beserta `meal_name` & catatan user.
- **Tampilan Meal Score Card (pada Bubble Model)**:
  - Ketika `msg.meta?.meal_analysis` tersedia dan `is_food === true`:
    - Header kartu menampilkan **Skor Ramah PCOS** (`pcos_score/100`) dan badge kategori Indeks Glikemik (`Rendah` hijau teal / `Sedang` ungu lembut / `Tinggi` terracotta lembut).
    - Bagian **Terdeteksi**: chip/daftar item makanan (`detected_items`).
    - Bagian **Perkiraan Dampak Glikemik**: teks singkat `glycemic_impact`.
    - Bagian **Saran Piring Seimbang**: daftar 1–2 langkah praktis (`balancing_tips`).
    - Catatan kaki halus: *"Perkiraan edukatif berbasis visual foto, bukan alat ukur medis."*
    - Teks empatik `msg.content` (`assistant_reply`) tampil menyertai kartu seperti pesan Asisten biasa (tetap mendukung rujukan artikel edukasi `sources` bila ada).
  - Ketika `is_food === false`: tidak merender Meal Score Card, hanya menampilkan balasan empatik `msg.content` yang meminta foto makanan yang lebih jelas.

### 5.2 Kontrak API (`POST /functions/v1/chat`) & Backend (`supabase/functions/chat/`)
- **Request Schema**:
  - `MODES = ['free', 'recommendation', 'meal_analysis']`
  - Payload:
    ```json
    {
      "message": "catatan opsional user (boleh kosong jika ada image)",
      "mode": "meal_analysis",
      "context_article_id": null,
      "tasks": [],
      "image": {
        "mime_type": "image/jpeg",
        "data": "<base64 string tanpa prefix data:image/...;base64,>"
      }
    }
    ```
- **Validasi Server (`chat/index.ts`)**:
  - Jika `mode === 'meal_analysis'`:
    - `image` wajib ada berupa objek `{ mime_type, data }`, `mime_type` harus dalam `['image/jpeg', 'image/png', 'image/webp']`, `data` non-kosong berupa string base64 valid (`<= 2_000_000` karakter).
    - `message` bersifat opsional (jika kosong, panjang 0 diperbolehkan dan digantikan konteks internal `"Tolong analisis foto makanan ini."`; jika diisi, tetap maks `1000` karakter dan tetap melewati `checkSafety(message)`).
  - Jika `mode !== 'meal_analysis'`: perilaku validasi `message` `1..1000` karakter tetap persis seperti kontrak sebelumnya; field `image` ditolak dengan `400 VALIDATION_ERROR`.
  - **Penanganan Keselamatan (`checkSafety`)**:
    - Bila `flag_level === 'crisis'` (di semua mode) **atau** `flag_level === 'severe'` pada `mode === 'meal_analysis'`: sistem langsung menghentikan pemanggilan Gemini (`meal_analysis: null`), menyimpan catatan teks pengguna apa adanya (`message || '[Foto Makanan]'`) dan membalas pesan dukungan/eskalasi dokter beserta banner keselamatan (`crisis` atau `see_doctor`).
    - Bila `flag_level === 'warning'` bersama foto makanan: Asisten tetap menjalankan analisis makanan sekaligus menyertakan banner `see_doctor` lembut di kartu/bubble respons.
  - Tetap memakai penghitung `RATE_LIMIT = 20` pesan user per jam.
- **Integrasi Multimodal Gemini (`supabase/functions/_shared/gemini.ts`)**:
  - Menambahkan parameter opsional `image?: { mime_type: string; data: string }` pada `callLLM` & `callGemini`.
  - Ketika `mode === 'meal_analysis'` dan `image` tersedia:
    - `parts` pada `contents[0]` menyertakan `{ text: systemPrompt + '\n\n' + userPrompt }` dan `{ inlineData: { mimeType: image.mime_type, data: image.data } }`.
    - `generationConfig` memakai `temperature: 0.4` (lebih konsisten untuk penilaian skor), `maxOutputTokens: 1000`, dan `responseMimeType: "application/json"`.
    - Prompt menginstruksikan penilaian ramah PCOS berbasis perkiraan Indeks Glikemik & beban karbohidrat vs kombinasi serat/protein/lemak sehat, tanpa menghitung kalori, serta wajib mengisi `is_food: false` jika gambar bukan makanan/minuman atau tidak jelas.
  - Parsing & normalisasi respons JSON di `gemini.ts`:
    - Parse JSON + sanitasi rentang (`pcos_score` dibatasi `0–100` integer, `gi_category` dinormalisasi ke `'rendah' | 'sedang' | 'tinggi'`), dengan fallback aman mengekstrak JSON via regex atau fallback ramah bila format tidak sempurna.
- **Penyimpanan ke `chat_messages`**:
  - Baris `user`:
    - Jika `is_food === true` dan `meal_name` ada: simpan `content` sebagai `"[Foto Makanan: " + meal_name + " • Skor PCOS " + pcos_score + "/100 (IG " + gi_category + ")]" + (userNote ? "\n" + userNote : "")`.
    - Jika `is_food === false`: simpan `content` sebagai `"[Foto Bukan Makanan / Tidak Jelas]" + (userNote ? "\n" + userNote : "")`.
  - Baris `model`:
    - `content`: `llmResponse.text` (`assistant_reply`)
    - `meta`: `{ card: null, sources: llmResponse.sources, meal_analysis: llmResponse.meal_analysis }` (jika `is_food === false`, `meal_analysis` bernilai `null`).
  - Response JSON `chat` mengembalikan `user_message_content` (membantu UI memperbarui label pesan tersimpan) serta `reply.meal_analysis`.

### 5.3 Mode Fallback Lokal / DEV (`frontend/src/lib/supabase.js`)
- `sendChatMessage` menerima parameter opsional `image` dan meneruskannya ke `/functions/v1/chat`.
- Untuk mode lokal (`localBackend` tanpa Supabase Cloud) atau `DEV` fallback: tetap mendukung simulasi/panggilan multimodal langsung (`gemini-3.5-flash-lite` dengan `inlineData`) di mode `DEV`, serta fallback respons sampel terstruktur saat offline tanpa kunci API — dengan aturan keselamatan yang konsisten (`crisis` & `severe` skip analisis makanan pada `meal_analysis`).

## 6. Yang Diserahkan ke Implementer (*Left to Builder*)
- Penempatan komponen UI kecil `MealScoreCard` di dalam [ChatPage.jsx](file:///d:/SEMESTER%205/PEM%20WEB/PCOS%20SETUP/frontend/src/pages/ChatPage.jsx) atau file komponen terpisah yang mengikuti palet warna M3 PCOSmart (`primary`, `secondary`, `tertiary`, `surface-container`).
- Helper kompresi gambar sisi klien (`frontend/src/lib/imageUtils.js` atau sejajar).
- Penentuan teks fallback terstruktur yang empatik pada mode offline lokal.
- Uji end-to-end dengan `oxlint`, `vite build`, skrip verifikasi payload Edge Function `chat`, serta deploy ulang Edge Function `chat` dan frontend Vercel.
