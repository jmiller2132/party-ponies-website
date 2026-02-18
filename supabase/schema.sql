-- Supabase Schema for Party Ponies Fantasy League Website
-- This schema stores Yahoo Fantasy Sports tokens and historical league data

-- Table to store Yahoo OAuth tokens for offline access
CREATE TABLE IF NOT EXISTS yahoo_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT,
  provider_account_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_yahoo_tokens_user_id ON yahoo_tokens(user_id);

-- Table to store historical league standings
CREATE TABLE IF NOT EXISTS league_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_key TEXT NOT NULL,
  season TEXT NOT NULL,
  week INTEGER,
  team_key TEXT NOT NULL,
  team_name TEXT NOT NULL,
  owner_name TEXT,
  rank INTEGER,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  ties INTEGER DEFAULT 0,
  points_for DECIMAL(10, 2) DEFAULT 0,
  points_against DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_key, season, week, team_key)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_league_standings_league_key ON league_standings(league_key);
CREATE INDEX IF NOT EXISTS idx_league_standings_season ON league_standings(season);
CREATE INDEX IF NOT EXISTS idx_league_standings_team_key ON league_standings(team_key);
CREATE INDEX IF NOT EXISTS idx_league_standings_owner_name ON league_standings(owner_name);

-- Table to store historical matchups
CREATE TABLE IF NOT EXISTS matchups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_key TEXT NOT NULL,
  season TEXT NOT NULL,
  week INTEGER NOT NULL,
  matchup_key TEXT,
  team1_key TEXT NOT NULL,
  team1_name TEXT NOT NULL,
  team1_owner_name TEXT,
  team1_points DECIMAL(10, 2) DEFAULT 0,
  team2_key TEXT NOT NULL,
  team2_name TEXT NOT NULL,
  team2_owner_name TEXT,
  team2_points DECIMAL(10, 2) DEFAULT 0,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_key, season, week, matchup_key)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_matchups_league_key ON matchups(league_key);
CREATE INDEX IF NOT EXISTS idx_matchups_season ON matchups(season);
CREATE INDEX IF NOT EXISTS idx_matchups_week ON matchups(week);

-- Table to store manager/team information
CREATE TABLE IF NOT EXISTS managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_key TEXT UNIQUE NOT NULL,
  team_name TEXT NOT NULL,
  manager_name TEXT,
  league_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_managers_team_key ON managers(team_key);
CREATE INDEX IF NOT EXISTS idx_managers_league_key ON managers(league_key);

-- Table to store all-time records and achievements
CREATE TABLE IF NOT EXISTS records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type TEXT NOT NULL, -- 'championship', 'high_score', 'win_streak', etc.
  team_key TEXT NOT NULL,
  team_name TEXT NOT NULL,
  league_key TEXT NOT NULL,
  season TEXT,
  week INTEGER,
  value DECIMAL(10, 2),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_records_type ON records(record_type);
CREATE INDEX IF NOT EXISTS idx_records_team_key ON records(team_key);
CREATE INDEX IF NOT EXISTS idx_records_league_key ON records(league_key);

-- Table to cache SDS+ scores for performance
CREATE TABLE IF NOT EXISTS sds_plus_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_key TEXT NOT NULL,
  season TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  team_key TEXT NOT NULL,
  sds_plus_score DECIMAL(10, 2) NOT NULL,
  sds_plus_rank INTEGER NOT NULL,
  final_rank INTEGER NOT NULL,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  ties INTEGER DEFAULT 0,
  points_for DECIMAL(10, 2) DEFAULT 0,
  points_against DECIMAL(10, 2) DEFAULT 0,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_key, season, owner_name)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_sds_plus_cache_league_key ON sds_plus_cache(league_key);
CREATE INDEX IF NOT EXISTS idx_sds_plus_cache_season ON sds_plus_cache(season);
CREATE INDEX IF NOT EXISTS idx_sds_plus_cache_owner ON sds_plus_cache(owner_name);

-- Table to cache manager stats for performance
CREATE TABLE IF NOT EXISTS manager_stats_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_name TEXT UNIQUE NOT NULL,
  championships INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  total_ties INTEGER DEFAULT 0,
  total_points_for DECIMAL(10, 2) DEFAULT 0,
  total_points_against DECIMAL(10, 2) DEFAULT 0,
  seasons_played INTEGER DEFAULT 0,
  best_finish INTEGER,
  worst_finish INTEGER,
  avg_finish DECIMAL(5, 1),
  avg_sds_plus DECIMAL(10, 2),
  high_sds_plus DECIMAL(10, 2),
  low_sds_plus DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT false,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_manager_stats_cache_owner ON manager_stats_cache(owner_name);
CREATE INDEX IF NOT EXISTS idx_manager_stats_cache_active ON manager_stats_cache(is_active);

-- Table to cache head-to-head records for performance
CREATE TABLE IF NOT EXISTS head_to_head_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager1 TEXT NOT NULL,
  manager2 TEXT NOT NULL,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  ties INTEGER DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  points_for DECIMAL(10, 2) DEFAULT 0,
  points_against DECIMAL(10, 2) DEFAULT 0,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(manager1, manager2)
);

-- Indexes for faster queries (both directions since manager1/manager2 order doesn't matter)
CREATE INDEX IF NOT EXISTS idx_head_to_head_cache_manager1 ON head_to_head_cache(manager1);
CREATE INDEX IF NOT EXISTS idx_head_to_head_cache_manager2 ON head_to_head_cache(manager2);
CREATE INDEX IF NOT EXISTS idx_head_to_head_cache_total_games ON head_to_head_cache(total_games DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE yahoo_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchups ENABLE ROW LEVEL SECURITY;
ALTER TABLE managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your security requirements)
-- For now, allowing public read access to league data and authenticated write access to tokens
-- Using DROP IF EXISTS to make this idempotent (can be run multiple times)
DROP POLICY IF EXISTS "Public read access to league standings" ON league_standings;
CREATE POLICY "Public read access to league standings" ON league_standings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access to matchups" ON matchups;
CREATE POLICY "Public read access to matchups" ON matchups
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access to managers" ON managers;
CREATE POLICY "Public read access to managers" ON managers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access to records" ON records;
CREATE POLICY "Public read access to records" ON records
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access to SDS+ cache" ON sds_plus_cache;
CREATE POLICY "Public read access to SDS+ cache" ON sds_plus_cache
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access to manager stats cache" ON manager_stats_cache;
CREATE POLICY "Public read access to manager stats cache" ON manager_stats_cache
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access to head-to-head cache" ON head_to_head_cache;
CREATE POLICY "Public read access to head-to-head cache" ON head_to_head_cache
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own tokens" ON yahoo_tokens;
CREATE POLICY "Users can manage their own tokens" ON yahoo_tokens
  FOR ALL USING (auth.uid()::text = user_id);
