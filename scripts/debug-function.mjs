/**
 * Debug script to check function deployment and configuration
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY

console.log('🔍 Debug Function Status\n')
console.log('Supabase URL:', url)
console.log('Project Ref: zhreisaigvyyhogudpld')
console.log()

// Check if we can reach the function
console.log('--- Testing Function Endpoint ---\n')

const functionUrl = `${url}/functions/v1/chat`
console.log('Function URL:', functionUrl)
console.log()

// Try OPTIONS request (should work without auth)
console.log('1. Testing CORS (OPTIONS request)...')
try {
  const optionsRes = await fetch(functionUrl, {
    method: 'OPTIONS',
    headers: {
      'apikey': key,
    },
  })
  console.log('   ✅ OPTIONS status:', optionsRes.status)
} catch (error) {
  console.log('   ❌ OPTIONS failed:', error.message)
}
console.log()

// Try POST without auth (should get 401)
console.log('2. Testing without auth (should get 401)...')
try {
  const unauthRes = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: 'test' }),
  })
  const unauthBody = await unauthRes.json()
  console.log('   Status:', unauthRes.status)
  console.log('   Response:', JSON.stringify(unauthBody, null, 2))
  
  if (unauthRes.status === 401) {
    console.log('   ✅ Correctly returns 401 UNAUTHENTICATED')
  } else {
    console.log('   ⚠️  Expected 401, got', unauthRes.status)
  }
} catch (error) {
  console.log('   ❌ Request failed:', error.message)
}
console.log()

// Login and try with auth
console.log('3. Testing with authentication...')
const sb = createClient(url, key)

const { error: loginError } = await sb.auth.signInWithPassword({
  email: process.env.TEST_A_EMAIL || 'test-user-a@example.com',
  password: process.env.TEST_A_PASSWORD || 'testpassword123',
})

if (loginError) {
  console.log('   ❌ Login failed:', loginError.message)
  process.exit(1)
}

console.log('   ✅ Logged in successfully')

// Get session token
const { data: sessionData } = await sb.auth.getSession()
const token = sessionData.session?.access_token

if (!token) {
  console.log('   ❌ No access token')
  process.exit(1)
}

console.log('   Token:', token.substring(0, 20) + '...')
console.log()

// Try chat with auth
console.log('4. Testing chat with simple message...')
const { data, error } = await sb.functions.invoke('chat', {
  body: {
    message: 'Test sederhana',
    mode: 'free',
  },
})

if (error) {
  console.log('   ❌ Function error:')
  console.log('   Status:', error.context?.status)
  
  const errorBody = await error.context?.json?.().catch(() => null)
  if (errorBody) {
    console.log('   Error:', JSON.stringify(errorBody, null, 2))
  }
  
  console.log()
  console.log('📊 Summary:')
  console.log('   - Function is deployed and reachable ✅')
  console.log('   - Authentication is working ✅')
  console.log('   - Function execution has error:', error.context?.status === 503 ? 'LLM_UNAVAILABLE (likely API key issue)' : 'Unknown error')
  console.log()
  console.log('💡 Next steps:')
  console.log('   1. Get Gemini API key from: https://aistudio.google.com/app/apikey')
  console.log('   2. Add to .env: GEMINI_API_KEY=your_key_here')
  console.log('   3. Run: node --env-file=.env scripts/test-gemini-direct.mjs')
  console.log('   4. If direct test works, update Supabase secret:')
  console.log('      npx supabase secrets set GEMINI_API_KEY="your_key" --remote')
  console.log('      npx supabase functions deploy chat --remote=zhreisaigvyyhogudpld')
  
  process.exit(1)
}

console.log('   ✅ Success!')
console.log('   Response:', JSON.stringify(data, null, 2))
console.log()
console.log('🎉 Everything is working correctly!')
