-- Fix: Ensure chat_messages RLS policies are correct
-- Users must be authenticated to read their own messages

-- Drop existing policies
drop policy if exists "read own chats" on chat_messages;

-- Recreate with explicit auth check
create policy "authenticated users read own chats" on chat_messages
  for select
  using (
    auth.uid() is not null 
    and auth.uid() = user_id
  );

-- Add comment for clarity
comment on policy "authenticated users read own chats" on chat_messages is 
  'Users can only read their own chat messages when authenticated. Unauthenticated requests return empty.';
