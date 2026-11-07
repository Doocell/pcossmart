import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const check = (n, ok, x = '') => console.log(ok ? '✅' : '❌', n, ok ? '' : x)

for (const t of ['profiles', 'daily_checkins', 'chat_messages', 'education_articles']) {
  const { data } = await sb.from(t).select('*').limit(5)
  check(`Anon tidak bisa membaca ${t}`, !data || data.length === 0, `terbaca ${data?.length} baris`)
}

const fake = '00000000-0000-0000-0000-000000000000'
const i1 = await sb.from('daily_checkins').insert({
  user_id: fake, checkin_date: '2026-11-10', on_period: false, energy: 3, mood: 3,
})
check('Anon tidak bisa insert check-in', !!i1.error)

const i2 = await sb.from('chat_messages').insert({ user_id: fake, role: 'user', content: 'x' })
check('Anon tidak bisa insert chat', !!i2.error)