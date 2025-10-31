-- Migration: Add access control fields to goal_template_header
-- Created: 2025-01-30
-- Description: Adds creator_id, goal_template_type, is_shared, and shared_users_id fields to support
--              organization-level, self, and shared goal template headers.

-- Step 1: Create enum type for goal template type
CREATE TYPE goaltemplatetype AS ENUM ('Organization', 'Self');

-- Step 2: Add new columns to goal_template_header table
ALTER TABLE goal_template_header
    ADD COLUMN creator_id INTEGER,
    ADD COLUMN goal_template_type goaltemplatetype NOT NULL DEFAULT 'Organization',
    ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN shared_users_id JSON;

-- Step 3: Add foreign key constraint for creator_id
ALTER TABLE goal_template_header
    ADD CONSTRAINT fk_goal_template_header_creator
    FOREIGN KEY (creator_id) REFERENCES employees(emp_id) ON DELETE SET NULL;

-- Step 4: Create index on creator_id for faster queries
CREATE INDEX idx_goal_template_header_creator_id ON goal_template_header(creator_id);

-- Step 5: Create index on goal_template_type for faster filtering
CREATE INDEX idx_goal_template_header_type ON goal_template_header(goal_template_type);

-- Step 6: Create index on is_shared for faster shared queries
CREATE INDEX idx_goal_template_header_is_shared ON goal_template_header(is_shared);

-- Optional: Update existing records to have a default creator_id (set to NULL or admin user)
-- UPDATE goal_template_header SET creator_id = NULL WHERE creator_id IS NULL;

-- Verification queries (commented out - run manually to verify):
-- SELECT * FROM goal_template_header LIMIT 5;
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'goal_template_header';
