-- ── Server-side snapshot history for user_data ──────────────────────────────
--
-- Lightweight automatic restore points so recovering a wiped row never needs
-- a full-DB PITR again. A BEFORE UPDATE trigger on user_data archives the OLD
-- state when:
--   1. it's about to be wiped (meaningful → not meaningful) → reason 'pre-wipe'
--   2. otherwise at most once per ~day                       → reason 'daily'
--
-- Heavy images (backgrounds + profile photo) are stripped from snapshots so
-- they stay tiny (~few KB), and only the newest 14 per user are kept.
--
-- This complements the client-side read-before-write wipe guard
-- (src/hooks/useVisionBoardState.js): the client refuses to persist a
-- default-looking state over real data, and this trigger preserves the old
-- good state in the rare event a destructive write still reaches the DB.
--
-- Apply: run in the Supabase SQL editor (or via the MCP apply_migration).

create table if not exists public.user_data_history (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  state       jsonb not null,
  reason      text not null default 'auto',
  snapshot_at timestamptz not null default now()
);
create index if not exists user_data_history_user_idx
  on public.user_data_history (user_id, snapshot_at desc);

alter table public.user_data_history enable row level security;
-- Users may read their own snapshots (enables a future in-app restore).
-- No client writes — only the SECURITY DEFINER trigger inserts.
drop policy if exists "own history read" on public.user_data_history;
create policy "own history read" on public.user_data_history
  for select using (auth.uid() = user_id);

-- ── Safe jsonb helpers (never error on unexpected shapes) ──
create or replace function public.vb_arrlen(j jsonb) returns int
language sql immutable as $$
  select case when jsonb_typeof(j) = 'array' then jsonb_array_length(j) else 0 end;
$$;

create or replace function public.vb_objlen(j jsonb) returns int
language sql stable as $$
  select case when jsonb_typeof(j) = 'object'
    then (select count(*)::int from jsonb_object_keys(j)) else 0 end;
$$;

-- Mirrors hasMeaningfulData() in src/hooks/useVisionBoardState.js.
create or replace function public.vb_state_meaningful(s jsonb) returns boolean
language sql stable as $$
  select coalesce(s is not null and (
       vb_arrlen(s->'savings') > 0
    or vb_arrlen(s->'habits') > 0
    or vb_arrlen(s->'shopItems') > 0
    or vb_arrlen(s->'links') > 0
    or vb_objlen(s->'logs') > 0
    or coalesce(nullif(s->>'coins','')::numeric, 0) > 0
    or coalesce(s->'profile'->>'name','') <> ''
    or vb_arrlen(s->'achievements') > 4
    or vb_arrlen(s->'trackers') > 3
    or (nullif(s->>'brainScore','') is not null and s->>'brainScore' <> 'null')
    or exists (
        select 1 from jsonb_array_elements(
          case when jsonb_typeof(s->'achievements') = 'array' then s->'achievements' else '[]'::jsonb end
        ) e where coalesce((e->>'completed')::boolean, false))
  ), false);
$$;

create or replace function public.vb_snapshot_user_data() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  snap jsonb;
  last_snap timestamptz;
  do_snapshot boolean := false;
  snap_reason text := 'daily';
begin
  -- Only worth archiving when the OLD row actually held real data.
  if not vb_state_meaningful(OLD.state) then
    return NEW;
  end if;

  if not vb_state_meaningful(NEW.state) then
    -- Wipe in progress — always preserve the old good state.
    do_snapshot := true;
    snap_reason := 'pre-wipe';
  else
    select max(snapshot_at) into last_snap
      from public.user_data_history where user_id = OLD.id;
    if last_snap is null or last_snap < now() - interval '20 hours' then
      do_snapshot := true;
      snap_reason := 'daily';
    end if;
  end if;

  if do_snapshot then
    -- Lightweight: strip heavy images; the recoverable data stays tiny.
    snap := OLD.state - 'backgrounds';
    if snap ? 'profile' then
      snap := jsonb_set(snap, '{profile,photo}', 'null'::jsonb, false);
    end if;
    insert into public.user_data_history (user_id, state, reason)
      values (OLD.id, snap, snap_reason);
    -- Keep only the newest 14 per user.
    delete from public.user_data_history h
     where h.user_id = OLD.id
       and h.id not in (
         select id from public.user_data_history
          where user_id = OLD.id
          order by snapshot_at desc
          limit 14
       );
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_snapshot_user_data on public.user_data;
create trigger trg_snapshot_user_data
  before update on public.user_data
  for each row execute function public.vb_snapshot_user_data();
