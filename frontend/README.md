# PCOSmart Frontend

Frontend aplikasi PCOSmart, berada di folder `frontend/` pada repository yang sama dengan backend (`supabase/`).

**Status:** Execution Task 01 (Frontend Foundation). Baru fondasi project; belum ada fitur aplikasi.

## Teknologi

- Next.js (App Router) + React + TypeScript
- Tailwind CSS v4 (lewat PostCSS)
- Supabase JavaScript Client (`@supabase/supabase-js`)
- Font Plus Jakarta Sans (`@fontsource-variable/plus-jakarta-sans`, di-host sendiri, tanpa request ke Google Fonts)

## Prasyarat

- Node.js 20.9 atau lebih baru
- npm

## Menjalankan di komputer lokal

Semua perintah dijalankan dari folder `frontend/`.

```bash
cd frontend
npm install
cp .env.local.example .env.local   # Windows (CMD): copy .env.local.example .env.local
# isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local
npm run dev
```

Buka http://localhost:3000. Tanpa mengisi `.env.local`, halaman tetap tampil dan akan menunjukkan bahwa env Supabase belum diisi.

## Perintah yang tersedia

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan development server |
| `npm run build` | Build production |
| `npm run start` | Menjalankan hasil build production |
| `npm run lint` | Memeriksa kode dengan ESLint |
| `npm run typecheck` | Membuat tipe route Next.js (`next typegen`) lalu memeriksa tipe TypeScript |

## Environment variable

| Nama | Keterangan |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/publishable key (aman di browser selama RLS aktif) |

Jangan pernah memasukkan service role key, `GEMINI_API_KEY`, atau secret lain ke frontend. `.env.local` sudah diabaikan Git; yang ikut di-commit hanya `.env.local.example`.

## Struktur folder

```
frontend/
├── public/images/        # aset statis (logo)
├── src/
│   ├── app/              # halaman, layout, globals.css (design tokens)
│   ├── components/
│   │   ├── ui/           # Button, Card, Badge, ikon
│   │   └── layout/       # Logo, PageContainer
│   └── lib/
│       ├── cn.ts         # helper penggabung class
│       └── supabase/     # env.ts dan client.ts (browser client)
├── .env.local.example
├── next.config.ts
├── postcss.config.mjs
└── tsconfig.json         # alias import: "@/..." mengarah ke "src/..."
```

Folder seperti `services/`, `types/`, dan `hooks/` akan dibuat saat benar-benar dibutuhkan.

## Keputusan teknis

- **Cache Components dimatikan.** Scaffold bawaan menyalakan `cacheComponents` dan `partialPrefetching`. Dengan opsi itu, `new Date()` saat prerender menyebabkan build error, sedangkan PCOSmart banyak memakai tanggal. Lihat komentar di `next.config.ts`.
- **Hanya browser client Supabase.** Sesuai API Contract, akses data lewat `supabase-js` dengan RLS, jadi server client / `@supabase/ssr` belum diperlukan.
- **Belum ada tipe `Database`.** Skema backend masih perlu disinkronkan dengan tim backend.
- **Tema terang saja**, mengikuti desain Figma.

## Design tokens

Didefinisikan di `src/app/globals.css` (blok `@theme`) dan otomatis menjadi class Tailwind, misalnya `bg-primary`, `text-ink-muted`, `rounded-card`, `shadow-card`.

Warna diambil dari sampling piksel PDF ekspor Figma. Font, radius, dan bayangan adalah estimasi dari render PDF, jadi perlu dicocokkan dengan Figma asli.

## Aset dan hal yang perlu dikonfirmasi ke UI/UX

- **Logo:** `public/images/logo-mark.png` dan `src/app/icon.png` berupa crop resolusi tinggi dari PDF Figma. Mohon file asli (SVG) agar tetap tajam di semua ukuran.
- **Font:** nama font tidak bisa dibaca dari PDF (teks sudah di-outline). Plus Jakarta Sans dipilih karena paling mirip secara visual. Mohon dikonfirmasi.
- **Pustaka ikon:** ikon sementara ada di `src/components/ui/icons.tsx`. Pustaka ikon final belum ditentukan.
- **Desain desktop:** Figma hanya berisi layar mobile. Belum ada desain desktop.
- **Token resmi:** minta token (warna, radius, shadow, tipografi) dari Figma Dev Mode jika tersedia.
