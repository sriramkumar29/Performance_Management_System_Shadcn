"""
Seed test database with minimal data for integration testing.
Run this after creating the test database schema.
"""
import asyncio
import os
from datetime import date, timedelta
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import bcrypt

# Set test environment BEFORE importing any app modules
os.environ["APP_ENV"] = "test"

# Import config after setting environment
from app.core.config import settings
from app.db.database import Base

# Import all models first to ensure they're registered before any relationships are configured
from app.models.employee import Employee
from app.models.appraisal import Appraisal  # Import Appraisal to register the class
from app.models.appraisal_type import AppraisalType, AppraisalRange
from app.models.goal import Category, GoalTemplate, Goal, AppraisalGoal

# Create test engine and session
test_engine = create_async_engine(settings.DATABASE_URL, echo=False)
TestSessionLocal = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def seed_test_data():
    """Seed the test database with minimal data for integration tests."""
    # First ensure schema exists
    print("Creating database schema if needed...")
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Schema ready")
    
    # Handle truncation with separate session to avoid transaction issues
    print("Clearing existing test data...")
    
    # List of tables to truncate in correct order (child tables first, then parent tables)
    tables_to_truncate = [
        "appraisal_goals",
        "goals", 
        "goal_templates",
        "categories",
        "appraisals",
        "appraisal_ranges",  # Add appraisal_ranges before appraisal_types
        "appraisal_types",
        "employees"
    ]
    
    # Only truncate tables that exist - handle errors gracefully
    for table_name in tables_to_truncate:
        try:
            async with TestSessionLocal() as truncate_session:
                async with truncate_session.begin():
                    await truncate_session.execute(text(f"TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE"))
                    print(f"  ✅ Cleared {table_name}")
        except Exception as e:
            if "does not exist" in str(e):
                print(f"  ⚠️  Table {table_name} does not exist, skipping")
            else:
                print(f"  ⚠️  Could not clear {table_name}: {str(e)}")
    
    print("✅ Existing data cleared")
    
    # Use fresh session for seeding
    async with TestSessionLocal() as session:
        async with session.begin():
            print("Seeding test database...")
            
            # Create test employees with hierarchical structure
            print("Creating test employees...")
            test_password = hash_password("password123")
            
            # CEO - Top level
            ceo = Employee(
                emp_name="John CEO",
                emp_email="john.ceo@example.com",
                emp_department="Executive",
                emp_roles="CEO",
                emp_roles_level=9,
                emp_reporting_manager_id=None,
                emp_status=True,
                emp_password=test_password
            )
            session.add(ceo)
            await session.flush()
            
            # VP - Reports to CEO
            vp = Employee(
                emp_name="Sarah VP",
                emp_email="sarah.vp@example.com",
                emp_department="Engineering",
                emp_roles="VP",
                emp_roles_level=8,
                emp_reporting_manager_id=ceo.emp_id,
                emp_status=True,
                emp_password=test_password
            )
            session.add(vp)
            await session.flush()
            
            # Director - Reports to VP
            director = Employee(
                emp_name="Mike Director",
                emp_email="mike.director@example.com",
                emp_department="Engineering",
                emp_roles="Director",
                emp_roles_level=7,
                emp_reporting_manager_id=vp.emp_id,
                emp_status=True,
                emp_password=test_password
            )
            session.add(director)
            await session.flush()
            
            # Manager - Reports to Director
            manager = Employee(
                emp_name="Lisa Manager",
                emp_email="lisa.manager@example.com",
                emp_department="Engineering",
                emp_roles="Manager",
                emp_roles_level=5,
                emp_reporting_manager_id=director.emp_id,
                emp_status=True,
                emp_password=test_password
            )
            session.add(manager)
            await session.flush()
            
            # Team Lead - Reports to Manager
            team_lead = Employee(
                emp_name="David Team Lead",
                emp_email="david.lead@example.com",
                emp_department="Engineering",
                emp_roles="Team Lead",
                emp_roles_level=4,
                emp_reporting_manager_id=manager.emp_id,
                emp_status=True,
                emp_password=test_password
            )
            session.add(team_lead)
            await session.flush()
            
            # Senior Developer - Reports to Team Lead
            senior_dev = Employee(
                emp_name="Alice Senior Dev",
                emp_email="alice.senior@example.com",
                emp_department="Engineering",
                emp_roles="Senior Developer",
                emp_roles_level=3,
                emp_reporting_manager_id=team_lead.emp_id,
                emp_status=True,
                emp_password=test_password
            )
            session.add(senior_dev)
            await session.flush()
            
            # Developer - Reports to Team Lead
            developer = Employee(
                emp_name="Bob Developer",
                emp_email="bob.dev@example.com",
                emp_department="Engineering",
                emp_roles="Developer",
                emp_roles_level=2,
                emp_reporting_manager_id=team_lead.emp_id,
                emp_status=True,
                emp_password=test_password
            )
            session.add(developer)
            await session.flush()
            
            # HR Manager for different department
            hr_manager = Employee(
                emp_name="Carol HR Manager",
                emp_email="carol.hr@example.com",
                emp_department="Human Resources",
                emp_roles="Manager",
                emp_roles_level=5,
                emp_reporting_manager_id=director.emp_id,
                emp_status=True,
                emp_password=test_password
            )
            session.add(hr_manager)
            await session.flush()
            
            print(f"Created 8 test employees with hierarchical structure")
            
            # Create comprehensive appraisal types with ranges
            print("Creating appraisal types with ranges...")
            appraisal_types_data = [
                {
                    "name": "Annual",
                    "has_range": False,
                    "ranges": [],
                },
                {
                    "name": "Half-yearly",
                    "has_range": True,
                    "ranges": [
                        {"name": "1st", "start_month_offset": 0, "end_month_offset": 5},   # Jan-Jun
                        {"name": "2nd", "start_month_offset": 6, "end_month_offset": 11},  # Jul-Dec
                    ],
                },
                {
                    "name": "Quarterly",
                    "has_range": True,
                    "ranges": [
                        {"name": "1st", "start_month_offset": 0, "end_month_offset": 2},   # Jan-Mar
                        {"name": "2nd", "start_month_offset": 3, "end_month_offset": 5},   # Apr-Jun
                        {"name": "3rd", "start_month_offset": 6, "end_month_offset": 8},   # Jul-Sep
                        {"name": "4th", "start_month_offset": 9, "end_month_offset": 11},  # Oct-Dec
                    ],
                },
                {
                    "name": "Project-end",
                    "has_range": False,
                    "ranges": [],
                },
                {
                    "name": "Tri-annual",
                    "has_range": True,
                    "ranges": [
                        {"name": "1st", "start_month_offset": 0, "end_month_offset": 3},   # Jan-Apr
                        {"name": "2nd", "start_month_offset": 4, "end_month_offset": 7},   # May-Aug
                        {"name": "3rd", "start_month_offset": 8, "end_month_offset": 11},  # Sep-Dec
                    ],
                },
                {
                    "name": "Annual-Probation",
                    "has_range": False,
                    "ranges": [],
                },
            ]
            
            for type_data in appraisal_types_data:
                # Create appraisal type
                appraisal_type = AppraisalType(
                    name=type_data["name"],
                    has_range=type_data["has_range"]
                )
                session.add(appraisal_type)
                await session.flush()  # Get ID
                
                # Create ranges if applicable
                for range_data in type_data["ranges"]:
                    appraisal_range = AppraisalRange(
                        appraisal_type_id=appraisal_type.id,
                        name=range_data["name"],
                        start_month_offset=range_data["start_month_offset"],
                        end_month_offset=range_data["end_month_offset"]
                    )
                    session.add(appraisal_range)
                    
                print(f"Created appraisal type: {type_data['name']} with {len(type_data['ranges'])} ranges")
            
            await session.flush()
            print(f"Created {len(appraisal_types_data)} appraisal types with ranges")
            
            # Create comprehensive goal categories
            print("Creating goal categories...")
            category_names = [
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
            
            categories = [Category(name=name) for name in category_names]
            session.add_all(categories)
            await session.flush()
            print(f"Created {len(categories)} categories")
            
            
            # Create comprehensive goal templates
            print("Creating goal templates...")
            goal_templates = [
                GoalTemplate(
                    temp_title="Code Quality",
                    temp_description="Write clean, maintainable code with proper documentation and testing",
                    temp_performance_factor="Technical Excellence",
                    temp_importance="High",
                    temp_weightage=30
                ),
                GoalTemplate(
                    temp_title="Team Collaboration",
                    temp_description="Work effectively with team members and contribute to team goals",
                    temp_performance_factor="Teamwork",
                    temp_importance="High",
                    temp_weightage=25
                ),
                GoalTemplate(
                    temp_title="Project Delivery",
                    temp_description="Deliver projects on time, within scope, and meeting quality standards",
                    temp_performance_factor="Delivery Excellence",
                    temp_importance="High",
                    temp_weightage=35
                ),
                GoalTemplate(
                    temp_title="Innovation",
                    temp_description="Propose and implement innovative solutions to improve processes",
                    temp_performance_factor="Innovation",
                    temp_importance="Medium",
                    temp_weightage=10
                ),
                GoalTemplate(
                    temp_title="Communication Skills",
                    temp_description="Communicate effectively with stakeholders at all levels",
                    temp_performance_factor="Communication",
                    temp_importance="High",
                    temp_weightage=20
                ),
                GoalTemplate(
                    temp_title="Leadership Development",
                    temp_description="Demonstrate leadership qualities and mentor junior team members",
                    temp_performance_factor="Leadership",
                    temp_importance="Medium",
                    temp_weightage=15
                ),
                GoalTemplate(
                    temp_title="Problem Solving",
                    temp_description="Identify, analyze, and solve complex technical and business problems",
                    temp_performance_factor="Problem Solving",
                    temp_importance="High",
                    temp_weightage=25
                ),
                GoalTemplate(
                    temp_title="Professional Development",
                    temp_description="Continuously learn new skills and stay updated with industry trends",
                    temp_performance_factor="Growth",
                    temp_importance="Medium",
                    temp_weightage=15
                ),
                GoalTemplate(
                    temp_title="Process Improvement",
                    temp_description="Identify and implement process improvements to increase efficiency",
                    temp_performance_factor="Process Excellence",
                    temp_importance="Medium",
                    temp_weightage=20
                ),
                GoalTemplate(
                    temp_title="Customer Focus",
                    temp_description="Understand and deliver solutions that meet customer needs",
                    temp_performance_factor="Customer Satisfaction",
                    temp_importance="High",
                    temp_weightage=30
                )
            ]
            
            session.add_all(goal_templates)
            await session.flush()  # Get IDs
            print(f"Created {len(goal_templates)} goal templates")
            
            print("✅ Comprehensive test data seeding completed!")
            print("Test data includes:")
            print("  - 8 employees with hierarchical reporting structure")
            print("  - 6 appraisal types with appropriate ranges")
            print("  - 12 goal categories")
            print(f"  - {len(goal_templates)} goal templates")
            print("\nTest login credentials:")
            print("  - john.ceo@example.com / password123 (CEO)")
            print("  - sarah.vp@example.com / password123 (VP)")
            print("  - mike.director@example.com / password123 (Director)")
            print("  - lisa.manager@example.com / password123 (Manager)")
            print("  - david.lead@example.com / password123 (Team Lead)")
            print("  - alice.senior@example.com / password123 (Senior Developer)")
            print("  - bob.dev@example.com / password123 (Developer)")
            print("  - carol.hr@example.com / password123 (HR Manager)")

if __name__ == "__main__":
    asyncio.run(seed_test_data())
