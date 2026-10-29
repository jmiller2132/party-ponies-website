-- ============================================================
-- PPSI v2 Migration
-- Run this in the Supabase SQL editor BEFORE deploying the new code.
-- All columns use IF NOT EXISTS / default values so it is idempotent.
-- ============================================================

-- 1. Add breakdown columns to sds_plus_cache -----------------
ALTER TABLE sds_plus_cache
  ADD COLUMN IF NOT EXISTS breakdown_dominance  DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS breakdown_scoring    DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS breakdown_record     DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS breakdown_result     DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS breakdown_luck       DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS regular_season_weeks INTEGER,
  ADD COLUMN IF NOT EXISTS num_playoff_teams    INTEGER,
  ADD COLUMN IF NOT EXISTS regular_season_pf    DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS formula_version      TEXT  DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS is_fallback          BOOLEAN DEFAULT false;

-- Existing rows get formula_version = 'v1' so the app knows to
-- recompute them with v2 math on next request.

-- 2. League settings cache table --------------------------------
CREATE TABLE IF NOT EXISTS league_settings_cache (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  league_key             TEXT        NOT NULL UNIQUE,
  season                 TEXT        NOT NULL,
  num_teams              INTEGER     NOT NULL DEFAULT 10,
  num_playoff_teams      INTEGER     NOT NULL DEFAULT 6,
  playoff_start_week     INTEGER     NOT NULL DEFAULT 15,
  num_regular_season_weeks INTEGER   NOT NULL DEFAULT 14,
  cached_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_league_settings_cache_league_key
  ON league_settings_cache(league_key);

ALTER TABLE league_settings_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to league settings cache" ON league_settings_cache;
CREATE POLICY "Public read access to league settings cache"
  ON league_settings_cache FOR SELECT USING (true);
