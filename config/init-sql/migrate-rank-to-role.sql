-- Migration script: Convert 'rank' trait to 'role' trait in Kratos identities
-- This script updates all identities that have 'rank' in their traits to use 'role' instead
-- Run this script once to migrate existing data to match the schema definition

-- Update identities that have 'rank' but not 'role'
UPDATE identities
SET traits = jsonb_set(
    traits - 'rank',  -- Remove 'rank' key
    '{role}',         -- Add 'role' key
    traits->'rank'     -- Use the value from 'rank'
)
WHERE traits ? 'rank' 
  AND NOT (traits ? 'role');

-- Update identities that have both 'rank' and 'role' (keep 'role', remove 'rank')
UPDATE identities
SET traits = traits - 'rank'
WHERE traits ? 'rank' 
  AND traits ? 'role';

-- Verify the migration
SELECT 
    id,
    traits->>'email' as email,
    traits->>'role' as role,
    traits ? 'rank' as has_rank,
    traits ? 'role' as has_role
FROM identities
WHERE traits ? 'rank' OR traits ? 'role'
ORDER BY created_at DESC
LIMIT 10;
