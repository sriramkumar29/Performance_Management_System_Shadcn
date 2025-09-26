from pydantic import BaseModel, Field, field_validator
from typing import Optional, List

from app.constants import IMPORTANCE_MUST_BE_VALID, WEIGHTAGE_MUST_BE_VALID, VALID_IMPORTANCE_LEVELS


class CategoryBase(BaseModel):
    """Base schema for Category."""
    
    name: str


class CategoryCreate(CategoryBase):
    """Schema for creating a Category."""
    pass


class CategoryResponse(CategoryBase):
    """Schema for Category response."""
    
    id: int
    
    class Config:
        from_attributes = True


class GoalTemplateBase(BaseModel):
    """Base schema for GoalTemplate."""
    
    temp_title: str
    temp_description: str
    temp_performance_factor: str
    temp_importance: str
    temp_weightage: int
    
    @field_validator('temp_importance')
    def validate_importance(cls, v):
        if v not in VALID_IMPORTANCE_LEVELS:
            raise ValueError(IMPORTANCE_MUST_BE_VALID)
        return v
    
    @field_validator('temp_weightage')
    def validate_weightage(cls, v):
        if not 0 <= v <= 100:
            raise ValueError(WEIGHTAGE_MUST_BE_VALID)
        return v


class GoalTemplateCreate(GoalTemplateBase):
    """Schema for creating a GoalTemplate."""
    # Accept category names to match router behavior
    categories: List[str] = []
    
    @field_validator('categories')
    def validate_categories(cls, v):
        if not isinstance(v, list):
            return []
        # Coerce all items to str
        return [str(item) for item in v]


class GoalTemplateUpdate(BaseModel):
    """Schema for updating a GoalTemplate."""
    
    temp_title: Optional[str] = None
    temp_description: Optional[str] = None
    temp_performance_factor: Optional[str] = None
    temp_importance: Optional[str] = None
    temp_weightage: Optional[int] = None
    categories: Optional[List[str]] = None
    
    @field_validator('temp_importance')
    def validate_importance(cls, v):
        if v is not None and v not in VALID_IMPORTANCE_LEVELS:
            raise ValueError(IMPORTANCE_MUST_BE_VALID)
        return v
    
    @field_validator('temp_weightage')
    def validate_weightage(cls, v):
        if v is not None and not 0 <= v <= 100:
            raise ValueError(WEIGHTAGE_MUST_BE_VALID)
        return v


class GoalTemplateResponse(GoalTemplateBase):
    """Schema for GoalTemplate response."""
    
    temp_id: int
    categories: List[CategoryResponse] = []
    
    class Config:
        from_attributes = True


class GoalBase(BaseModel):
    """Base schema for Goal."""
    
    goal_title: str
    goal_description: str
    goal_performance_factor: str
    goal_importance: str
    goal_weightage: int
    
    @field_validator('goal_importance')
    def validate_importance(cls, v):
        if v not in VALID_IMPORTANCE_LEVELS:
            raise ValueError(IMPORTANCE_MUST_BE_VALID)
        return v
    
    @field_validator('goal_weightage')
    def validate_weightage(cls, v):
        if not 0 <= v <= 100:
            raise ValueError(WEIGHTAGE_MUST_BE_VALID)
        return v


class GoalCreate(GoalBase):
    """Schema for creating a Goal."""
    
    goal_template_id: Optional[int] = None
    category_id: Optional[int] = None


class GoalUpdate(BaseModel):
    """Schema for updating a Goal."""
    
    goal_title: Optional[str] = None
    goal_description: Optional[str] = None
    goal_performance_factor: Optional[str] = None
    goal_importance: Optional[str] = None
    goal_weightage: Optional[int] = None
    category_id: Optional[int] = None
    
    @field_validator('goal_importance')
    def validate_importance(cls, v):
        if v is not None and v not in VALID_IMPORTANCE_LEVELS:
            raise ValueError(IMPORTANCE_MUST_BE_VALID)
        return v
    
    @field_validator('goal_weightage')
    def validate_weightage(cls, v):
        if v is not None and not 0 <= v <= 100:
            raise ValueError(WEIGHTAGE_MUST_BE_VALID)
        return v


class GoalResponse(GoalBase):
    """Schema for Goal response."""
    
    goal_id: int
    goal_template_id: Optional[int] = None
    category_id: Optional[int] = None
    category: Optional[CategoryResponse] = None
    
    class Config:
        from_attributes = True
    
    class Config:
        from_attributes = True


class AppraisalGoalBase(BaseModel):
    """Base schema for AppraisalGoal."""
    
    appraisal_id: int
    goal_id: int
    self_comment: Optional[str] = None
    self_rating: Optional[int] = None
    appraiser_comment: Optional[str] = None
    appraiser_rating: Optional[int] = None
    
    @field_validator('self_rating', 'appraiser_rating')
    def validate_rating(cls, v):
        if v is not None and not 1 <= v <= 5:
            raise ValueError('Rating must be between 1 and 5')
        return v


class AppraisalGoalCreate(AppraisalGoalBase):
    """Schema for creating an AppraisalGoal."""
    pass


class AppraisalGoalUpdate(BaseModel):
    """Schema for updating an AppraisalGoal."""
    
    self_comment: Optional[str] = None
    self_rating: Optional[int] = None
    appraiser_comment: Optional[str] = None
    appraiser_rating: Optional[int] = None
    
    @field_validator('self_rating', 'appraiser_rating')
    def validate_rating(cls, v):
        if v is not None and not 1 <= v <= 5:
            raise ValueError('Rating must be between 1 and 5')
        return v


class AppraisalGoalResponse(AppraisalGoalBase):
    """Schema for AppraisalGoal response."""
    
    id: int
    goal: GoalResponse
    
    class Config:
        from_attributes = True
