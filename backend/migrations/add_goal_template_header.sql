-- Migration: Add Goal Template Header Support
-- Date: 2025-10-29
-- Description: Adds goal_template_header table and header_id column to goals_template

-- Step 1: Create goal_template_header table
CREATE TABLE IF NOT EXISTS goal_template_header (
    header_id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_role_title UNIQUE (role_id, title)
);

-- Step 2: Create index on role_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_goal_template_header_role_id ON goal_template_header(role_id);

-- Step 3: Add header_id column to goals_template (nullable for backward compatibility)
ALTER TABLE goals_template
ADD COLUMN IF NOT EXISTS header_id INTEGER REFERENCES goal_template_header(header_id) ON DELETE CASCADE;

-- Step 4: Create index on header_id
CREATE INDEX IF NOT EXISTS idx_goals_template_header_id ON goals_template(header_id);

-- Verification queries (commented out - run manually if needed)
-- SELECT COUNT(*) FROM goal_template_header;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'goals_template' AND column_name = 'header_id';
