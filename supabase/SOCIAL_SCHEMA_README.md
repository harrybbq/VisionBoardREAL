# VisionBoard Social Schema — Apply Notes

`social_schema.sql` extends the existing paywall `profiles` table and
adds the friend-graph + public-stats infrastructure used by the
Friends rail in the cream hub.

## Order of operations

1. Run `paywall_schema.sql` first (already done if Pro / waitlist work).
2. Run `social_schema.sql` in the Supabase SQL editor.

The migration is **idempotent** — re-running it is safe. All `create`
statements use `if not exists`; all RLS policies are dropped and
re-created so a re-run reflects edits to the policy bodies.

## What it changes

| Object | Action |
|---|---|
| `profiles` | `alter table … add column` for `handle`, `display_name`, `avatar_url`, `level`, `is_searchable`, `last_active_at`. **Existing rows keep their tier**. |
| `profiles` RLS | Replaces the `own read` policy with `visible read` (self / searchable / friend). Adds `self update` so the client can write the social columns. **Tier remains untouchable from the client.** |
| `friendships` | New table. Status flow: `pending` → `accepted`. Decline / unfriend = delete row. |
| `friendships` triggers | Friend cap: `tier='free'` → 5 accepted friends, `pro`/`lifetime` → unlimited. Fires on insert AND update. |
| `public_stats` | New table. Per-user activity payload (heatmap days, streak, recent wins). Friends-only read. |
| `blocks` | New table. Terminal block prevents new friendship rows in either direction. |
| `reports` | New table. Insert-only moderation queue. |
| `search_profiles_by_handle(q)` | New SECURITY DEFINER RPC. Prefix search across searchable handles, capped at 10, self + blocked excluded. |

## What it deliberately does NOT do

- **Does not migrate existing user data** into `display_name` / `avatar_url`. The client backfills these the first time the user opens the Friends rail (see `usePublishProfile.js`). This avoids a one-shot SQL migration that has to know about `auth.users.user_metadata`.
- **Does not seed handles**. Users claim handles lazily via the in-app modal. Existing accounts with no handle simply can't be searched until they claim one.
- **Does not create indexes on `public_stats`**. The table is keyed by `user_id` (PK) — every common query is by user_id and that's covered.

## Friend cap mechanics

The cap is enforced two ways:

- **Server-side trigger** — checks both parties' tier on insert and
  update. A free user at 5 accepted friends cannot have a 6th accepted
  in either direction. The error message surfaces in the Postgres
  error which the client maps to a friendly "limit reached / upgrade"
  message.
- **Client-side** — `useFriends` reads the count and gates the "Add"
  button at 5 for free users, with a Pro upsell.

If you change the cap (e.g. raise to 10 to test), update **both** the
trigger in this file AND the constant in `src/lib/friends/queries.js`
(`FREE_FRIEND_CAP`).

## Rolling back

A reversal script isn't shipped. To undo:

```sql
drop function if exists search_profiles_by_handle(text);
drop table if exists reports;
drop table if exists blocks;
drop table if exists public_stats;
drop trigger if exists friendship_cap_check_update on friendships;
drop trigger if exists friendship_cap_check_insert on friendships;
drop function if exists check_friend_cap();
drop table if exists friendships;
alter table profiles
  drop column if exists last_active_at,
  drop column if exists is_searchable,
  drop column if exists level,
  drop column if exists avatar_url,
  drop column if exists display_name,
  drop column if exists handle;
alter table profiles drop constraint if exists profiles_handle_format;
-- And restore the original "profiles: own read" policy.
drop policy if exists "profiles: visible read" on profiles;
drop policy if exists "profiles: self update" on profiles;
create policy "profiles: own read" on profiles for select using (auth.uid() = id);
```

Be aware that `drop table` cascades to foreign key references; in
particular `friendships` references `auth.users(id)` and dropping it
also drops every friendship row. Take a backup before rolling back in
production.

## Testing the cap locally

```sql
-- Make a fake free user hit the cap
update profiles set tier = 'free' where id = '<user-uuid>';
-- Insert 5 accepted rows manually
insert into friendships (requester_id, addressee_id, status, accepted_at)
  values ('<user-uuid>', gen_random_uuid(), 'accepted', now());
-- 6th should raise: "Friend limit reached for this account (Free tier: 5 friends)."
```
