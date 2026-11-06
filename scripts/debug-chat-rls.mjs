/**
 * Debug chat_messages RLS issue
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Service role client (bypasses RLS)
const adminClient = createClient(supabaseUrl, serviceRoleKey);

// Anon client (subject to RLS)
const anonClient = createClient(supabaseUrl, anonKey);

console.log('🔍 Debugging chat_messages RLS\n');

// Check what's in the table
console.log('--- Checking chat_messages with service role (bypasses RLS) ---');
const { data: allMessages, error: err1 } = await adminClient
  .from('chat_messages')
  .select('id, user_id, created_at');

if (err1) {
  console.error('❌ Error:', err1.message);
} else {
  console.log(`Found ${allMessages.length} total messages:`);
  allMessages.forEach(msg => {
    console.log(`  - ID: ${msg.id.slice(0, 8)}..., User: ${msg.user_id.slice(0, 8)}...`);
  });
}

console.log('\n--- Checking chat_messages with anon key (subject to RLS) ---');
const { data: anonMessages, error: err2 } = await anonClient
  .from('chat_messages')
  .select('id, user_id, created_at');

if (err2) {
  console.log('✅ RLS working! Error:', err2.message);
} else if (anonMessages.length === 0) {
  console.log('✅ RLS working! No messages returned (empty result)');
} else {
  console.log(`❌ RLS NOT working! Got ${anonMessages.length} messages without auth:`);
  anonMessages.forEach(msg => {
    console.log(`  - ID: ${msg.id.slice(0, 8)}..., User: ${msg.user_id.slice(0, 8)}...`);
  });
}

console.log('\n--- Checking RLS status via SQL ---');
const { data: rlsCheck, error: err3 } = await adminClient.rpc('check_rls_enabled', {
  table_name: 'chat_messages'
}).catch(() => null);

// If RPC doesn't exist, try direct SQL
const { data: sqlCheck, error: err4 } = await adminClient
  .from('pg_class')
  .select('relname, relrowsecurity')
  .eq('relname', 'chat_messages')
  .single()
  .catch(() => ({ data: null, error: null }));

if (sqlCheck) {
  console.log('SQL check:', sqlCheck);
}

console.log('\nDone!');
process.exit(0);
