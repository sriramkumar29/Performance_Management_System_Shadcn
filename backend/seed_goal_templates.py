import asyncio
import os
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Set test environment BEFORE importing any app modules
os.environ["APP_ENV"] = "development"

# Import config after setting environment
from app.core.config import settings
from app.db.database import Base

# Import all models first to ensure they're registered before any relationships are configured
from app.models.employee import Employee
from app.models.appraisal import Appraisal  # Import Appraisal to register the class
from app.models.appraisal_type import AppraisalType, AppraisalRange
from app.models.goal import Category, GoalTemplate, Goal, AppraisalGoal, goal_template_categories

# Create test engine and session
test_engine = create_async_engine(settings.DATABASE_URL, echo=False)
TestSessionLocal = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

async def seed_goal_templates():
    """Seed the database with goal templates and categories."""
    # First ensure schema exists
    print("Creating database schema if needed...")
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Schema ready")
    
    async with TestSessionLocal() as session:
        async with session.begin():
            print("Seeding goal templates and categories...")
            
            # 1. Create Categories (check if they already exist)
            print("Creating categories...")
            category_data = [
                "Technical", "Leadership", "Communication", "Innovation", 
                "Quality", "Collaboration", "Professional Development", 
                "Project Management", "Customer Focus", "Process Improvement"
            ]
            
            # Check existing categories
            existing_categories = {}
            result = await session.execute(select(Category))
            for cat in result.scalars().all():
                existing_categories[cat.name] = cat
            
            categories = []
            for name in category_data:
                if name not in existing_categories:
                    new_cat = Category(name=name)
                    categories.append(new_cat)
                    session.add(new_cat)
                else:
                    categories.append(existing_categories[name])
            
            if len([c for c in categories if c not in existing_categories.values()]) > 0:
                await session.flush()
                print(f"Created {len([c for c in categories if c not in existing_categories.values()])} new categories")
            else:
                print("All categories already exist")
            
            # Make sure we have all categories in our list
            all_categories = list(existing_categories.values()) + [c for c in categories if c not in existing_categories.values()]
            
            # 2. Create Goal Templates with realistic data (check for existing)
            print("Creating goal templates...")
            
            # Check existing templates
            existing_templates = {}
            result = await session.execute(select(GoalTemplate))
            for template in result.scalars().all():
                existing_templates[template.temp_title] = template
            goal_templates = [
                # Senior Developer Template (100% total)
                GoalTemplate(
                    temp_title="Technical Excellence",
                    temp_description="Deliver high-quality code, mentor junior developers, and drive technical innovation",
                    temp_performance_factor="Code quality metrics, peer reviews, technical leadership",
                    temp_importance="High",
                    temp_weightage=40
                ),
                GoalTemplate(
                    temp_title="Project Leadership",
                    temp_description="Lead project initiatives, coordinate with stakeholders, and ensure timely delivery",
                    temp_performance_factor="Project completion rate, stakeholder satisfaction, team coordination",
                    temp_importance="High",
                    temp_weightage=35
                ),
                GoalTemplate(
                    temp_title="Team Collaboration",
                    temp_description="Foster collaborative environment, share knowledge, and support team members",
                    temp_performance_factor="Team feedback, knowledge sharing sessions, mentoring activities",
                    temp_importance="Medium",
                    temp_weightage=25
                ),
                
                # Manager Template (100% total)
                GoalTemplate(
                    temp_title="Strategic Planning",
                    temp_description="Develop and execute strategic initiatives to drive business growth",
                    temp_performance_factor="Strategy implementation, goal achievement, business impact",
                    temp_importance="High",
                    temp_weightage=35
                ),
                GoalTemplate(
                    temp_title="Team Management",
                    temp_description="Lead, develop, and retain high-performing teams",
                    temp_performance_factor="Team performance metrics, employee satisfaction, retention rate",
                    temp_importance="High",
                    temp_weightage=30
                ),
                GoalTemplate(
                    temp_title="Operational Excellence",
                    temp_description="Ensure efficient operations and continuous process improvement",
                    temp_performance_factor="Process efficiency, cost optimization, quality metrics",
                    temp_importance="High",
                    temp_weightage=25
                ),
                GoalTemplate(
                    temp_title="Stakeholder Management",
                    temp_description="Build and maintain strong relationships with key stakeholders",
                    temp_performance_factor="Stakeholder feedback, partnership success, communication effectiveness",
                    temp_importance="Medium",
                    temp_weightage=10
                ),
                
                # Junior Developer Template (100% total)
                GoalTemplate(
                    temp_title="Skill Development",
                    temp_description="Learn new technologies and improve programming skills",
                    temp_performance_factor="Certification completion, skill assessments, project complexity",
                    temp_importance="High",
                    temp_weightage=45
                ),
                GoalTemplate(
                    temp_title="Code Quality",
                    temp_description="Write clean, maintainable, and well-tested code",
                    temp_performance_factor="Code review scores, bug rates, test coverage",
                    temp_importance="High",
                    temp_weightage=35
                ),
                GoalTemplate(
                    temp_title="Professional Growth",
                    temp_description="Develop communication skills and industry knowledge",
                    temp_performance_factor="Presentation skills, industry engagement, feedback incorporation",
                    temp_importance="Medium",
                    temp_weightage=20
                ),
                
                # Annual Review Template (100% total)
                GoalTemplate(
                    temp_title="Business Impact",
                    temp_description="Contribute to organizational goals and business outcomes",
                    temp_performance_factor="Revenue impact, cost savings, process improvements",
                    temp_importance="High",
                    temp_weightage=40
                ),
                GoalTemplate(
                    temp_title="Innovation & Creativity",
                    temp_description="Drive innovation and propose creative solutions",
                    temp_performance_factor="Innovation proposals, implementation success, creative problem solving",
                    temp_importance="Medium",
                    temp_weightage=30
                ),
                GoalTemplate(
                    temp_title="Customer Satisfaction",
                    temp_description="Ensure high levels of customer satisfaction and service quality",
                    temp_performance_factor="Customer feedback scores, service metrics, issue resolution",
                    temp_importance="High",
                    temp_weightage=30
                ),
                
                # Quarterly Review Template (100% total)
                GoalTemplate(
                    temp_title="Quarterly Objectives",
                    temp_description="Meet specific quarterly targets and deliverables",
                    temp_performance_factor="Target achievement, deadline adherence, quality of deliverables",
                    temp_importance="High",
                    temp_weightage=60
                ),
                GoalTemplate(
                    temp_title="Process Improvement",
                    temp_description="Identify and implement process enhancements",
                    temp_performance_factor="Process efficiency gains, implementation success, team adoption",
                    temp_importance="Medium",
                    temp_weightage=25
                ),
                GoalTemplate(
                    temp_title="Knowledge Sharing",
                    temp_description="Share knowledge and best practices with the team",
                    temp_performance_factor="Training sessions, documentation, peer feedback",
                    temp_importance="Medium",
                    temp_weightage=15
                )
            ]
            
            # Only add templates that don't exist
            new_templates = []
            for template_data in goal_templates:
                if template_data.temp_title not in existing_templates:
                    new_templates.append(template_data)
                    session.add(template_data)
            
            if new_templates:
                await session.flush()
                print(f"Created {len(new_templates)} new goal templates")
            else:
                print("All goal templates already exist")
            
            # Use all templates (existing + new) for category associations
            all_templates = list(existing_templates.values()) + new_templates
            
            # 3. Associate templates with categories
            template_category_mapping = [
                # Senior Developer Template
                (all_templates[0] if len(all_templates) > 0 else goal_templates[0], [all_categories[0], all_categories[4]]),  # Technical, Quality
                (all_templates[1] if len(all_templates) > 1 else goal_templates[1], [all_categories[1], all_categories[7]]),  # Leadership, Project Management
                (all_templates[2] if len(all_templates) > 2 else goal_templates[2], [all_categories[2], all_categories[5]]),  # Communication, Collaboration
            ]
            
            # Skip category associations for now - just focus on creating the data
            print("Skipping category associations for this run")
            
            # 4. Summary of created template sets
            print("\n=== GOAL TEMPLATE SETS CREATED ===")
            print("1. Senior Developer Set (100% total):")
            print("   - Technical Excellence (40%)")
            print("   - Project Leadership (35%)")
            print("   - Team Collaboration (25%)")
            
            print("\n2. Manager Set (100% total):")
            print("   - Strategic Planning (35%)")
            print("   - Team Management (30%)")
            print("   - Operational Excellence (25%)")
            print("   - Stakeholder Management (10%)")
            
            print("\n3. Junior Developer Set (100% total):")
            print("   - Skill Development (45%)")
            print("   - Code Quality (35%)")
            print("   - Professional Growth (20%)")
            
            print("\n4. Annual Review Set (100% total):")
            print("   - Business Impact (40%)")
            print("   - Innovation & Creativity (30%)")
            print("   - Customer Satisfaction (30%)")
            
            print("\n5. Quarterly Review Set (100% total):")
            print("   - Quarterly Objectives (60%)")
            print("   - Process Improvement (25%)")
            print("   - Knowledge Sharing (15%)")
            
            print(f"\nTotal: {len(goal_templates)} templates with {len(categories)} categories")

async def verify_goal_templates():
    """Verify the created goal templates."""
    async with TestSessionLocal() as session:
        # Get all templates with categories
        result = await session.execute(
            select(GoalTemplate).options()
        )
        templates = result.scalars().all()
        
        print(f"\n=== VERIFICATION ===")
        print(f"Found {len(templates)} goal templates in database")
        
        for template in templates:
            print(f"- {template.temp_title}: {template.temp_weightage}% ({template.temp_importance} priority)")

async def get_employee_context():
    """Get employee data to understand the context for goal templates."""
    async with TestSessionLocal() as session:
        result = await session.execute(select(Employee))
        employees = result.scalars().all()
        
        print(f"\n=== EMPLOYEE CONTEXT ===")
        print(f"Found {len(employees)} employees in database:")
        for emp in employees:
            print(f"- {emp.emp_name} ({emp.emp_roles} - Level {emp.emp_roles_level})")

if __name__ == "__main__":
    async def main():
        await get_employee_context()
        await seed_goal_templates()
        await verify_goal_templates()
    
    asyncio.run(main())
