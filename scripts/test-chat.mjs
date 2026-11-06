import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
const check = (name, ok, extra = '') =>
  console.log(ok ? '✅' : '❌', name, ok ? '' : extra)

async function getOrCreateUser(email, password, withConsent = false) {
  const sb = createClient(url, key)
  
  // Try to login first
  let { data: authData, error: loginError } = await sb.auth.signInWithPassword({ email, password })
  
  if (!loginError) {
    console.log(`ℹ️  User ${email} already exists, logged in`)
    return sb
  }
  
  // If login failed, try to sign up
  console.log(`ℹ️  User ${email} not found, creating...`)
  const { data: signupData, error: signupError } = await sb.auth.signUp({ email, password })
  
  if (signupError) {
    throw new Error(`Failed to create user (${email}): ${signupError.message}`)
  }
  
  // Login after signup
  const { error: loginError2 } = await sb.auth.signInWithPassword({ email, password })
  if (loginError2) {
    throw new Error(`Created user but login failed (${email}): ${loginError2.message}`)
  }
  
  // Create profile if withConsent
  if (withConsent) {
    const { data: { user } } = await sb.auth.getUser()
    if (user) {
      const { error: profileError } = await sb.from('profiles').upsert({
        id: user.id,
        full_name: email.split('@')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      
      if (profileError && !profileError.message.includes('duplicate')) {
        console.warn(`⚠️  Warning: Could not create profile for ${email}:`, profileError.message)
      } else {
        console.log(`✅ Profile created for ${email}`)
      }
    }
  }
  
  console.log(`✅ User ${email} created and logged in`)
  return sb
}

// Meniru cara FE membaca error (kontrak 6.6)
async function chat(sb, body) {
  const { data, error } = await sb.functions.invoke('chat', { body })
  if (!error) return { status: 200, data }
  const res = error.context
  const j = await res?.json?.().catch(() => null)
  return { status: res?.status, code: j?.error?.code }
}

console.log('🧪 Testing Chat Function\n')

// Get or create test users
const testAEmail = process.env.TEST_A_EMAIL || 'test-user-a@example.com'
const testAPassword = process.env.TEST_A_PASSWORD || 'testpassword123'
const testBEmail = process.env.TEST_B_EMAIL || 'test-user-b@example.com'
const testBPassword = process.env.TEST_B_PASSWORD || 'testpassword123'

console.log(`📧 Test User A: ${testAEmail}`)
console.log(`📧 Test User B: ${testBEmail}\n`)

const A = await getOrCreateUser(testAEmail, testAPassword, true) // with consent
const B = await getOrCreateUser(testBEmail, testBPassword, false) // without consent

console.log('\n--- Running Tests ---\n')

// 401 tanpa login
const r401 = await fetch(`${url}/functions/v1/chat`, {
  method: 'POST',
  headers: { apikey: key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'halo' }),
})
const j401 = await r401.json().catch(() => null)
check('Tanpa login -> 401 UNAUTHENTICATED',
  r401.status === 401 && j401?.error?.code === 'UNAUTHENTICATED', JSON.stringify(j401))

// 403: B belum punya profil/consent
const r403 = await chat(B, { message: 'halo' })
check('Tanpa consent -> 403 CONSENT_REQUIRED',
  r403.status === 403 && r403.code === 'CONSENT_REQUIRED', JSON.stringify(r403))

// 400: pesan kosong dan terlalu panjang
const r400a = await chat(A, { message: '   ' })
check('Pesan kosong -> 400', r400a.status === 400 && r400a.code === 'VALIDATION_ERROR')

const r400b = await chat(A, { message: 'a'.repeat(1001) })
check('Pesan >1000 karakter -> 400', r400b.status === 400)

const r400c = await chat(A, { message: 'halo', mode: 'ngawur' })
check('Mode tidak valid -> 400', r400c.status === 400)

// 200
const r200 = await chat(A, { message: 'Aku capek banget hari ini', mode: 'free' })
check('Pesan valid -> 200', r200.status === 200 && !!r200.data?.reply?.text, JSON.stringify(r200))