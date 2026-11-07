-- CHECK-IN: samakan dengan kontrak (data check-in uji dihapus dulu supaya tipe kolom bisa diganti)
delete from daily_checkins;
alter table daily_checkins rename column check_date to checkin_date;
alter table daily_checkins alter column checkin_date drop default;
alter table daily_checkins drop column energy, drop column mood;
alter table daily_checkins
  add column energy integer not null check (energy between 1 and 5),
  add column mood integer not null check (mood between 1 and 5),
  add column symptoms text[] not null default '{}'
    check (symptoms <@ array['nyeri_perut','jerawat','rambut_rontok','rambut_berlebih','lelah','cemas','kembung','sulit_tidur']);
alter table daily_checkins drop constraint daily_checkins_period_intensity_check;
alter table daily_checkins add constraint period_intensity_slug
  check (period_intensity in ('ringan','sedang','deras'));
alter table daily_checkins add constraint notes_len check (char_length(notes) <= 500);

-- PROFIL: kolom sesuai kontrak + tutup akses publik
alter table profiles add column nickname text check (char_length(nickname) between 2 and 30);
alter table profiles add column age_range text check (age_range in ('15-17','18-24','25-34','35-44'));
update profiles set nickname = 'Pengguna', age_range = '18-24' where nickname is null; -- hanya akun uji
alter table profiles alter column nickname set not null;
alter table profiles alter column age_range set not null;
drop policy "Public profiles are viewable by everyone" on profiles;
create policy "read own profile" on profiles for select to authenticated using (auth.uid() = id);

-- CHAT: role sesuai kontrak
alter table chat_messages drop constraint chat_messages_role_check;
update chat_messages set role = 'model' where role = 'assistant';
alter table chat_messages add constraint chat_messages_role_check check (role in ('user','model'));