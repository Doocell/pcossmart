-- FORCE FIX: Completely rebuild chat_messages RLS
-- This will drop ALL policies and recreate from scratch

-- Step 1: Disable RLS temporarily
alter table chat_messages disable row level security;

-- Step 2: Drop ALL existing policies
do $$
declare
  pol record;
begin
  for pol in 
    select policyname 
    from pg_policies 
    where schemaname = 'public' 
    and tablename = 'chat_messages'
  loop
    execute format('drop policy if exists %I on public.chat_messages', pol.policyname);
    raise notice 'Dropped policy: %', pol.policyname;
  end loop;
end $$;

-- Step 3: Re-enable RLS
alter table chat_messages enable row level security;

-- Step 4: Force RLS even for table owner
alter table chat_messages force row level security;

-- Step 5: Create single correct policy
create policy "users_read_own_messages" on chat_messages
  for select
  to public
  using (
    auth.uid() is not null 
    and auth.uid() = user_id
  );

-- Verify
do $$
begin
  -- Check RLS is enabled
  if not (select relrowsecurity from pg_class where relname = 'chat_messages' and relnamespace = 'public'::regnamespace) then
    raise exception 'RLS NOT ENABLED!';
  end if;
  
  -- Check FORCE RLS is enabled
  if not (select relforcerowsecurity from pg_class where relname = 'chat_messages' and relnamespace = 'public'::regnamespace) then
    raise exception 'FORCE RLS NOT ENABLED!';
  end if;
  
  -- Check policy exists
  if not exists (select 1 from pg_policies where tablename = 'chat_messages' and policyname = 'users_read_own_messages') then
    raise exception 'POLICY NOT CREATED!';
  end if;
  
  raise notice '✓ RLS enabled';
  raise notice '✓ Force RLS enabled';
  raise notice '✓ Policy created';
end $$;
