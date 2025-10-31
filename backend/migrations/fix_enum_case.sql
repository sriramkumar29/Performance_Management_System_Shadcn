-- Fix enum case mismatch
-- The database has ORGANIZATION and SELF, but Python expects Organization and Self

-- Step 1: Update all existing values to uppercase temporarily
UPDATE goal_template_header SET goal_template_type = 'ORGANIZATION' WHERE goal_template_type = 'Organization';
UPDATE goal_template_header SET goal_template_type = 'SELF' WHERE goal_template_type = 'Self';

-- Step 2: Alter column to text temporarily
ALTER TABLE goal_template_header ALTER COLUMN goal_template_type TYPE text;

-- Step 3: Drop old enum
DROP TYPE goaltemplatetype;

-- Step 4: Create new enum with correct case
CREATE TYPE goaltemplatetype AS ENUM ('Organization', 'Self');

-- Step 5: Convert column back to enum
ALTER TABLE goal_template_header ALTER COLUMN goal_template_type TYPE goaltemplatetype USING goal_template_type::text::goaltemplatetype;

-- Step 6: Set default
ALTER TABLE goal_template_header ALTER COLUMN goal_template_type SET DEFAULT 'Organization'::goaltemplatetype;

-- Verify
SELECT goal_template_type, COUNT(*) FROM goal_template_header GROUP BY goal_template_type;
