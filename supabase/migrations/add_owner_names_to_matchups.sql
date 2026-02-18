-- Migration: Add owner_name columns to matchups table
-- This allows us to cache owner names with matchups, avoiding repeated API calls

ALTER TABLE matchups 
ADD COLUMN IF NOT EXISTS team1_owner_name TEXT,
ADD COLUMN IF NOT EXISTS team2_owner_name TEXT;

-- Add index for faster lookups by owner name (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_matchups_team1_owner ON matchups(team1_owner_name);
CREATE INDEX IF NOT EXISTS idx_matchups_team2_owner ON matchups(team2_owner_name);
