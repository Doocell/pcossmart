# Snap and Score Meal Analyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengintegrasikan fitur **Snap and Score Meal Analyzer** langsung ke halaman Asisten (`/chat`) menggunakan `gemini-3.5-flash-lite` lewat Edge Function `chat` tanpa menambah tab navigasi baru, sekaligus mengaktifkan izin hapus riwayat chat (`FOR DELETE` RLS) sesuai UU PDP.

**Architecture:** Browser mengompresi foto makanan lewat Canvas HTML5 menjadi JPEG ringan (`<= 1024px`) dan mengirimkannya ke Edge Function `chat` (`mode: "meal_analysis"`). Backend memvalidasi keselamatan & payload gambar, memanggil Gemini `/v1/` dengan `responseMimeType: "application/json"`, lalu menyimpan ringkasan menu user + kartu terstruktur `meta.meal_analysis` ke tabel `chat_messages`. Di sesi aktif thumbnail foto tampil dari memori browser; setelah refresh, riwayat chat memuat 50 pesan terbaru beserta badge menu dan `MealScoreCard` lengkap.

**Tech Stack:** React 19, Vite 8, Tailwind CSS v3, Supabase Postgres RLS & Edge Functions (Deno), Google Gemini REST API (`gemini-3.5-flash-lite`), Node.js v22 native test runner (`node --test`).

**Spec:** `docs/superpowers/specs/2026-11-19-snap-score-meal-analyzer-design.md`

## Global Constraints
- Tidak ada tabel database baru maupun perubahan skema kolom `chat_messages`; hanya menambah 1 kebijakan RLS `FOR DELETE TO authenticated USING (auth.uid() = user_id)` pada `public.chat_messages`.
- Tidak ada tab/tombol navigasi baru di `AppShell.jsx`; fitur hidup di dalam `ChatPage.jsx`.
- Kunci `GEMINI_API_KEY` tidak boleh terekspos di bundle produksi Vite; di produksi semua analisis foto melewati `POST /functions/v1/chat`.
- Format gambar yang diizinkan: `['image/jpeg', 'image/png', 'image/webp']`; kompresi klien maks `1024px` (JPEG `0.8`); batas base64 backend `<= 2_000_000` karakter.
- Model default/endpoint: `(mode === 'meal_analysis' ? GEMINI_MEAL_MODEL : undefined) || GEMINI_MODEL || 'gemini-3.5-flash-lite'` pada `/v1/models/${model}:generateContent` dengan `responseMimeType: "application/json"`, `temperature: 0.4`, `maxOutputTokens: 1000`.
- Batas `RATE_LIMIT = 20` pesan/jam, verifikasi onboarding (`consent_at`), dan filter `checkSafety` tetap berjalan; tidak menghitung/menampilkan angka kalori ketat dan selalu menyertakan disclaimer edukatif.

## Review Focus
- **Foto bukan makanan atau buram (`is_food: false`)**: Server & fallback harus mengembalikan `meal_analysis: null`, menyimpan `[Foto Bukan Makanan / Tidak Jelas]`, dan frontend hanya merender balasan teks empatik tanpa `MealScoreCard` (diuji pada Task 2 & Task 4).
- **Gambar berukuran raksasa, MIME tak didukung, atau base64 rusak**: Frontend gagal-anggun dengan pesan ramah saat file bukan `jpeg/png/webp` atau gagal decode Canvas; backend menolak MIME di luar allowlist atau `data.length > 2_000_000` / non-base64 dengan `400 VALIDATION_ERROR` (diuji pada Task 2 & Task 3).
- **Foto dikirim tanpa catatan teks (`message: ""`)**: Diizinkan di `chat/index.ts` & tombol kirim `ChatPage.jsx` khusus saat `mode === 'meal_analysis'`, memakai konteks internal `"Tolong analisis foto makanan ini."` dan menyimpan `[Foto Makanan: <meal_name> • Skor PCOS <pcos_score>/100 (IG <gi_category>)]` di DB (diuji pada Task 2 & Task 3).
- **Teks `crisis` atau `severe` dikirim bersama foto makanan**: Khusus `meal_analysis`, baik `crisis` maupun `severe` menghentikan panggilan Gemini (`meal_analysis: null`) dan membalas dukungan krisis / `see_doctor` banner konsisten di backend maupun fallback lokal `supabase.js` (diuji pada Task 2 & Task 3).
- **Riwayat panjang (>50 pesan) & tombol Bersihkan Percakapan / Hapus Akun di Cloud**: `ChatPage.jsx` memuat 50 pesan *terbaru* (`ascending: false` lalu dibalik) dan kebijakan RLS `012_allow_chat_delete.sql` mengizinkan penghapusan baris milik `auth.uid()` di Cloud (diuji pada Task 1 & Task 4).

