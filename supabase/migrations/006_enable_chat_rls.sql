-- Ensure RLS is enabled on chat_messages table
-- If RLS is not enabled, all queries return all rows regardless of policies

-- Enable RLS (idempotent - safe to run multiple times)
alter table chat_messages enable row level security;

-- Verify by checking if RLS is enabled
do $$
begin
  if not (select relrowsecurity from pg_class where relname = 'chat_messages') then
    raise exception 'RLS is not enabled on chat_messages!';
  end if;
  raise notice 'RLS is enabled on chat_messages ✓';
end $$;
