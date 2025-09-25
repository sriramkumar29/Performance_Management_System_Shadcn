"""
Repository layer for the Performance Management System.

This module provides data access abstraction using the Repository pattern.
All database operations are centralized here to separate data access logic
from business logic in the services layer.
"""

from .base_repository import BaseRepository
from .employee_repository import EmployeeRepository
from .appraisal_repository import AppraisalRepository
from .goal_repository import (
    GoalRepository,
    GoalTemplateRepository,
    CategoryRepository,
    AppraisalGoalRepository
)
from .user_repository import UserRepository

# Export all repositories
__all__ = [
    # Base repository
    "BaseRepository",
    
    # Main entity repositories
    "EmployeeRepository",
    "AppraisalRepository",
    "GoalRepository",
    "UserRepository",
    
    # Goal-related repositories
    "GoalTemplateRepository",
    "CategoryRepository",
    "AppraisalGoalRepository",
]


# Repository instances for dependency injection
employee_repository = EmployeeRepository()
appraisal_repository = AppraisalRepository()
goal_repository = GoalRepository()
goal_template_repository = GoalTemplateRepository()
category_repository = CategoryRepository()
appraisal_goal_repository = AppraisalGoalRepository()
user_repository = UserRepository()