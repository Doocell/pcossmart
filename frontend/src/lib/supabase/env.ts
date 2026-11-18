export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

/**
 * Membaca konfigurasi Supabase yang AMAN dipakai di browser.
 *
 * Hanya URL project dan anon (publishable) key. Service role key tidak boleh
 * ada di frontend sama sekali.
 *
 * Penting: Next.js hanya menanam variabel NEXT_PUBLIC_* ke bundle browser jika
 * ditulis langsung sebagai `process.env.NEXT_PUBLIC_NAMA`, bukan `process.env[nama]`.
 */
export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;
  return { url, anonKey };
}
