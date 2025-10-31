from sqlalchemy import Column, Integer, String, ForeignKey, Table, CheckConstraint, UniqueConstraint, DateTime, Text, Boolean, Enum as SQLEnum, JSON
from sqlalchemy.dialects.postgresql import ENUM as PGEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
from app.constants import (
    GOALS_TEMPLATE_TEMP_ID,
    CATEGORIES_ID,
    APPRAISALS_APPRAISAL_ID,
    GOALS_GOAL_ID,
    ON_DELETE_CASCADE,
    ON_DELETE_SET_NULL,
    CONSTRAINT_RATING_1_TO_5
)
import enum


# Category association table for goal templates
goal_template_categories = Table(
    "goal_template_categories",
    Base.metadata,
    Column("template_id", Integer, ForeignKey(GOALS_TEMPLATE_TEMP_ID, ondelete=ON_DELETE_CASCADE), primary_key=True),
    Column("category_id", Integer, ForeignKey(CATEGORIES_ID, ondelete=ON_DELETE_CASCADE), primary_key=True)
)

# Many-to-many association table for goals <-> categories
goal_categories = Table(
    "goal_categories",
    Base.metadata,
    Column("goal_id", Integer, ForeignKey(GOALS_GOAL_ID, ondelete=ON_DELETE_CASCADE), primary_key=True),
    Column("category_id", Integer, ForeignKey(CATEGORIES_ID, ondelete=ON_DELETE_CASCADE), primary_key=True)
)

# Removed goal_categories association table - now using direct foreign key


class GoalTemplateType(str, enum.Enum):
    """Enum for goal template types."""
    ORGANIZATION = "Organization"
    SELF = "Self"


class GoalTemplateHeader(Base):
    """Goal template header model - groups templates by role."""

    __tablename__ = "goal_template_header"
    __table_args__ = (
        UniqueConstraint('role_id', 'title', name='uq_role_title'),
    )

    header_id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete=ON_DELETE_CASCADE), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # New fields for access control and sharing
    creator_id = Column(Integer, ForeignKey("employees.emp_id", ondelete=ON_DELETE_SET_NULL), nullable=True, index=True)
    # Use PostgreSQL ENUM type so the DB enum name is respected and asyncpg
    # receives a parameter compatible with the DB enum (avoid varchar -> enum mismatch)
    # Ensure SQLAlchemy knows the enum's textual values (not member names)
    goal_template_type = Column(
        PGEnum(
            GoalTemplateType,
            name="goaltemplatetype",
            create_type=False,
            native_enum=False,
            values_callable=lambda enum_cls: [e.value for e in enum_cls]
        ),
        nullable=False,
        default=GoalTemplateType.ORGANIZATION.value,
        server_default="Organization",
    )
    is_shared = Column(Boolean, nullable=False, default=False, server_default="false")
    shared_users_id = Column(JSON, nullable=True)  # List of employee IDs this header is shared with

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    role = relationship("Role", back_populates="template_headers")
    goal_templates = relationship("GoalTemplate", back_populates="header", cascade="all, delete-orphan")
    creator = relationship("Employee", foreign_keys=[creator_id])


class Category(Base):
    """Category model for goal templates."""
    
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    
    # Relationships
    goal_templates = relationship(
        "GoalTemplate",
        secondary=goal_template_categories,
        back_populates="categories"
    )

    # Many-to-many relationship with goals (a Category can apply to many Goals)
    goals = relationship(
        "Goal",
        secondary=goal_categories,
        back_populates="categories"
    )


class GoalTemplate(Base):
    """Goal template model."""

    __tablename__ = "goals_template"

    temp_id = Column(Integer, primary_key=True, index=True)
    header_id = Column(Integer, ForeignKey("goal_template_header.header_id", ondelete=ON_DELETE_CASCADE), nullable=True, index=True)
    temp_title = Column(String, nullable=False)
    temp_description = Column(String, nullable=False)
    temp_performance_factor = Column(String, nullable=False)
    temp_importance = Column(String, nullable=False)  # High/Medium/Low
    temp_weightage = Column(Integer, nullable=False)  # percentage

    # Relationships
    header = relationship("GoalTemplateHeader", back_populates="goal_templates")
    categories = relationship(
        "Category",
        secondary=goal_template_categories,
        back_populates="goal_templates"
    )
    goals = relationship("Goal", back_populates="template")


class Goal(Base):
    """Goal model."""
    
    __tablename__ = "goals"
    
    goal_id = Column(Integer, primary_key=True, index=True)
    goal_template_id = Column(Integer, ForeignKey(GOALS_TEMPLATE_TEMP_ID, ondelete=ON_DELETE_SET_NULL), nullable=True)
    # Keep legacy single-category FK for backward compatibility
    category_id = Column(Integer, ForeignKey(CATEGORIES_ID, ondelete=ON_DELETE_SET_NULL), nullable=True)
    goal_title = Column(String, nullable=False)
    goal_description = Column(String, nullable=False)
    goal_performance_factor = Column(String, nullable=False)
    goal_importance = Column(String, nullable=False)  # High/Medium/Low
    goal_weightage = Column(Integer, nullable=False)  # percentage
    
    # Relationships - using string-based references to avoid circular imports
    template = relationship("GoalTemplate", back_populates="goals")

    # Legacy single-category relationship (nullable) kept for compatibility
    category = relationship("Category", back_populates=None, foreign_keys=[category_id])

    # Many-to-many categories relationship
    categories = relationship(
        "Category",
        secondary=goal_categories,
        back_populates="goals"
    )

    appraisal_goals = relationship(
        "AppraisalGoal", 
        back_populates="goal", 
        cascade="all, delete-orphan"
    )


class AppraisalGoal(Base):
    """AppraisalGoal model - linking appraisals and goals with evaluations."""
    
    __tablename__ = "appraisal_goals"
    __table_args__ = (
        # A goal can belong to at most one appraisal
        UniqueConstraint("goal_id", name="uq_appraisal_goals_goal_id"),
        # Prevent duplicate (appraisal_id, goal_id) rows within the same appraisal
        UniqueConstraint("appraisal_id", "goal_id", name="uq_appraisal_goals_appraisal_goal"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    appraisal_id = Column(Integer, ForeignKey(APPRAISALS_APPRAISAL_ID, ondelete=ON_DELETE_CASCADE), nullable=False)
    goal_id = Column(Integer, ForeignKey(GOALS_GOAL_ID, ondelete=ON_DELETE_CASCADE), nullable=False)
    
    # Evaluation fields - moved from Goals table as per recommendations
    self_comment = Column(String, nullable=True)
    self_rating = Column(Integer, CheckConstraint(f"self_rating {CONSTRAINT_RATING_1_TO_5}"), nullable=True)
    appraiser_comment = Column(String, nullable=True)
    appraiser_rating = Column(Integer, CheckConstraint(f"appraiser_rating {CONSTRAINT_RATING_1_TO_5}"), nullable=True)
    
    # Relationships - using string-based references to avoid circular imports
    appraisal = relationship(
        "Appraisal", 
        back_populates="appraisal_goals"
    )
    goal = relationship(
        "Goal", 
        back_populates="appraisal_goals"
    )
