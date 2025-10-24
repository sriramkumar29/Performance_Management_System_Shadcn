# Login 401 Error - Diagnostic Guide

**Error**: POST http://localhost:7000/api/employees/login returns 401 (Unauthorized)

---

## Likely Cause: Database Migration Not Yet Applied

The role refactoring requires database schema changes. If your existing database still has the old schema, login will fail because:

1. The Employee model now requires `role_id` field
2. The `roles` table must exist with 5 predefined roles
3. Existing employees need their `role_id` set

---

## Diagnostic Steps

### Step 1: Check if Backend is Running

```bash
# In backend directory
cd backend
python -m uvicorn main:app --reload --port 7000
```

**Expected**: Server should start without errors

### Step 2: Check Backend Logs

Look at the terminal where your backend is running. When you try to login, you should see logs like:

```
API_REQUEST: POST /login - Email: user@example.com
AUTH_ATTEMPT: User authentication started - Email: user@example.com
```

**What to look for**:
- Does it say "Employee not found"? → Email doesn't exist in database
- Does it say "Invalid password"? → Password is wrong
- Does it say "Account disabled"? → User's emp_status is False
- Any database error? → Schema migration needed

### Step 3: Check Database Schema

**Option A: Using SQLite Browser (if using SQLite)**
1. Open your database file in DB Browser for SQLite
2. Check if `roles` table exists
3. Check if `employees` table has `role_id` column
4. Check if old columns `emp_roles` and `emp_roles_level` are removed

**Option B: Using SQL Query**
```sql
-- Check if roles table exists
SELECT name FROM sqlite_master WHERE type='table' AND name='roles';

-- Check employees table structure
PRAGMA table_info(employees);

-- Check if roles are populated
SELECT * FROM roles;

-- Check if employees have role_id
SELECT emp_id, emp_name, emp_email, role_id FROM employees LIMIT 5;
```

---

## Solutions Based on What You Find

### Solution 1: Database Needs Migration (Most Likely)

If your database doesn't have the new schema, you need to apply migrations.

**Option A: Fresh Start (Development Only - Loses Data)**

1. Delete the existing database file:
```bash
# If using SQLite, delete the .db file
rm backend/performance_management.db  # or whatever your db file is named
```

2. Restart the backend:
```bash
cd backend
python -m uvicorn main:app --reload --port 7000
```

The backend will:
- Create a new database with correct schema
- Auto-populate the `roles` table with 5 roles
- You'll need to create new users

**Option B: Migrate Existing Data (Preserves Data)**

Run this Python script to migrate your existing database:

```python
# migrate_roles.py
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Update this with your database URL
DATABASE_URL = "sqlite+aiosqlite:///./performance_management.db"

async def migrate_database():
    """Migrate existing database to new role system"""
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        try:
            print("Starting database migration...")

            # Step 1: Create roles table
            print("\n1. Creating roles table...")
            await session.execute(text("""
                CREATE TABLE IF NOT EXISTS roles (
                    id INTEGER PRIMARY KEY,
                    role_name VARCHAR(50) UNIQUE NOT NULL
                )
            """))

            # Step 2: Insert roles
            print("2. Inserting roles...")
            await session.execute(text("""
                INSERT OR IGNORE INTO roles (id, role_name) VALUES
                (1, 'Employee'),
                (2, 'Lead'),
                (3, 'Manager'),
                (4, 'CEO'),
                (5, 'Admin')
            """))

            # Step 3: Check if role_id column exists
            print("\n3. Checking employees table structure...")
            result = await session.execute(text("PRAGMA table_info(employees)"))
            columns = [row[1] for row in result.fetchall()]

            if 'role_id' not in columns:
                print("4. Adding role_id column to employees...")
                await session.execute(text("""
                    ALTER TABLE employees ADD COLUMN role_id INTEGER
                """))

            # Step 4: Migrate data from old columns to role_id
            print("\n5. Migrating role data...")

            # Map old roles to new role_ids
            role_mapping = {
                "admin": 5,
                "ceo": 4,
                "manager": 3,
                "lead": 2,
                "employee": 1,
            }

            # Get all employees with old role fields
            if 'emp_roles' in columns:
                result = await session.execute(text("""
                    SELECT emp_id, emp_roles FROM employees
                """))
                employees = result.fetchall()

                for emp_id, emp_roles in employees:
                    # Determine role_id from old emp_roles string
                    role_id = 1  # Default to Employee
                    if emp_roles:
                        old_role_lower = emp_roles.lower()
                        for key, rid in role_mapping.items():
                            if key in old_role_lower:
                                role_id = rid
                                break

                    # Update employee with role_id
                    await session.execute(text("""
                        UPDATE employees
                        SET role_id = :role_id
                        WHERE emp_id = :emp_id
                    """), {"role_id": role_id, "emp_id": emp_id})
                    print(f"   - Employee {emp_id}: {emp_roles} → role_id={role_id}")
            else:
                # No old columns, set all to Employee role
                print("   - No old role columns found, setting all employees to Employee role")
                await session.execute(text("""
                    UPDATE employees SET role_id = 1 WHERE role_id IS NULL
                """))

            await session.commit()

            print("\n✅ Migration completed successfully!")
            print("\nNext steps:")
            print("1. Restart your backend server")
            print("2. Manually update employee roles via Admin UI if needed")
            print("3. You can now drop old columns: emp_roles and emp_roles_level")

        except Exception as e:
            print(f"\n❌ Migration failed: {str(e)}")
            await session.rollback()
            raise

if __name__ == "__main__":
    asyncio.run(migrate_database())
```

