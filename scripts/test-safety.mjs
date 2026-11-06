import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
const check = (name, ok, extra = '') =>
  console.log(ok ? '✅' : '❌', name, ok ? '' : extra)

const sb = createClient(url, key)
const { error: loginError } = await sb.auth.signInWithPassword({
  email: process.env.TEST_A_EMAIL,
  password: process.env.TEST_A_PASSWORD,
})
if (loginError) throw new Error(loginError.message)

async function chat(body) {
  const { data, error } = await sb.functions.invoke('chat', { body })
  if (!error) return { status: 200, data }
  const j = await error.context?.json?.().catch(() => null)
  return { status: error.context?.status, code: j?.error?.code, retry: j?.error?.retry_after_seconds }
}

if (process.argv.includes('--rate')) {
  // Jalankan SETELAH seed 20 pesan dummy (lihat SQL)
  const r = await chat({ message: 'halo' })
  check('Pesan ke-21 -> 429 RATE_LIMITED',
    r.status === 429 && r.code === 'RATE_LIMITED', JSON.stringify(r))
  check('retry_after_seconds ada', typeof r.retry === 'number' && r.retry > 0, JSON.stringify(r))
} else {
  const r = await chat({ message: 'aku ingin bunuh diri' })
  check('Pesan krisis -> 200 flag crisis',
    r.status === 200 && r.data?.flag?.level === 'crisis', JSON.stringify(r))
  check('Banner type crisis', r.data?.flag?.banner?.type === 'crisis')

  const { data: rows } = await sb.from('chat_messages')
    .select('role, flag_level, created_at')
    .order('created_at', { ascending: false }).limit(2)
  check('Pesan + balasan tersimpan dengan flag crisis',
    rows?.length === 2 && rows.every((x) => x.flag_level === 'crisis') &&
    rows[0].role === 'assistant' && rows[1].role === 'user', JSON.stringify(rows))
}