---

### Task 1: Migrasi Kebijakan RLS `DELETE` pada `chat_messages`

**Files:**
- Create: `supabase/migrations/012_allow_chat_delete.sql`

**Interfaces:**
- Produces: Kebijakan RLS Postgres `"users_delete_own_messages"` (`FOR DELETE TO authenticated USING (auth.uid() = user_id)`) pada `public.chat_messages`.

- [ ] **Step 1: Tulis file migrasi `supabase/migrations/012_allow_chat_delete.sql`**
  Buat kebijakan idempoten (`drop policy if exists "users_delete_own_messages" on public.chat_messages;` diikuti `create policy "users_delete_own_messages" on public.chat_messages for delete to authenticated using (auth.uid() = user_id);`) dengan blok verifikasi `pg_policies`.

- [ ] **Step 2: Push migrasi ke database Supabase Cloud (`zhreisaigvyyhogudpld`)**
  Run: `.\node_modules\.bin\supabase.cmd db push --yes --agent yes`
  Expected: `Finished supabase db push` tanpa error.

- [ ] **Step 3: Verifikasi policy aktif via query read-only**
  Run: `.\node_modules\.bin\supabase.cmd db query --remote --read-only --agent yes "SELECT policyname, cmd, roles FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_messages' ORDER BY cmd;"`
  Expected: Terdapat 2 policy: `users_read_own_messages` (`SELECT`) dan `users_delete_own_messages` (`DELETE`, role `{authenticated}`).

- [ ] **Step 4: Commit migrasi**
  ```bash
  git add supabase/migrations/012_allow_chat_delete.sql
  git commit -m "chore(db): allow authenticated users to delete own chat messages"
  ```

---

### Task 2: Helper Meal Analyzer, Gemini Multimodal Vision, & Edge Function `chat`

**Files:**
- Create: `supabase/functions/_shared/meal.ts`
- Modify: `supabase/functions/_shared/gemini.ts:7-18,100-272`
- Modify: `supabase/functions/chat/index.ts:1-234`
- Test: `scripts/test-meal-helpers.test.mjs`

**Interfaces:**
- Consumes: `ChatContext` (`supabase/functions/_shared/context.ts`), `checkSafety` & `getBanner` (`supabase/functions/_shared/safety.ts`).
- Produces (`supabase/functions/_shared/meal.ts`):
  - `MealImageInput`: `{ mime_type: 'image/jpeg' | 'image/png' | 'image/webp'; data: string }`
  - `MealAnalysisResult`: `{ is_food: boolean; meal_name: string; detected_items: string[]; pcos_score: number | null; gi_category: 'rendah' | 'sedang' | 'tinggi' | null; glycemic_impact: string; balancing_tips: string[]; assistant_reply: string }`
  - `validateMealImageInput(raw: unknown): { ok: true; value: MealImageInput } | { ok: false; error: string }`
  - `parseMealAnalysisResponse(rawText: string): MealAnalysisResult`
  - `formatMealUserContent(analysis: MealAnalysisResult | null, userNote: string): string`
  - `buildMealAnalysisPrompt(message: string, context: ChatContext): string`
