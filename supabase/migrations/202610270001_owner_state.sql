-- Run once in your Supabase project's SQL Editor. No secrets belong in this file.
create table if not exists public.recall_owner_state (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  version bigint not null check (version >= 0),
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 3000000)
);

-- Only authenticated owner-checked server routes access this table via service_role.
-- Browser roles have no direct access, even if public signup is accidentally enabled.
alter table public.recall_owner_state enable row level security;
revoke all on public.recall_owner_state from anon, authenticated;
grant select, insert, update on public.recall_owner_state to service_role;
