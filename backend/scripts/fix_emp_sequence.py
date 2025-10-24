"""Utility to reset the employees.emp_id sequence (Postgres only).

Run this from the repository root (or backend folder) with the same environment used to run the app so
it picks up the correct DATABASE_URL from your .env file.

Example (from project root on Windows PowerShell):
  cd backend
  python .\scripts\fix_emp_sequence.py

What it does:
- Executes: SELECT setval(pg_get_serial_sequence('employees','emp_id'), COALESCE((SELECT MAX(emp_id) FROM employees), 1), true);
- This sets the sequence to the current max emp_id so the next insert will use max+1.

NOTE: This script assumes you are using PostgreSQL (asyncpg). Do NOT run against SQLite.
"""
import asyncio
from sqlalchemy import text

from app.db.database import engine
from app.utils.logger import get_logger

logger = get_logger(__name__)

async def reset_sequence():
    seq_sql = "SELECT setval(pg_get_serial_sequence('employees','emp_id'), COALESCE((SELECT MAX(emp_id) FROM employees), 1), true);"
    logger.info("Attempting to reset employees.emp_id sequence using project's DATABASE_URL")
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text(seq_sql))
            val = result.scalar()
        logger.info(f"Sequence reset result: {val}")
        print("Sequence reset result:", val)
    except Exception as e:
        logger.error(f"Failed to reset sequence: {e}")
        print("Failed to reset sequence:", e)

if __name__ == '__main__':
    asyncio.run(reset_sequence())
