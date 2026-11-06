/**
 * Test Row Level Security (RLS) policies
 * 
 * Usage: node --env-file=.env scripts/test-rls.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Don't persist session - fresh anon client every time
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

console.log('🧪 Testing Row Level Security (RLS) Policies\n');
console.log('📍 Supabase URL:', supabaseUrl);
console.log('🔑 Using Anon Key\n');

async function testPublicArticles() {
  console.log('--- Test 1: Public can read published articles ---');
  
  const { data, error } = await supabase
    .from('education_articles')
    .select('*')
    .eq('published', true);
  
  if (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
  
  console.log(`✅ Success: Found ${data.length} published articles`);
  data.forEach(article => {
    console.log(`   - ${article.title} (${article.category})`);
  });
  console.log();
  return true;
}

async function testUnauthenticatedCheckIn() {
  console.log('--- Test 2: Unauthenticated user cannot insert check-in ---');
  
  const { data, error } = await supabase
    .from('daily_checkins')
    .insert({
      user_id: '00000000-0000-0000-0000-000000000000', // fake UUID
      on_period: false,
      energy: 'good',
      mood: 'happy'
    })
    .select();
  
  if (error) {
    console.log('✅ Expected error:', error.message);
    console.log('   RLS is working correctly!\n');
    return true;
  }
  
  console.error('❌ Unexpected: Insert succeeded when it should have been blocked');
  console.error('   Data:', data);
  console.log();
  return false;
}

async function testUnauthenticatedChatRead() {
  console.log('--- Test 3: Unauthenticated user cannot read chat messages ---');
  
  // First check current auth state
  const { data: { user } } = await supabase.auth.getUser();
  console.log('   Current auth user:', user ? user.id : 'null (not authenticated)');
  
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*');
  
  if (error) {
    console.log('✅ Expected error:', error.message);
    console.log('   RLS is working correctly!\n');
    return true;
  }
  
  if (data.length === 0) {
    console.log('✅ No data returned (empty result is OK for unauthenticated)');
    console.log('   RLS is working correctly!\n');
    return true;
  }
  
  console.error('❌ Unexpected: Got chat messages when user is not authenticated');
  console.error('   Data count:', data.length);
  console.error('   First message user_id:', data[0]?.user_id);
  console.log();
  return false;
}

async function testProfilesRead() {
  console.log('--- Test 4: Public can view profiles (if any exist) ---');
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*');
  
  if (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
  
  console.log(`✅ Success: Found ${data.length} profiles`);
  if (data.length > 0) {
    console.log('   Note: Profiles are publicly viewable by design');
  } else {
    console.log('   (No profiles exist yet)');
  }
  console.log();
  return true;
}

// Run all tests
async function runTests() {
  const results = [];
  
  results.push(await testPublicArticles());
  results.push(await testUnauthenticatedCheckIn());
  results.push(await testUnauthenticatedChatRead());
  results.push(await testProfilesRead());
  
  console.log('='.repeat(50));
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  if (passed === total) {
    console.log(`✅ All tests passed! (${passed}/${total})`);
    process.exit(0);
  } else {
    console.log(`❌ Some tests failed: ${passed}/${total} passed`);
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