- Produces (`POST /functions/v1/chat`): menerima `mode: 'free' | 'recommendation' | 'meal_analysis'`, opsional `image: MealImageInput`, dan mengembalikan `{ user_message_id, user_message_content, reply: { id, text, card, meal_analysis, sources, suggested_action }, flag, usage }`.

- [ ] **Step 1: Tulis unit test yang gagal di `scripts/test-meal-helpers.test.mjs`**
  Gunakan `node:test` dan `node:assert/strict` mengimpor `../supabase/functions/_shared/meal.ts` untuk menguji:
  - `validateMealImageInput`: valid JPEG base64 lolos; MIME `image/gif` ditolak; `data` kosong / karakter non-base64 ditolak; `data.length > 2_000_000` ditolak.
  - `parseMealAnalysisResponse`: JSON food valid menormalkan skor `0–100` (mis. `120 -> 100`, `-5 -> 0`), kategori GI (`"Tinggi"` -> `'tinggi'`), `balancing_tips` maks 2–3 string non-kosong; payload `is_food: false` memaksa `pcos_score: null`, `gi_category: null`, `detected_items: []`; string rusak/non-JSON fallback aman ke `is_food: false` dengan `assistant_reply` ramah.
  - `formatMealUserContent`: dengan `is_food: true` & catatan `"menu makan siang"` menghasilkan `"[Foto Makanan: Nasi Putih & Ayam • Skor PCOS 72/100 (IG sedang)]\nmenu makan siang"`; tanpa catatan menghasilkan satu baris tanpa trailing newline; dengan `analysis: null` / `is_food: false` menghasilkan `"[Foto Bukan Makanan / Tidak Jelas]"`.

- [ ] **Step 2: Jalankan test untuk memastikan gagal sebelum implementasi**
  Run: `node --experimental-strip-types --test scripts/test-meal-helpers.test.mjs`
  Expected: FAIL (`Cannot find module .../meal.ts`).

- [ ] **Step 3: Implementasikan `supabase/functions/_shared/meal.ts`**
  Tulis fungsi murni tanpa sintaks TS non-strippable (`enum`/`parameter properties`) agar kompatibel penuh dengan Deno & Node `--experimental-strip-types`:
  - `ALLOWED_MEAL_MIMES = ['image/jpeg', 'image/png', 'image/webp']`, `MAX_IMAGE_BASE64_LEN = 2_000_000`.
  - `validateMealImageInput`: strip spasi, cek MIME, cek regex `/^[A-Za-z0-9+/=\r\n]+$/`, cek panjang.
  - `parseMealAnalysisResponse`: ekstrak JSON langsung atau blok `{...}` via regex, sanitasi tipe/rentang `pcos_score` (`Math.max(0, Math.min(100, Math.round(score)))`), normalisasi `gi_category` (`'rendah' | 'sedang' | 'tinggi'`), dan fallback ramah bila gagal parse.
  - `formatMealUserContent` & `buildMealAnalysisPrompt` (menginstruksikan penilaian ramah PCOS berbasis perkiraan IG tanpa kalori & deteksi `is_food: false`).

- [ ] **Step 4: Jalankan test `scripts/test-meal-helpers.test.mjs` untuk verifikasi PASS**
  Run: `node --experimental-strip-types --test scripts/test-meal-helpers.test.mjs`
  Expected: Semua test kasus PASS (`0` failures).

