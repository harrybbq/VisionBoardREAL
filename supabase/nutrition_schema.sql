-- ═══════════════════════════════════════
-- Vision Board — Nutrition Schema
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════

-- ── nutrition_macros ──────────────────────────────────────────
create table if not exists nutrition_macros (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  unit          text not null,
  daily_goal    numeric not null default 0,
  color         text not null default '#1a7a4a',
  display_order int not null default 0,
  is_default    boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table nutrition_macros enable row level security;
create policy "nutrition_macros: own read"   on nutrition_macros for select using (auth.uid() = user_id);
create policy "nutrition_macros: own insert" on nutrition_macros for insert with check (auth.uid() = user_id);
create policy "nutrition_macros: own update" on nutrition_macros for update using (auth.uid() = user_id);
create policy "nutrition_macros: own delete" on nutrition_macros for delete using (auth.uid() = user_id);

-- ── nutrition_log ─────────────────────────────────────────────
create table if not exists nutrition_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  log_date        date not null,
  meal_type       text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  food_name       text not null,
  brand           text,
  barcode         text,
  serving_g       numeric not null default 100,
  calories        numeric not null default 0,
  protein_g       numeric not null default 0,
  carbs_g         numeric not null default 0,
  fat_g           numeric not null default 0,
  fibre_g         numeric not null default 0,
  sugar_g         numeric not null default 0,
  sodium_mg       numeric not null default 0,
  additional_nutrients jsonb not null default '{}',
  source          text,
  created_at      timestamptz not null default now()
);

alter table nutrition_log enable row level security;
create policy "nutrition_log: own read"   on nutrition_log for select using (auth.uid() = user_id);
create policy "nutrition_log: own insert" on nutrition_log for insert with check (auth.uid() = user_id);
create policy "nutrition_log: own update" on nutrition_log for update using (auth.uid() = user_id);
create policy "nutrition_log: own delete" on nutrition_log for delete using (auth.uid() = user_id);

-- ── nutrition_daily_summary ───────────────────────────────────
create table if not exists nutrition_daily_summary (
  user_id      uuid not null references auth.users(id) on delete cascade,
  log_date     date not null,
  primary key  (user_id, log_date),
  calories     numeric not null default 0,
  protein_g    numeric not null default 0,
  carbs_g      numeric not null default 0,
  fat_g        numeric not null default 0,
  fibre_g      numeric not null default 0,
  sugar_g      numeric not null default 0,
  sodium_mg    numeric not null default 0,
  additional_nutrients jsonb not null default '{}',
  entry_count  int not null default 0,
  updated_at   timestamptz not null default now()
);

alter table nutrition_daily_summary enable row level security;
create policy "nutrition_daily_summary: own read"   on nutrition_daily_summary for select using (auth.uid() = user_id);
create policy "nutrition_daily_summary: own insert" on nutrition_daily_summary for insert with check (auth.uid() = user_id);
create policy "nutrition_daily_summary: own update" on nutrition_daily_summary for update using (auth.uid() = user_id);
create policy "nutrition_daily_summary: own delete" on nutrition_daily_summary for delete using (auth.uid() = user_id);

-- ── Default macro seed helper function ───────────────────────
-- Call this from the client after first login to seed defaults
create or replace function seed_default_macros(p_user_id uuid)
returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from nutrition_macros where user_id = p_user_id) then
    insert into nutrition_macros (user_id, name, unit, daily_goal, color, display_order, is_default) values
      (p_user_id, 'Calories', 'kcal', 2000, '#e8b830', 0, true),
      (p_user_id, 'Protein',  'g',    150,  '#1a7a4a', 1, true),
      (p_user_id, 'Carbs',    'g',    250,  '#d4700a', 2, true),
      (p_user_id, 'Fat',      'g',    70,   '#c84040', 3, true);
  end if;
end;
$$;
