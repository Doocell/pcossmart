import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "./env";

let browserClient: SupabaseClient | undefined;

/**
 * Supabase client untuk browser (dipakai dari Client Component).
 *
 * Dibuat sekali lalu dipakai ulang. Kalau env belum diisi, error dilempar
 * saat client DIPAKAI (bukan saat build), dengan pesan yang menjelaskan cara memperbaikinya.
 *
 * Belum ada tipe `Database`: skema backend masih perlu disinkronkan dengan tim backend.
 * Tambahkan tipenya setelah skema final.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error(
      "Konfigurasi Supabase belum lengkap. Isi NEXT_PUBLIC_SUPABASE_URL dan " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY di frontend/.env.local (lihat .env.local.example), " +
        "lalu jalankan ulang `npm run dev`.",
    );
  }

  browserClient = createClient(env.url, env.anonKey);
  return browserClient;
}
