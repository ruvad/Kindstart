-- Kindstart: the table that keeps each person's data, and the rules that protect it.
-- Run this ONCE in Supabase: SQL Editor -> New query -> paste everything -> Run.
-- (Running it a second time stops at "policy already exists"; that's harmless.)

-- One row per person: their whole app data as JSON.
create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security: with it on, nobody can read or change a row unless a policy below allows it.
alter table public.user_data enable row level security;

-- Each signed-in person can only see and change their OWN row (auth.uid() = who is signed in).
create policy "Read own data" on public.user_data
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Add own data" on public.user_data
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Change own data" on public.user_data
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Delete own data" on public.user_data
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Supabase gives new tables to every role at first. People who aren't signed in get nothing.
revoke all on public.user_data from anon;
grant select, insert, update, delete on public.user_data to authenticated;
