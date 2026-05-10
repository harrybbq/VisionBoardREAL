-- ============================================================
-- VisionBoard Friend Avatars Schema (FEATURE 5 Sprint 2)
-- Run in Supabase SQL Editor any time after social_schema.sql.
-- Idempotent — safe to re-run.
--
-- Purpose:
--   Friend list rows show '@handle' in a circle placeholder. This
--   adds `profiles.avatar_url` so friends see the user's actual
--   photo. Stored as a data URL (base64-encoded resized JPEG) so we
--   don't need to set up Supabase Storage just for this.
--
--   Size cap: client resizes to 96x96 max + ~70% JPEG quality before
--   publish, target ~6-12 KB per avatar. The avatar publishes once
--   when the user uploads or changes their photo (NOT on every state
--   change) — usePublishProfile gates this via a signature check.
--
--   Privacy: rendered ONLY to accepted friends (RLS already filters
--   public_stats to friends; profiles is broader but the avatar
--   read is paired with the same friend gate via the
--   listAcceptedFriends query).
-- ============================================================

alter table profiles
  add column if not exists avatar_url text;

-- No new RLS policies needed — `profiles` already has read policies
-- from social_schema.sql; the avatar_url column inherits those.
-- The handle search RPC selects only `id, handle, display_name,
-- level, avatar_url` so adding the column to that select list
-- exposes avatars in search results only when the user is searchable.
