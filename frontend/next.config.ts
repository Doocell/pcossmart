import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Repo ini punya package-lock.json di root (backend) dan di frontend/. Tanpa pengaturan ini,
  // Next.js salah menganggap root repo sebagai root aplikasi dan menampilkan peringatan.
  turbopack: {
    root: path.join(__dirname),
  },

  // Catatan: `cacheComponents` / `partialPrefetching` (bawaan scaffold create-next-app)
  // sengaja DIMATIKAN. Dengan opsi itu, memanggil `new Date()` saat prerender menyebabkan
  // build error, padahal PCOSmart banyak memakai tanggal (check-in, kalender, laporan).
  // Aktifkan kembali nanti hanya jika memang dibutuhkan dan sudah disetujui.
};

export default nextConfig;
