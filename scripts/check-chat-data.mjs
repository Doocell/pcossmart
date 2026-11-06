/**
 * Check chat_messages data and policies
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

console.log('🔍 Checking chat_messages data\n');

// Test 1: Without auth
console.log('--- Test 1: Query without auth ---');
const { data: noAuthData, error: noAuthError } = await supabase
  .from('chat_messages')
  .select('id, user_id, role, created_at');

console.log('Error:', noAuthError?.message || 'none');
console.log('Data count:', noAuthData?.length || 0);
if (noAuthData && noAuthData.length > 0) {
  console.log('Sample:', noAuthData[0]);
}

// Test 2: With auth
console.log('\n--- Test 2: Query with auth (sign in first) ---');
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: process.env.TEST_A_EMAIL,
  password: process.env.TEST_A_PASSWORD
});

if (authError) {
  console.log('❌ Login failed:', authError.message);
} else {
  console.log('✅ Logged in as:', authData.user.id);
  
  const { data: withAuthData, error: withAuthError } = await supabase
    .from('chat_messages')
    .select('id, user_id, role, created_at');
  
  console.log('Error:', withAuthError?.message || 'none');
  console.log('Data count:', withAuthData?.length || 0);
  
  // Check if all messages belong to current user
  if (withAuthData && withAuthData.length > 0) {
    const allOwnedByUser = withAuthData.every(msg => msg.user_id === authData.user.id);
    console.log('All messages owned by user?', allOwnedByUser);
    
    if (!allOwnedByUser) {
      console.log('❌ Found messages from other users!');
      const otherUsers = [...new Set(withAuthData.map(m => m.user_id))];
      console.log('User IDs found:', otherUsers);
    }
  }
}

console.log('\nDone!');
process.exit(0);
