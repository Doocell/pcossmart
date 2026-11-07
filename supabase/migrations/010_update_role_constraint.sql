-- Update role constraint to allow 'model' instead of 'assistant'
-- Per API Contract: role harus 'user' | 'model' | 'system'

-- Drop existing constraint
alter table chat_messages drop constraint if exists chat_messages_role_check;

-- Add new constraint with 'model'
alter table chat_messages add constraint chat_messages_role_check
  check (role in ('user', 'model', 'system'));

-- Update existing 'assistant' records to 'model' (if any)
update chat_messages set role = 'model' where role = 'assistant';
