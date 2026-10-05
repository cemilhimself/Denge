-- Run this once in the Supabase SQL Editor.
-- A signed-in user can read and update only their own Denge backup row.
create table if not exists public.denge_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{"months":{}}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.denge_data enable row level security;

drop policy if exists "Read own Denge data" on public.denge_data;
create policy "Read own Denge data"
  on public.denge_data for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Insert own Denge data" on public.denge_data;
create policy "Insert own Denge data"
  on public.denge_data for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Update own Denge data" on public.denge_data;
create policy "Update own Denge data"
  on public.denge_data for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.denge_data from public, anon, authenticated;
grant select, insert, update on public.denge_data to authenticated;
