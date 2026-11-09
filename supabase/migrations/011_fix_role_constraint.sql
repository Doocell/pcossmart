-- Fix role constraint: kontrak hanya mengizinkan 'user' dan 'model'
-- Migration 010 menambahkan 'system' yang tidak sesuai kontrak

-- Drop existing constraint
alter table chat_messages drop constraint if exists chat_messages_role_check;

-- Add correct constraint (hanya 'user' dan 'model')
alter table chat_messages add constraint chat_messages_role_check
  check (role in ('user', 'model'));

-- Pastikan tidak ada data 'system' (safeguard)
-- Jika ada, ubah ke 'model' (default fallback)
update chat_messages set role = 'model' where role = 'system';
