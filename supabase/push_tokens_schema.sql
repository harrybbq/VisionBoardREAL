-- ============================================================
-- VisionBoard Push Tokens Schema
-- Run this in the Supabase SQL Editor any time after the social /
-- notifications schemas are in place. Idempotent — safe to re-run.
--
-- Why this exists:
--   The first push wiring stashed tokens inside `user_data.state.pushTokens`.
--   Updating that JSON required a read-modify-write of the whole `state`
--   column, which races with the client's debounced auto-save:
--
--     - Push handler reads state at T0
--     - Client edits + auto-saves at T1 (T1 > T0)
--     - Push handler writes back stale state at T2 — wiping T1 edits
--
--   And worse: if the read returned a transient empty result, the
--   write became `{ state: { pushTokens: [...] } }`, wiping every
--   other field. This caused a real production data loss on phone
--   on 2026-05-03.
--
--   Solution: tokens live in their own table. user_data is touched
--   only by the main state hook (which already has defensive guards).
-- ============================================================

create table if not exists push_tokens (
  user_id      uuid not null references auth.users(id) on delete cascade,
  token        text not null,
  platform     text not null default 'unknown'
               check (platform in ('ios', 'android', 'web', 'unknown')),
  registered_at timestamptz not null default now(),
  -- Bumped on every re-registration so the dispatcher can prune
  -- tokens that haven't been seen in N days as a coarse health check.
  last_seen_at  timestamptz not null default now(),
  primary key (user_id, token)
);

create index if not exists push_tokens_user_idx
  on push_tokens (user_id);

-- Most-recently-seen first when the dispatcher picks a token to send to
create index if not exists push_tokens_user_seen_idx
  on push_tokens (user_id, last_seen_at desc);

-- ── RLS ─────────────────────────────────────────────────────
alter table push_tokens enable row level security;

drop policy if exists "push_tokens: own read" on push_tokens;
create policy "push_tokens: own read"
  on push_tokens for select
  using (auth.uid() = user_id);

drop policy if exists "push_tokens: own insert" on push_tokens;
create policy "push_tokens: own insert"
  on push_tokens for insert
  with check (auth.uid() = user_id);

drop policy if exists "push_tokens: own update" on push_tokens;
create policy "push_tokens: own update"
  on push_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push_tokens: own delete" on push_tokens;
create policy "push_tokens: own delete"
  on push_tokens for delete
  using (auth.uid() = user_id);

-- The Netlify push-dispatch function uses the service-role key, which
-- bypasses RLS automatically — no extra policy needed for it.

-- ============================================================
-- One-time migration: copy any existing tokens out of
-- user_data.state.pushTokens into the new table, then null out the
-- old field so the next state save doesn't keep them around.
-- Safe to re-run; insert is on conflict do nothing.
-- ============================================================
insert into push_tokens (user_id, token, platform, registered_at, last_seen_at)
select
  id as user_id,
  (tk->>'token') as token,
  coalesce(tk->>'platform', 'unknown') as platform,
  coalesce((tk->>'registeredAt')::timestamptz, now()) as registered_at,
  coalesce((tk->>'registeredAt')::timestamptz, now()) as last_seen_at
from user_data,
  lateral jsonb_array_elements(coalesce(state->'pushTokens', '[]'::jsonb)) as tk
where tk->>'token' is not null
on conflict (user_id, token) do nothing;

-- Strip the now-redundant pushTokens key from every state blob so
-- the client doesn't carry stale legacy data around forever.
update user_data
   set state = state - 'pushTokens'
 where state ? 'pushTokens';
