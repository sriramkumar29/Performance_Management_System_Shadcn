import asyncio
from app.db.database import engine

async def drop_goal_categories():
    """Drop the goal_categories table that's causing dependency issues."""
    async with engine.begin() as conn:
        try:
            await conn.execute(text("DROP TABLE IF EXISTS goal_categories CASCADE"))
            print("Dropped goal_categories table successfully")
        except Exception as e:
            print(f"Error dropping goal_categories table: {e}")

if __name__ == "__main__":
    from sqlalchemy import text
    asyncio.run(drop_goal_categories())
