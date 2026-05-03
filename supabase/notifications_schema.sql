-- ============================================================
-- VisionBoard Notifications Queue Schema
-- Run this in the Supabase SQL Editor AFTER social_schema.sql.
-- Idempotent — safe to re-run.
--
-- Purpose:
--   Server-side push delivery needs a queue. Triggers on `friendships`
--   (and, later, `coach_nudges`) insert rows here; the Netlify
--   `push-dispatch` function reads pending rows, sends via FCM/APNs,
--   and stamps `sent_at`.
--
--   Decoupling "something happened" from "send a push" means:
--     1. App-side mutations don't block on the network call.
--     2. Failed sends can be retried without re-running the trigger.
--     3. We have a durable audit trail of every push attempted.
--
-- Order:
--   1. Create the table.
--   2. Enable RLS, attach policies (service-role only writes; users
--      can read their own pending rows for in-app surfacing later).
--   3. Trigger functions on `friendships` to enqueue events.
-- ============================================================

-- ── 1. notifications_queue table ────────────────────────────
create table if not exists notifications_queue (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  -- Wire format kebab-case, mirrors the `data.kind` field of the push
  -- payload. Client maps these to S.notifications keys via KIND_TO_PREF
  -- in src/lib/push/handlers.js.
  kind            text not null
                  check (kind in (
                    'friend-request',
                    'friend-accepted',
                    'streak-warning',
                    'coach-nudge',
                    'vision-unlock',
                    'daily-reminder'
                  )),
  -- Free-form payload for the dispatcher: title, body, deep_link,
  -- referenced ids. Keeps the schema flexible without per-kind columns.
  payload         jsonb not null default '{}'::jsonb,
  -- Future: scheduled fan-out (daily reminders, streak warnings sent
  -- at 9pm local). For now most rows have scheduled_at = created_at
  -- and the dispatcher fires them on the next sweep.
  scheduled_at    timestamptz not null default now(),
  sent_at         timestamptz,
  -- Last attempt timestamp + count let the dispatcher back off on
  -- repeatedly-failing tokens (e.g. uninstalled app).
  last_attempt_at timestamptz,
  attempt_count   int not null default 0,
  -- If sent fails terminally (token rejected by FCM/APNs), the
  -- dispatcher records the reason and stops retrying.
  error           text,
  created_at      timestamptz not null default now()
);

create index if not exists notifications_queue_pending_idx
  on notifications_queue (scheduled_at)
  where sent_at is null and (error is null or attempt_count < 5);

create index if not exists notifications_queue_user_idx
  on notifications_queue (user_id, created_at desc);

-- ── 2. RLS policies ─────────────────────────────────────────
alter table notifications_queue enable row level security;

drop policy if exists "notifications_queue: own read" on notifications_queue;
create policy "notifications_queue: own read"
  on notifications_queue for select
  using (auth.uid() = user_id);

-- No client INSERT/UPDATE/DELETE — only server-side triggers and the
-- dispatcher (running with the service role key) write here.
drop policy if exists "notifications_queue: no client writes" on notifications_queue;
create policy "notifications_queue: no client writes"
  on notifications_queue for all
  to authenticated
  using (false)
  with check (false);

-- ── 3. Trigger: enqueue friend request push ─────────────────
-- When a row is INSERTed into friendships with status='pending',
-- enqueue a push for the addressee. Bypasses the user's pref check
-- here — that gating happens at dispatch time so prefs stay client-
-- editable without needing a refresh of any cached SQL state.
create or replace function enqueue_friend_request_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_handle text;
  requester_name   text;
begin
  if new.status = 'pending' then
    select handle, coalesce(display_name, handle)
      into requester_handle, requester_name
      from profiles
     where id = new.requester_id;

    insert into notifications_queue (user_id, kind, payload)
    values (
      new.addressee_id,
      'friend-request',
      jsonb_build_object(
        'title', 'New friend request',
        'body',  coalesce(requester_name, 'Someone') || ' wants to add you',
        'requester_id', new.requester_id,
        'requester_handle', requester_handle
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_friendships_enqueue_request on friendships;
create trigger trg_friendships_enqueue_request
  after insert on friendships
  for each row
  execute function enqueue_friend_request_push();

-- ── 4. Trigger: enqueue friend acceptance push ──────────────
-- When status flips from 'pending' to 'accepted', notify the original
-- requester. Skip if accepted_at was already set (defensive against
-- double-fires from idempotent client code).
create or replace function enqueue_friend_accept_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  addressee_handle text;
  addressee_name   text;
begin
  if old.status = 'pending'
     and new.status = 'accepted'
     and old.accepted_at is null then
    select handle, coalesce(display_name, handle)
      into addressee_handle, addressee_name
      from profiles
     where id = new.addressee_id;

    insert into notifications_queue (user_id, kind, payload)
    values (
      new.requester_id,
      'friend-accepted',
      jsonb_build_object(
        'title', addressee_name || ' accepted your friend request',
        'body',  'Tap to see their profile',
        'friend_id', new.addressee_id,
        'friend_handle', addressee_handle
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_friendships_enqueue_accept on friendships;
create trigger trg_friendships_enqueue_accept
  after update on friendships
  for each row
  execute function enqueue_friend_accept_push();

-- ── 5. Helper view: pending pushes for the dispatcher ───────
-- The Netlify dispatcher selects from this view to get only rows
-- ready to send. Service-role only (RLS blocks client reads of the
-- whole queue, but the view inherits the table's RLS).
create or replace view notifications_pending as
  select *
    from notifications_queue
   where sent_at is null
     and (error is null or attempt_count < 5)
     and scheduled_at <= now()
   order by scheduled_at asc;

-- ============================================================
-- Done. After running this, friend-request and friend-accept events
-- will populate notifications_queue. The Netlify push-dispatch
-- function (netlify/functions/push-dispatch.js) reads the queue,
-- sends via FCM/APNs, and stamps sent_at.
-- ============================================================
