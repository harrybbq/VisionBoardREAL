-- ============================================================
-- VisionBoard Ranked Categories Schema (FEATURE 5 Sprint 3)
-- Applied 2026-05-12 via Supabase MCP. Idempotent — safe to re-run.
--
-- Purpose:
--   Server-canonical ratings columns on profiles. Friends read these
--   (NOT the user's claimed S.ratings) so editing one's own JSON
--   doesn't show up to friends. The Netlify recompute-ratings function
--   walks the user's user_data state and writes the canonical values
--   here.
-- ============================================================

alter table profiles
  add column if not exists ratings jsonb default '{}'::jsonb,
  add column if not exists ratings_ovr int default 1,
  add column if not exists ratings_computed_at timestamptz;

-- Index for future leaderboard queries (ordered by OVR desc).
create index if not exists profiles_ratings_ovr_idx
  on profiles (ratings_ovr desc);

-- No new RLS policy needed — `profiles` already has read policies
-- from social_schema.sql; the new columns inherit those. Writes
-- happen via the service-role key in netlify/functions/recompute-ratings,
-- which bypasses RLS.
