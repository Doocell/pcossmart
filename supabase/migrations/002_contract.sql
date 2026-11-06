-- Check-in: perketat aturan data
alter table daily_checkins alter column on_period set not null;
alter table daily_checkins alter column energy set not null;
alter table daily_checkins alter column mood set not null;
alter table daily_checkins add constraint sleep_hours_range
  check (sleep_hours between 0 and 24);
alter table daily_checkins add constraint intensity_needs_period
  check (on_period or period_intensity is null);

-- Chat: kolom tambahan dan hanya server yang boleh menulis
alter table chat_messages add column flag_level text not null default 'none'
  check (flag_level in ('none','warning','severe','crisis'));
alter table chat_messages add column meta jsonb;

drop policy "own chats" on chat_messages;
create policy "read own chats" on chat_messages for select
  using (auth.uid() = user_id);

create index chat_messages_user_time_idx
  on chat_messages (user_id, created_at desc);