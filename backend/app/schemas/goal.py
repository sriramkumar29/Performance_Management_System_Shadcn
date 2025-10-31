from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

from app.constants import IMPORTANCE_MUST_BE_VALID, WEIGHTAGE_MUST_BE_VALID, VALID_IMPORTANCE_LEVELS


# ===== Goal Template Header Schemas =====

class GoalTemplateTypeEnum(str, Enum):
    """Enum for goal template types."""
    ORGANIZATION = "Organization"
    SELF = "Self"


class GoalTemplateHeaderBase(BaseModel):
    """Base schema for GoalTemplateHeader."""

    role_id: int
    title: str
    description: Optional[str] = None


class GoalTemplateHeaderCreate(GoalTemplateHeaderBase):
    """Schema for creating a GoalTemplateHeader."""
    goal_template_type: GoalTemplateTypeEnum = GoalTemplateTypeEnum.ORGANIZATION
    is_shared: bool = False
    shared_users_id: Optional[List[int]] = None

    @field_validator('shared_users_id')
    def validate_shared_users(cls, v, info):
        """Validate shared_users_id based on goal_template_type."""
        data = info.data
        goal_type = data.get('goal_template_type')

        # If type is Self and shared_users_id is provided, mark as shared
        if goal_type == GoalTemplateTypeEnum.SELF and v and len(v) > 0:
            data['is_shared'] = True

        return v


class GoalTemplateHeaderUpdate(BaseModel):
    """Schema for updating a GoalTemplateHeader."""

    title: Optional[str] = None
    description: Optional[str] = None
    goal_template_type: Optional[GoalTemplateTypeEnum] = None
    is_shared: Optional[bool] = None
    shared_users_id: Optional[List[int]] = None


class GoalTemplateHeaderResponse(GoalTemplateHeaderBase):
    """Schema for GoalTemplateHeader response."""

    header_id: int
    creator_id: Optional[int] = None
    goal_template_type: GoalTemplateTypeEnum
    is_shared: bool
    shared_users_id: Optional[List[int]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ===== Category Schemas =====

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
        # Normalize common variants (e.g. 'HIGH', 'high') to the canonical form
        if isinstance(v, str):
            v_str = v.strip()
            # map 'HIGH'/'high' -> 'High'
            if v_str.lower() in ('high', 'medium', 'low'):
                v_norm = v_str.capitalize()
            else:
                v_norm = v_str
        else:
            v_norm = v

        if v_norm not in VALID_IMPORTANCE_LEVELS:
            raise ValueError(IMPORTANCE_MUST_BE_VALID)
        return v_norm
    
    @field_validator('temp_weightage')
    def validate_weightage(cls, v):
        if not 0 <= v <= 100:
            raise ValueError(WEIGHTAGE_MUST_BE_VALID)
        return v


class GoalTemplateCreate(GoalTemplateBase):
    """Schema for creating a GoalTemplate."""
    # Accept category names to match router behavior
    categories: List[str] = []
    header_id: Optional[int] = None

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
    header_id: Optional[int] = None

    @field_validator('temp_importance')
    def validate_importance(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            v_str = v.strip()
            if v_str.lower() in ('high', 'medium', 'low'):
                v_norm = v_str.capitalize()
            else:
                v_norm = v_str
        else:
            v_norm = v

        if v_norm not in VALID_IMPORTANCE_LEVELS:
            raise ValueError(IMPORTANCE_MUST_BE_VALID)
        return v_norm

    @field_validator('temp_weightage')
    def validate_weightage(cls, v):
        if v is not None and not 0 <= v <= 100:
            raise ValueError(WEIGHTAGE_MUST_BE_VALID)
        return v


class GoalTemplateResponse(GoalTemplateBase):
    """Schema for GoalTemplate response."""

    temp_id: int
    header_id: Optional[int] = None
    categories: List[CategoryResponse] = []

    class Config:
        from_attributes = True


# Combined schema for header with templates
class GoalTemplateHeaderWithTemplates(GoalTemplateHeaderResponse):
    """Schema for header with all its templates."""

    goal_templates: List[GoalTemplateResponse] = []
    total_default_weightage: Optional[int] = 0

    @field_validator('total_default_weightage', mode='before')
    def calculate_total_weightage(cls, v, info):
        # Calculate from goal_templates if not provided
        templates = info.data.get('goal_templates', [])
        if templates:
            return sum(t.temp_weightage if isinstance(t, GoalTemplateResponse) else t.get('temp_weightage', 0) for t in templates)
        return v or 0


class GoalBase(BaseModel):
    """Base schema for Goal."""
    
    goal_title: str
    goal_description: str
    goal_performance_factor: str
    goal_importance: str
    goal_weightage: int
    
    @field_validator('goal_importance')
    def validate_importance(cls, v):
        if isinstance(v, str):
            v_str = v.strip()
            if v_str.lower() in ('high', 'medium', 'low'):
                v_norm = v_str.capitalize()
            else:
                v_norm = v_str
        else:
            v_norm = v

        if v_norm not in VALID_IMPORTANCE_LEVELS:
            raise ValueError(IMPORTANCE_MUST_BE_VALID)
        return v_norm
    
    @field_validator('goal_weightage')
    def validate_weightage(cls, v):
        if not 0 <= v <= 100:
            raise ValueError(WEIGHTAGE_MUST_BE_VALID)
        return v


class GoalCreate(GoalBase):
    """Schema for creating a Goal."""
    
    goal_template_id: Optional[int] = None
    # New: accept multiple categories by id
    category_ids: Optional[List[int]] = None
    # Keep legacy single id for backward compatibility
    category_id: Optional[int] = None


class GoalUpdate(BaseModel):
    """Schema for updating a Goal."""
    
    goal_title: Optional[str] = None
    goal_description: Optional[str] = None
    goal_performance_factor: Optional[str] = None
    goal_importance: Optional[str] = None
    goal_weightage: Optional[int] = None
    # Allow updating multiple categories
    category_ids: Optional[List[int]] = None
    # Keep legacy single id for compatibility
    category_id: Optional[int] = None
    
    @field_validator('goal_importance')
    def validate_importance(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            v_str = v.strip()
            if v_str.lower() in ('high', 'medium', 'low'):
                v_norm = v_str.capitalize()
            else:
                v_norm = v_str
        else:
            v_norm = v

        if v_norm not in VALID_IMPORTANCE_LEVELS:
            raise ValueError(IMPORTANCE_MUST_BE_VALID)
        return v_norm
    
    @field_validator('goal_weightage')
    def validate_weightage(cls, v):
        if v is not None and not 0 <= v <= 100:
            raise ValueError(WEIGHTAGE_MUST_BE_VALID)
        return v


class GoalResponse(GoalBase):
    """Schema for Goal response."""
    
    goal_id: int
    goal_template_id: Optional[int] = None
    # Provide both legacy single-id and list of category ids
    category_id: Optional[int] = None
    category_ids: List[int] = []
    categories: List[CategoryResponse] = []
    
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
