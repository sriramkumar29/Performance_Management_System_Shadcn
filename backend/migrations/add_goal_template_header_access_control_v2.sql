-- Migration: Add access control fields to goal_template_header (Version 2)
-- Created: 2025-01-30
-- Description: Adds creator_id, goal_template_type, is_shared, and shared_users_id fields
--              Uses existing goaltemplatetype enum

-- Step 1: Drop the existing enum if it has wrong values and recreate
DROP TYPE IF EXISTS goaltemplatetype CASCADE;
CREATE TYPE goaltemplatetype AS ENUM ('Organization', 'Self');

-- Step 2: Add new columns to goal_template_header table
ALTER TABLE goal_template_header
    ADD COLUMN IF NOT EXISTS creator_id INTEGER,
    ADD COLUMN IF NOT EXISTS goal_template_type goaltemplatetype NOT NULL DEFAULT 'Organization',
    ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS shared_users_id JSON;

-- Step 3: Add foreign key constraint for creator_id
ALTER TABLE goal_template_header
    DROP CONSTRAINT IF EXISTS fk_goal_template_header_creator;

ALTER TABLE goal_template_header
    ADD CONSTRAINT fk_goal_template_header_creator
    FOREIGN KEY (creator_id) REFERENCES employees(emp_id) ON DELETE SET NULL;

-- Step 4: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_goal_template_header_creator_id ON goal_template_header(creator_id);
CREATE INDEX IF NOT EXISTS idx_goal_template_header_type ON goal_template_header(goal_template_type);
CREATE INDEX IF NOT EXISTS idx_goal_template_header_is_shared ON goal_template_header(is_shared);

-- Step 5: Verify the migration
SELECT 'Migration completed successfully!' as status;

-- Display the updated table structure
\d goal_template_header
