from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Dict, Union
from datetime import date
from app.models.appraisal import AppraisalStatus
from app.schemas.goal import AppraisalGoalResponse, GoalResponse


class AppraisalBase(BaseModel):
    """Base schema for Appraisal."""
    
    appraisee_id: int = Field(..., gt=0, description="ID of the employee being appraised")
    appraiser_id: int = Field(..., gt=0, description="ID of the appraiser")
    reviewer_id: int = Field(..., gt=0, description="ID of the reviewer")
    appraisal_type_id: int = Field(..., gt=0, description="ID of the appraisal type")
    appraisal_type_range_id: Optional[int] = Field(None, gt=0, description="ID of the appraisal type range")
    start_date: date = Field(..., description="Appraisal start date")
    end_date: date = Field(..., description="Appraisal end date")
    
    @field_validator('end_date')
    @classmethod
    def end_date_must_be_after_start_date(cls, v, info):
        if info.data.get('start_date') and v <= info.data['start_date']:
            raise ValueError('End date must be after start date')
        return v
    
    @model_validator(mode='before')
    @classmethod
    def validate_different_roles(cls, values):
        if isinstance(values, dict):
            appraisee_id = values.get('appraisee_id')
            appraiser_id = values.get('appraiser_id')
            reviewer_id = values.get('reviewer_id')
            
            if appraiser_id and appraisee_id and appraiser_id == appraisee_id:
                raise ValueError('Appraiser cannot be the same as appraisee')
            if reviewer_id and appraisee_id and reviewer_id == appraisee_id:
                raise ValueError('Reviewer cannot be the same as appraisee')
            if reviewer_id and appraiser_id and reviewer_id == appraiser_id:
                raise ValueError('Reviewer cannot be the same as appraiser')
        return values


class AppraisalCreate(AppraisalBase):
    """Schema for creating an Appraisal."""
    
    status: AppraisalStatus = Field(AppraisalStatus.DRAFT, description="Initial appraisal status")
    goal_ids: List[int] = Field(default=[], description="List of goal IDs to associate with appraisal")
    
    @field_validator('goal_ids')
    @classmethod
    def validate_goal_ids(cls, v):
        if v and len(v) != len(set(v)):
            raise ValueError('Duplicate goal IDs are not allowed')
        if v and any(goal_id <= 0 for goal_id in v):
            raise ValueError('All goal IDs must be positive integers')
        return v


class AppraisalUpdate(BaseModel):
    """Schema for updating an Appraisal."""
    
    appraisee_id: Optional[int] = Field(None, gt=0, description="ID of the employee being appraised")
    appraiser_id: Optional[int] = Field(None, gt=0, description="ID of the appraiser")
    reviewer_id: Optional[int] = Field(None, gt=0, description="ID of the reviewer")
    appraisal_type_id: Optional[int] = Field(None, gt=0, description="ID of the appraisal type")
    appraisal_type_range_id: Optional[int] = Field(None, gt=0, description="ID of the appraisal type range")
    start_date: Optional[date] = Field(None, description="Appraisal start date")
    end_date: Optional[date] = Field(None, description="Appraisal end date")
    status: Optional[AppraisalStatus] = Field(None, description="Appraisal status")
    appraiser_overall_comments: Optional[str] = Field(None, max_length=2000, description="Appraiser overall comments")
    appraiser_overall_rating: Optional[int] = Field(None, ge=1, le=5, description="Appraiser overall rating (1-5)")
    reviewer_overall_comments: Optional[str] = Field(None, max_length=2000, description="Reviewer overall comments")
    reviewer_overall_rating: Optional[int] = Field(None, ge=1, le=5, description="Reviewer overall rating (1-5)")
    
    @field_validator('end_date')
    @classmethod
    def end_date_must_be_after_start_date(cls, v, info):
        if v is not None and info.data.get('start_date') is not None and v <= info.data['start_date']:
            raise ValueError('End date must be after start date')
        return v


class AppraisalResponse(AppraisalBase):
    """Schema for Appraisal response."""
    
    appraisal_id: int = Field(..., description="Appraisal ID")
    status: AppraisalStatus = Field(..., description="Current appraisal status")
    appraiser_overall_comments: Optional[str] = Field(None, description="Appraiser overall comments")
    appraiser_overall_rating: Optional[int] = Field(None, description="Appraiser overall rating")
    reviewer_overall_comments: Optional[str] = Field(None, description="Reviewer overall comments")
    reviewer_overall_rating: Optional[int] = Field(None, description="Reviewer overall rating")
    created_at: date = Field(..., description="Creation date")
    updated_at: date = Field(..., description="Last update date")
    
    class Config:
        from_attributes = True


class AppraisalWithGoals(AppraisalResponse):
    """Schema for Appraisal with goals."""
    
    appraisal_goals: List[AppraisalGoalResponse] = Field(default=[], description="Associated appraisal goals")
    
    class Config:
        from_attributes = True


class AppraisalStatusUpdate(BaseModel):
    """Schema for updating Appraisal status."""
    
    status: AppraisalStatus = Field(..., description="New appraisal status")


class SelfAssessmentUpdate(BaseModel):
    """Schema for updating self assessment."""
    
    goals: Dict[int, Dict[str, Optional[Union[str, int]]]] = Field(
        ..., 
        description="Goal assessments: goal_id -> {self_comment, self_rating}"
    )
    
    @field_validator('goals')
    @classmethod
    def validate_goals_data(cls, v):
        for goal_id, goal_data in v.items():
            if goal_id <= 0:
                raise ValueError('Goal ID must be a positive integer')
            
            if not isinstance(goal_data, dict):
                raise ValueError('Goal data must be a dictionary')
            
            # Validate rating if provided
            if 'self_rating' in goal_data:
                rating = goal_data['self_rating']
                if rating is not None and (not isinstance(rating, int) or not 1 <= rating <= 5):
                    raise ValueError(f'Self rating for goal {goal_id} must be between 1 and 5')
            
            # Validate comment if provided
            if 'self_comment' in goal_data:
                comment = goal_data['self_comment']
                if comment is not None and (not isinstance(comment, str) or len(comment) > 2000):
                    raise ValueError(f'Self comment for goal {goal_id} must be a string with max 2000 characters')
        
        return v


class AppraiserEvaluationUpdate(BaseModel):
    """Schema for updating appraiser evaluation."""
    
    goals: Dict[int, Dict[str, Optional[str | int]]]  # goal_id -> {appraiser_comment, appraiser_rating}
    appraiser_overall_comments: Optional[str] = None
    appraiser_overall_rating: Optional[int] = None
    
    @field_validator('appraiser_overall_rating')
    @classmethod
    def validate_rating(cls, v):
        if v is not None and not 1 <= v <= 5:
            raise ValueError('Rating must be between 1 and 5')
        return v


class ReviewerEvaluationUpdate(BaseModel):
    """Schema for updating reviewer evaluation."""
    
    reviewer_overall_comments: Optional[str] = None
    reviewer_overall_rating: Optional[int] = None
    
    @field_validator('reviewer_overall_rating')
    @classmethod
    def validate_rating(cls, v):
        if v is not None and not 1 <= v <= 5:
            raise ValueError('Rating must be between 1 and 5')
        return v
