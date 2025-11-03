-- Migration Rollback: Remove SSO Support
-- Description: Revert SSO changes (make emp_password NOT NULL and remove auth_provider)
-- Date: 2025-01-31
-- WARNING: This will fail if there are SSO users without passwords in the database

-- Remove index on auth_provider
DROP INDEX IF EXISTS idx_employees_auth_provider;

-- Remove auth_provider column
ALTER TABLE employees
DROP COLUMN IF EXISTS auth_provider;

-- Make emp_password NOT NULL again
-- WARNING: This will fail if any employees have NULL passwords
ALTER TABLE employees
ALTER COLUMN emp_password SET NOT NULL;

-- Print success message
DO $$
BEGIN
    RAISE NOTICE 'SSO support rollback completed successfully';
    RAISE NOTICE 'auth_provider column removed';
    RAISE NOTICE 'emp_password is now NOT NULL';
END $$;
