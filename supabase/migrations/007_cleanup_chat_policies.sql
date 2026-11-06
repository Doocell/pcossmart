-- Clean up all chat_messages policies and recreate correctly
-- This ensures no leftover policies causing security issues

-- Drop ALL existing policies on chat_messages
do $$
declare
  pol record;
begin
  for pol in 
    select policyname 
    from pg_policies 
    where tablename = 'chat_messages'
  loop
    execute format('drop policy if exists %I on chat_messages', pol.policyname);
    raise notice 'Dropped policy: %', pol.policyname;
  end loop;
end $$;

-- Create single correct policy for reading
create policy "authenticated_users_read_own_messages" on chat_messages
  for select
  using (
    auth.uid() is not null 
    and auth.uid() = user_id
  );

-- NO policy for insert/update/delete - those are done via Edge Function with service role
-- This prevents users from tampering with chat history

comment on policy "authenticated_users_read_own_messages" on chat_messages is 
  'Only authenticated users can read their own messages. Unauthenticated requests get empty result.';