- [ ] **Step 5: Perbarui `supabase/functions/_shared/gemini.ts` dan `supabase/functions/chat/index.ts`**
  - Di `gemini.ts`: perluas `GeminiResponse` dengan `meal_analysis?: MealAnalysisResult | null`; ubah `callGemini` & `callLLM` menerima argumen opsional `image?: MealImageInput`; saat `mode === 'meal_analysis' && image`, pilih `(Deno.env.get('GEMINI_MEAL_MODEL') || Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash-lite')`, kirim `parts: [{ text }, { inlineData: { mimeType: image.mime_type, data: image.data } }]` dengan `generationConfig: { temperature: 0.4, maxOutputTokens: 1000, responseMimeType: 'application/json' }`, parse memakai `parseMealAnalysisResponse`, dan set `meal_analysis: parsed.is_food ? parsed : null`.
  - Di `chat/index.ts`: perluas `MODES = ['free', 'recommendation', 'meal_analysis']`; validasi `image` via `validateMealImageInput` bila `mode === 'meal_analysis'` (tolak `image` bila `mode !== 'meal_analysis'`); izinkan `message` kosong (`""`) hanya saat `mode === 'meal_analysis'` (pakai fallback teks ke `checkSafety` = `""` dan ke LLM = `"Tolong analisis foto makanan ini."`); jika `level === 'crisis'` (semua mode) **atau** (`mode === 'meal_analysis' && level === 'severe'`), simpan pesan teks aman + balasan keselamatan (`meal_analysis: null`) dan early-return sebelum `callLLM`; jika berhasil dari `callLLM`, simpan user `content` via `formatMealUserContent(llmResponse.meal_analysis, message)` saat `mode === 'meal_analysis'` dan model `meta` dengan `meal_analysis`, serta sertakan `user_message_content` & `reply.meal_analysis` di JSON response.

- [ ] **Step 6: Deploy Edge Function `chat` & uji smoke kontrak**
  Run:
  - `.\node_modules\.bin\supabase.cmd functions deploy chat --yes --agent yes`
  - `node --experimental-strip-types --test scripts/test-meal-helpers.test.mjs`
  Expected: Deployed Functions ke `zhreisaigvyyhogudpld` dan seluruh unit test PASS.

- [ ] **Step 7: Commit Task 2**
  ```bash
  git add supabase/functions/_shared/meal.ts supabase/functions/_shared/gemini.ts supabase/functions/chat/index.ts scripts/test-meal-helpers.test.mjs
  git commit -m "feat(edge): support multimodal meal_analysis in chat Edge Function"
  ```

---

### Task 3: Utilitas Kompresi Gambar Klien & Integrasi `supabase.js`

**Files:**
- Create: `frontend/src/lib/imageUtils.js`
- Modify: `frontend/src/lib/supabase.js:517-600,670-943`
- Test: `scripts/test-frontend-meal.test.mjs`

**Interfaces:**
- Produces (`frontend/src/lib/imageUtils.js`):
  - `ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']`
  - `validateImageFileMeta(file: { type: string; size?: number }): void` (throws descriptive Indonesian `Error` if unsupported)
  - `computeScaledDimensions(width: number, height: number, maxDim?: number): { width: number; height: number }` (`maxDim = 1024`)
  - `stripDataUrlPrefix(dataUrl: string): string`
  - `compressMealImageFile(file: File): Promise<{ mime_type: 'image/jpeg'; data: string; previewDataUrl: string; fileName: string; byteSize: number }>`
- Consumes & Produces (`frontend/src/lib/supabase.js`):
  - `sendChatMessage({ message = "", mode = "free", context_article_id = null, tasks = [], image = null })` meneruskan `image` ke `/functions/v1/chat`, dan di local/DEV fallback mendukung `mode === 'meal_analysis'`: bila `flagLevel === 'crisis' || flagLevel === 'severe'` lewati Gemini & kembalikan `meal_analysis: null`; selain itu panggil Gemini DEV (`v1/models/${geminiModel}:generateContent` + `responseMimeType: "application/json"`) atau fallback sampel terstruktur yang sesuai skema `MealAnalysisResult`.

- [ ] **Step 1: Tulis unit test yang gagal di `scripts/test-frontend-meal.test.mjs`**
  Gunakan `node:test` dan `node:assert/strict` untuk menguji helper murni dari `frontend/src/lib/imageUtils.js`:
  - `computeScaledDimensions(2400, 1200, 1024)` -> `{ width: 1024, height: 512 }`; gambar lebih kecil `(800, 600, 1024)` -> `{ width: 800, height: 600 }`.
  - `validateImageFileMeta({ type: 'image/gif', size: 1024 })` melempar Error berbahasa Indonesia; `{ type: 'image/jpeg', size: 25 * 1024 * 1024 }` melempar Error batas ukuran mentah (`<= 20 MB`); `{ type: 'image/webp', size: 500_000 }` lolos.
  - `stripDataUrlPrefix('data:image/jpeg;base64,/9j/4AAQ')` -> `'/9j/4AAQ'`.

