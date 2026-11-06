-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Users profile table (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table profiles enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Daily check-ins table
create table if not exists daily_checkins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  check_date date not null default current_date,
  on_period boolean,
  period_intensity text check (period_intensity in ('light', 'moderate', 'heavy')),
  sleep_hours numeric(4,2),
  energy text,
  mood text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Ensure one check-in per user per day
  unique(user_id, check_date)
);

-- Enable RLS for daily_checkins
alter table daily_checkins enable row level security;

-- Policies for daily_checkins
create policy "Users can view own check-ins"
  on daily_checkins for select using (auth.uid() = user_id);

create policy "Users can insert own check-ins"
  on daily_checkins for insert with check (auth.uid() = user_id);

create policy "Users can update own check-ins"
  on daily_checkins for update using (auth.uid() = user_id);

create policy "Users can delete own check-ins"
  on daily_checkins for delete using (auth.uid() = user_id);

-- Chat messages table
create table if not exists chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz default now()
);

-- Enable RLS for chat_messages
alter table chat_messages enable row level security;

-- Policy for chat_messages (akan diubah di migration berikutnya)
create policy "own chats"
  on chat_messages for all using (auth.uid() = user_id);

-- Create indexes for better performance
create index daily_checkins_user_date_idx on daily_checkins (user_id, check_date desc);
create index chat_messages_user_created_idx on chat_messages (user_id, created_at desc);

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger update_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at_column();

create trigger update_daily_checkins_updated_at
  before update on daily_checkins
  for each row execute function update_updated_at_column();
