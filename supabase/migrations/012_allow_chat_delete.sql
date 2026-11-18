-- Allow authenticated users to delete their own chat messages (aligned with daily_checkins DELETE policy & UU PDP)
drop policy if exists "users_delete_own_messages" on public.chat_messages;

create policy "users_delete_own_messages" on public.chat_messages
  for delete
  to authenticated
  using (
    auth.uid() is not null
    and auth.uid() = user_id
  );

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'chat_messages'
      and policyname = 'users_delete_own_messages'
      and cmd = 'DELETE'
  ) then
    raise exception 'DELETE policy users_delete_own_messages was not created!';
  end if;
end $$;
