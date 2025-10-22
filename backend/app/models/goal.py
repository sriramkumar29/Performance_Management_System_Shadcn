from sqlalchemy import Column, Integer, String, ForeignKey, Table, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
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
    temp_title = Column(String, nullable=False)
    temp_description = Column(String, nullable=False)
    temp_performance_factor = Column(String, nullable=False)
    temp_importance = Column(String, nullable=False)  # High/Medium/Low
    temp_weightage = Column(Integer, nullable=False)  # percentage
    
    # Relationships
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