Run the migration:
```bash
cd backend
python migrate_roles.py
```

### Solution 2: Wrong Credentials

If the database schema is correct but you still get 401:

1. **Check your login credentials** - Make sure you're using the correct email and password
2. **Check if user exists** in the database
3. **Check if user is active** (`emp_status = 1` or `True`)

### Solution 3: Create an Admin User

If you need to create an admin user after migrating:

```python
# create_admin.py
import asyncio
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "sqlite+aiosqlite:///./performance_management.db"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin_user():
    """Create an admin user"""
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        try:
            # Hash the password
            password = "admin123"  # Change this!
            hashed_password = pwd_context.hash(password)

            # Create admin user
            await session.execute(text("""
                INSERT INTO employees
                (emp_name, emp_email, emp_department, role_id, emp_status, emp_password)
                VALUES
                (:name, :email, :dept, :role_id, :status, :password)
            """), {
                "name": "Admin User",
                "email": "admin@company.com",
                "dept": "Administration",
                "role_id": 5,  # Admin role
                "status": True,
                "password": hashed_password
            })

            await session.commit()

            print("✅ Admin user created successfully!")
            print(f"Email: admin@company.com")
            print(f"Password: admin123")
            print("\n⚠️  IMPORTANT: Change this password after first login!")

        except Exception as e:
            print(f"❌ Failed to create admin user: {str(e)}")
            await session.rollback()

if __name__ == "__main__":
    asyncio.run(create_admin_user())
```

---

## Quick Test: Check if Database Has New Schema

Run this in your backend directory:

```python
# check_schema.py
import asyncio
from sqlalchemy import text
from app.db.database import get_db

async def check_schema():
    async for db in get_db():
        try:
            # Check roles table
            result = await db.execute(text("SELECT COUNT(*) FROM roles"))
            role_count = result.scalar()
            print(f"✅ Roles table exists with {role_count} roles")

            # Check roles content
            result = await db.execute(text("SELECT id, role_name FROM roles ORDER BY id"))
            roles = result.fetchall()
            print("\nRoles in database:")
            for role_id, role_name in roles:
                print(f"  {role_id}: {role_name}")

            # Check employees have role_id
            result = await db.execute(text("""
                SELECT COUNT(*) FROM employees WHERE role_id IS NOT NULL
            """))
            emp_with_roles = result.scalar()

            result = await db.execute(text("SELECT COUNT(*) FROM employees"))
            total_emps = result.scalar()

            print(f"\n✅ {emp_with_roles}/{total_emps} employees have role_id set")

            if emp_with_roles == 0 and total_emps > 0:
                print("\n⚠️  WARNING: You have employees but none have role_id!")
                print("   Run the migration script above to fix this.")

        except Exception as e:
            print(f"❌ Error checking schema: {str(e)}")
            if "no such table: roles" in str(e):
                print("\n⚠️  The 'roles' table doesn't exist!")
                print("   You need to either:")
                print("   1. Delete your database and restart (fresh start)")
                print("   2. Run the migration script above")

        break

if __name__ == "__main__":
    asyncio.run(check_schema())
```

Run it:
```bash
cd backend
python check_schema.py
```

---

## Expected Behavior After Fix

1. Start backend server
2. Login with credentials
3. Should receive 200 OK with tokens:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

4. Frontend should redirect to dashboard

---

## Need More Help?

Please provide:
1. **Backend console logs** when you try to login
2. **Database schema** output from `PRAGMA table_info(employees);`
3. **Whether roles table exists** in your database
4. **Any error messages** from the backend logs

This will help identify the exact issue!
