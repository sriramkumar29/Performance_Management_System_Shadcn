import asyncio
from datetime import date, timedelta
from sqlalchemy import select
from app.db.database import async_session
from app.models.employee import Employee
from app.models.appraisal import Appraisal, AppraisalStatus
from app.models.appraisal_type import AppraisalType, AppraisalRange
from app.models.goal import Category, GoalTemplate, Goal, AppraisalGoal
from passlib.context import CryptContext

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Define role levels as constants since they're not in the model
ROLE_LEVELS = {
    "Intern": 1,
    "Associate": 1,
    "Developer": 2,
    "Senior Developer": 3,
    "Team Lead": 4,
    "Manager": 5,
    "Senior Manager": 6,
    "Director": 7,
    "VP": 8,
    "CEO": 9,
}

async def seed_initial_data():
    """Seed the database with initial data for all tables."""
    async with async_session() as session:
        async with session.begin():
            print("Seeding initial data...")
            
            # Define role information for employee creation
            print("Preparing employee role data...")
            roles = [
                {"name": "Intern", "level": ROLE_LEVELS["Intern"]},
                {"name": "Associate", "level": ROLE_LEVELS["Associate"]},
                {"name": "Developer", "level": ROLE_LEVELS["Developer"]},
                {"name": "Senior Developer", "level": ROLE_LEVELS["Senior Developer"]},
                {"name": "Team Lead", "level": ROLE_LEVELS["Team Lead"]},
                {"name": "Manager", "level": ROLE_LEVELS["Manager"]},
                {"name": "Senior Manager", "level": ROLE_LEVELS["Senior Manager"]},
                {"name": "Director", "level": ROLE_LEVELS["Director"]},
                {"name": "VP", "level": ROLE_LEVELS["VP"]},
                {"name": "CEO", "level": ROLE_LEVELS["CEO"]},
            ]
            print(f"Prepared {len(roles)} employee roles")
            
            # 2. Create Employees (with hierarchical structure)
            print("Creating employees...")
            # Default password for all seed employees
            default_password = pwd_context.hash("password123")
            
            ceo = Employee(
                emp_name="John CEO",
                emp_email="john.ceo@example.com",
                emp_department="Executive",
                emp_roles=roles[-1]["name"],  # CEO
                emp_roles_level=roles[-1]["level"],
                emp_reporting_manager_id=None,
                emp_status=True,
                emp_password=default_password
            )
            session.add(ceo)
            await session.flush()
            
            vp = Employee(
                emp_name="Sarah VP",
                emp_email="sarah.vp@example.com",
                emp_department="Engineering",
                emp_roles=roles[-2]["name"],  # VP
                emp_roles_level=roles[-2]["level"],
                emp_reporting_manager_id=ceo.emp_id,
                emp_status=True,
                emp_password=default_password
            )
            session.add(vp)
            await session.flush()
            
            director = Employee(
                emp_name="Mike Director",
                emp_email="mike.director@example.com",
                emp_department="Engineering",
                emp_roles=roles[-3]["name"],  # Director
                emp_roles_level=roles[-3]["level"],
                emp_reporting_manager_id=vp.emp_id,
                emp_status=True,
                emp_password=default_password
            )
            session.add(director)
            await session.flush()
            
            manager = Employee(
                emp_name="Lisa Manager",
                emp_email="lisa.manager@example.com",
                emp_department="Engineering",
                emp_roles=roles[-4]["name"],  # Manager
                emp_roles_level=roles[-4]["level"],
                emp_reporting_manager_id=director.emp_id,
                emp_status=True,
                emp_password=default_password
            )
            session.add(manager)
            await session.flush()
            
            team_lead = Employee(
                emp_name="David Team Lead",
                emp_email="david.lead@example.com",
                emp_department="Engineering",
                emp_roles=roles[-5]["name"],  # Team Lead
                emp_roles_level=roles[-5]["level"],
                emp_reporting_manager_id=manager.emp_id,
                emp_status=True,
                emp_password=default_password
            )
            session.add(team_lead)
            
            # Add some developers
            developers = [
                Employee(
                    emp_name=f"Dev {i}",
                    emp_email=f"dev{i}@example.com",
                    emp_department="Engineering",
                    emp_roles=roles[2]["name"],  # Developer
                    emp_roles_level=roles[2]["level"],
                    emp_reporting_manager_id=team_lead.emp_id,
                    emp_status=True,
                    emp_password=default_password
                ) for i in range(1, 6)
            ]
            session.add_all(developers)
            await session.flush()
            print(f"Created {len(developers) + 4} employees")
            
        
if __name__ == "__main__":
    asyncio.run(seed_initial_data())
