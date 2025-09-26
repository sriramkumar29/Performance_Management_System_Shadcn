"""
Models package initialization.

This module imports all models to ensure they are registered with SQLAlchemy
and relationships can be properly resolved.
"""

from app.models.employee import Employee
from app.models.appraisal import Appraisal, AppraisalStatus
from app.models.goal import Goal, GoalTemplate, Category, AppraisalGoal
from app.models.appraisal_type import AppraisalType

__all__ = [
    "Employee",
    "Appraisal",
    "AppraisalStatus", 
    "Goal",
    "GoalTemplate",
    "Category",
    "AppraisalGoal",
    "AppraisalType",
]
