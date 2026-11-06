/**
 * Test Gemini integration dengan detail error
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const sb = createClient(url, key)

console.log('🧪 Testing Gemini Integration\n')
console.log('📍 Supabase URL:', url)
console.log('🔑 Using Anon Key\n')

// Login sebagai test user A
const { error: loginError } = await sb.auth.signInWithPassword({
  email: process.env.TEST_A_EMAIL || 'test-user-a@example.com',
  password: process.env.TEST_A_PASSWORD || 'testpassword123',
})

if (loginError) {
  console.error('❌ Login failed:', loginError.message)
  process.exit(1)
}

console.log('✅ Logged in as test user A\n')

// Test chat dengan pesan simple
console.log('--- Testing Chat with Gemini ---\n')
console.log('Sending message: "Halo, bagaimana kabarmu?"\n')

const { data, error } = await sb.functions.invoke('chat', {
  body: {
    message: 'Halo, bagaimana kabarmu?',
    mode: 'free',
  },
})

if (error) {
  console.error('❌ Chat function error:')
  console.error('   Status:', error.context?.status)
  
  const errorBody = await error.context?.json?.().catch(() => null)
  if (errorBody) {
    console.error('   Error code:', errorBody.error?.code)
    console.error('   Error message:', errorBody.error?.message)
    console.error('   Full response:', JSON.stringify(errorBody, null, 2))
  } else {
    console.error('   Raw error:', error)
  }
  
  console.log('\n💡 Troubleshooting tips:')
  console.log('   1. Check if GEMINI_API_KEY is set correctly in Supabase secrets')
  console.log('   2. View function logs in dashboard: https://supabase.com/dashboard/project/zhreisaigvyyhogudpld/functions')
  console.log('   3. Check Gemini API quota: https://aistudio.google.com/app/apikey')
  
  process.exit(1)
}

if (data) {
  console.log('✅ Chat function success!\n')
  console.log('Response:')
  console.log('   User message ID:', data.user_message_id)
  console.log('   Reply ID:', data.reply.id)
  console.log('   Reply text:', data.reply.text)
  console.log('   Card:', data.reply.card ? 'Yes' : 'No')
  console.log('   Sources:', data.reply.sources?.length || 0)
  console.log('   Flag level:', data.flag.level)
  console.log('   Remaining this hour:', data.usage.remaining_this_hour)
  
  console.log('\n✅ Gemini integration working! 🎉')
}
