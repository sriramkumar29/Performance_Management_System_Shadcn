-- Migration: Add SSO Support
-- Description: Make emp_password nullable and add auth_provider column for Microsoft SSO
-- Date: 2025-01-31

-- Make emp_password nullable (for SSO users who don't have passwords)
ALTER TABLE employees
ALTER COLUMN emp_password DROP NOT NULL;

-- Add auth_provider column to track authentication method
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50);

-- Add comment to explain the column
COMMENT ON COLUMN employees.auth_provider IS 'Authentication provider: "microsoft" for SSO, "password" for traditional login, NULL for legacy users';

-- Add comment to explain nullable password
COMMENT ON COLUMN employees.emp_password IS 'Hashed password (nullable for SSO users)';

-- Optional: Add index on auth_provider for faster queries
CREATE INDEX IF NOT EXISTS idx_employees_auth_provider ON employees(auth_provider);

-- Print success message
DO $$
BEGIN
    RAISE NOTICE 'SSO support migration completed successfully';
    RAISE NOTICE 'emp_password is now nullable';
    RAISE NOTICE 'auth_provider column added';
END $$;
