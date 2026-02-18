-- Add owner_name column to league_standings table
ALTER TABLE league_standings 
ADD COLUMN IF NOT EXISTS owner_name TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_league_standings_owner_name ON league_standings(owner_name);
