-- ============================================================
-- VisionBoard Pro Paywall Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── 1. Profiles table ────────────────────────────────────────
create table if not exists profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  tier              text not null default 'free' check (tier in ('free', 'pro', 'lifetime')),
  tier_updated_at   timestamptz,
  waitlist_joined_at timestamptz
);

-- Enable RLS
alter table profiles enable row level security;

-- Users can read their own row
create policy "profiles: own read"
  on profiles for select
  using (auth.uid() = id);

-- Users can insert their own row (upsert on first login)
create policy "profiles: own insert"
  on profiles for insert
  with check (auth.uid() = id);

-- Only service role can update tier (client can't elevate itself)
-- Regular users cannot update at all from the client
-- (Tier upgrades happen server-side via service role key)

-- ── 2. Config table ──────────────────────────────────────────
create table if not exists config (
  key   text primary key,
  value text not null
);

-- Public read — everyone can check the pro_live flag
alter table config enable row level security;

create policy "config: public read"
  on config for select
  using (true);

-- Seed the master switch
insert into config (key, value)
values ('pro_live', 'false')
on conflict (key) do nothing;

-- ── 3. Waitlist table ────────────────────────────────────────
create table if not exists waitlist (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  email        text not null,
  joined_at    timestamptz not null default now(),
  notified_at  timestamptz
);

alter table waitlist enable row level security;

-- Users can insert their own waitlist row
create policy "waitlist: own insert"
  on waitlist for insert
  with check (auth.uid() = user_id);

-- Users cannot read other people's waitlist entries
-- (no select policy for authenticated users on individual rows)

-- Count queries are allowed via a separate unrestricted view
create or replace view waitlist_count as
  select count(*) as total from waitlist;

-- Grant anonymous + authenticated read on the count view
grant select on waitlist_count to anon, authenticated;
