-- Add is_partial flag to sds_plus_cache
-- true when some regular-season weeks are missing from all-play computation
-- (e.g. 2019 is missing week 12). Cleared automatically when complete data is fetched.
ALTER TABLE sds_plus_cache
  ADD COLUMN IF NOT EXISTS is_partial BOOLEAN DEFAULT false;