- [ ] **Step 2: Jalankan test untuk memastikan gagal**
  Run: `node --test scripts/test-frontend-meal.test.mjs`
  Expected: FAIL (`Cannot find module .../imageUtils.js`).

- [ ] **Step 3: Implementasikan `frontend/src/lib/imageUtils.js`**
  Tulis helper murni (`validateImageFileMeta`, `computeScaledDimensions`, `stripDataUrlPrefix`) + `compressMealImageFile(file)` memakai `createImageBitmap` / `Image` + `<canvas>` (`image/jpeg`, quality `0.8`, batas panjang maks `1024px`, dan fallback `FileReader` error message ramah bila format tidak bisa didekode browser seperti HEIC).

- [ ] **Step 4: Jalankan test `scripts/test-frontend-meal.test.mjs` untuk verifikasi PASS**
  Run: `node --test scripts/test-frontend-meal.test.mjs`
  Expected: PASS.

- [ ] **Step 5: Perbarui `frontend/src/lib/supabase.js` (`sendChatMessage` + local/DEV `meal_analysis`)**
  - Tambahkan parameter `image = null` pada `sendChatMessage` dan teruskan di body `POST ${supabaseUrl}/functions/v1/chat`.
  - Pada jalur local fallback (`sendChatMessageLocal`), dukung `isMealMode = mode === "meal_analysis"`: skip Gemini bila `flagLevel === 'crisis' || flagLevel === 'severe'`, simpan `user.content` dengan format `[Foto Makanan: ...]`, dukung direct Gemini multimodal di `import.meta.env.DEV`, serta berikan fallback sampel realistis jika offline tanpa kunci API.

- [ ] **Step 6: Verifikasi lint & test**
  Run: `node --test scripts/test-frontend-meal.test.mjs` dan `npm --prefix frontend run lint`
  Expected: Test PASS dan `oxlint` `0 errors`.

- [ ] **Step 7: Commit Task 3**
  ```bash
  git add frontend/src/lib/imageUtils.js frontend/src/lib/supabase.js scripts/test-frontend-meal.test.mjs
  git commit -m "feat(frontend): add client meal image compression and hybrid chat API support"
  ```

---

### Task 4: Komponen `MealScoreCard` & Integrasi UI Composer di `ChatPage.jsx`

**Files:**
- Create: `frontend/src/components/MealScoreCard.jsx`
- Modify: `frontend/src/pages/ChatPage.jsx:1-12,94-279,770-825,1000-1115,1410-1502`

**Interfaces:**
- Produces (`frontend/src/components/MealScoreCard.jsx`):
  - `MealScoreCard({ analysis })` — merender kartu hanya bila `analysis && analysis.is_food !== false`; menampilkan `meal_name`, `pcos_score/100`, badge warna `gi_category` (`rendah` teal/secondary, `sedang` primary/lavender, `tinggi` tertiary/terracotta), chip `detected_items`, `glycemic_impact`, daftar `balancing_tips`, dan disclaimer edukatif tanpa kalori.
- Consumes (`ChatPage.jsx`): `compressMealImageFile` dari `../lib/imageUtils`, `sendChatMessage` dengan `image`, dan `MealScoreCard`.

- [ ] **Step 1: Buat `frontend/src/components/MealScoreCard.jsx`**
  Implementasikan kartu visual responsif (mobile & desktop, mengikuti token desain PCOSmart `bg-surface-container-lowest`, `rounded-xl`, accent top gradient, badge warna IG berbasis mapping objek tanpa duplikasi `if/else`).

