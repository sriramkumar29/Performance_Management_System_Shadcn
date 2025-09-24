import asyncio
from app.db.database import engine
from sqlalchemy import text

async def seed_categories_simple():
    """Populate the categories table using raw SQL to avoid relationship issues."""
    
    default_categories = [
        "Technical Skills",
        "Communication", 
        "Leadership",
        "Project Management",
        "Problem Solving",
        "Innovation",
        "Quality Assurance",
        "Customer Service",
        "Team Collaboration",
        "Professional Development",
        "Process Improvement",
        "Strategic Planning"
    ]
    
    async with engine.begin() as conn:
        print("Seeding categories...")
        
        for category_name in default_categories:
            # Check if category already exists
            result = await conn.execute(
                text("SELECT id FROM categories WHERE name = :name"),
                {"name": category_name}
            )
            existing = result.fetchone()
            
            if not existing:
                await conn.execute(
                    text("INSERT INTO categories (name) VALUES (:name)"),
                    {"name": category_name}
                )
                print(f"Created category: {category_name}")
            else:
                print(f"Category already exists: {category_name}")
        
        # Display all categories
        result = await conn.execute(text("SELECT id, name FROM categories ORDER BY name"))
        all_categories = result.fetchall()
        
        print(f"\nTotal categories in database: {len(all_categories)}")
        for cat in all_categories:
            print(f"  - {cat.name} (ID: {cat.id})")

if __name__ == "__main__":
    asyncio.run(seed_categories_simple())
