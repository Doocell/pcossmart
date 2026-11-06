-- Add consent_at field to profiles table
alter table profiles add column if not exists consent_at timestamptz;

-- Update existing profiles to have consent (for testing)
update profiles set consent_at = now() where consent_at is null;