- [ ] **Step 2: Perbarui `ChatPage.jsx` untuk upload foto, preview strip, in-session thumbnail, kartu hasil, & 50 pesan terbaru**
  - Ubah query awal `chat_messages` (sekitar baris 151–156) ke `.order("created_at", { ascending: false }).limit(50)` lalu `.reverse()`.
  - Tambahkan state: `selectedImage` (`null | { mime_type, data, previewDataUrl, fileName, byteSize }`), `compressingImage` (`boolean`), `localPhotoPreviews` (`{ [msgId]: dataUrl }`), dan ref `fileInputRef`.
  - Tambahkan handler `handleSelectMealPhoto(e)` memanggil `compressMealImageFile(file)` dengan error banner ramah jika ditolak/gagal decode.
  - Perbarui `handleSend`: izinkan mengirim saat `selectedImage` terisi meskipun `inputText.trim() === ""` (`mode = selectedImage ? "meal_analysis" : mode`); simpan thumbnail ke `localPhotoPreviews[realUserMsgId]` saat response kembali; perbarui `content` optimistic user msg dengan `res.user_message_content` bila tersedia; render `<MealScoreCard analysis={msg.meta?.meal_analysis} />` saat `msg.meta?.meal_analysis` ada (dan tidak mengubah `pinnedCard` milik `Rekomendasi Hari Ini`).
  - Di bubble user (`msg.role === "user"`): tampilkan thumbnail gambar bila `localPhotoPreviews[msg.id]` tersedia di sesi aktif; jika sudah ter-reload dari DB dan teks diawali `[Foto Makanan:` atau `[Foto Bukan Makanan`, tampilkan badge chip `📷 Foto Makanan` yang rapi di atas catatan user.
  - Di area input bawah & quick-action mobile/desktop: tambahkan input tersembunyi `accept="image/jpeg,image/png,image/webp"`, tombol `photo_camera` di sebelah kiri kolom ketik dalam pill input, preview strip di atas input bar dengan tombol hapus (`close`), dan 1 chip cepat `📸 Analisis Foto Makanan` di strip mobile & sidebar topik.

- [ ] **Step 3: Verifikasi lint dan build**
  Run: `npm --prefix frontend run lint` dan `npm --prefix frontend run build`
  Expected: `oxlint` `0 errors`, `vite build` sukses tanpa error.

- [ ] **Step 4: Commit Task 4**
  ```bash
  git add frontend/src/components/MealScoreCard.jsx frontend/src/pages/ChatPage.jsx
  git commit -m "feat(chat): integrate Snap and Score Meal Analyzer UI into Asisten"
  ```

---

### Task 5: Verifikasi Menyeluruh, Push ke GitHub, & Deploy Produksi Vercel

**Files:**
- Verify only (no feature edits unless bug found)

- [ ] **Step 1: Jalankan seluruh automated tests, lint, dan production build**
  Run:
  - `node --experimental-strip-types --test scripts/test-meal-helpers.test.mjs`
  - `node --test scripts/test-frontend-meal.test.mjs`
  - `npm --prefix frontend run lint`
  - `npm --prefix frontend run build`
  Expected: Seluruh unit test PASS, `0 errors` pada `oxlint`, dan `vite build` berhasil.

- [ ] **Step 2: Push ke GitHub (`origin/main`) & pastikan deploy Vercel `pcossmart` berstatus `READY`**
  Run: `git push origin main`
  Pantau deployment proyek Vercel `prj_4ITKcpg8khduZugJfTAKQwnu5Ad9` hingga `READY`, lalu uji HTTP 200 ke `https://pcossmart.vercel.app/chat`.

- [ ] **Step 3: Uji end-to-end Edge Function `chat` dengan sampel gambar PNG minimal terhadap akun uji sementara (dibersihkan setelah uji) atau cek status `POST /functions/v1/chat`**
  Verifikasi endpoint mengembalikan `401` tanpa token & memproses `mode: "meal_analysis"` secara nyata saat terautentikasi (dan bersihkan user uji agar database tetap bersih jika diminta).
