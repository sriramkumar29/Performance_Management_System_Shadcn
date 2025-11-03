"""
Run SSO Support Migration

This script executes the add_sso_support.sql migration to add SSO support
to the employees table.
"""

import asyncio
import asyncpg
from pathlib import Path


async def run_migration():
    """Execute the SSO support migration."""

    # Database connection parameters (from .env.development)
    DATABASE_URL = "postgresql://postgres:sri@123@localhost:5432/performance_management_test"

    print("=" * 60)
    print("Running SSO Support Migration")
    print("=" * 60)

    try:
        # Connect to the database
        print("\n[1/4] Connecting to database...")
        conn = await asyncpg.connect(DATABASE_URL)
        print("✓ Connected successfully!")

        # Read the migration file
        print("\n[2/4] Reading migration file...")
        migration_file = Path(__file__).parent / "migrations" / "add_sso_support.sql"

        if not migration_file.exists():
            raise FileNotFoundError(f"Migration file not found: {migration_file}")

        with open(migration_file, 'r', encoding='utf-8') as f:
            sql = f.read()

        print(f"✓ Migration file loaded: {migration_file.name}")

        # Execute the migration
        print("\n[3/4] Executing migration...")
        await conn.execute(sql)
        print("✓ Migration executed successfully!")

        # Verify the changes
        print("\n[4/4] Verifying changes...")

        # Check if emp_password is nullable
        result = await conn.fetchrow("""
            SELECT
                column_name,
                is_nullable,
                data_type
            FROM information_schema.columns
            WHERE table_name = 'employees'
            AND column_name = 'emp_password'
        """)

        if result:
            print(f"  • emp_password column:")
            print(f"    - Type: {result['data_type']}")
            print(f"    - Nullable: {result['is_nullable']}")

        # Check if auth_provider column exists
        result = await conn.fetchrow("""
            SELECT
                column_name,
                is_nullable,
                data_type
            FROM information_schema.columns
            WHERE table_name = 'employees'
            AND column_name = 'auth_provider'
        """)

        if result:
            print(f"  • auth_provider column:")
            print(f"    - Type: {result['data_type']}")
            print(f"    - Nullable: {result['is_nullable']}")
            print("\n✓ All changes verified successfully!")
        else:
            print("\n⚠ Warning: auth_provider column not found!")

        # Close connection
        await conn.close()

        print("\n" + "=" * 60)
        print("✅ Migration completed successfully!")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Update .env files with Azure credentials")
        print("2. Install dependencies: pip install -r requirements.txt")
        print("3. Test the application")

    except asyncpg.PostgresError as e:
        print(f"\n❌ Database error: {e}")
        print("\nTroubleshooting:")
        print("1. Check if PostgreSQL is running")
        print("2. Verify database credentials in the script")
        print("3. Ensure database 'performance_management_test' exists")
        raise

    except FileNotFoundError as e:
        print(f"\n❌ File error: {e}")
        print("\nEnsure the migration file exists at:")
        print("backend/migrations/add_sso_support.sql")
        raise

    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        raise


if __name__ == "__main__":
    print("\n🚀 Starting migration process...")
    asyncio.run(run_migration())
