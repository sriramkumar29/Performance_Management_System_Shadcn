from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict
from datetime import date
from app.models.appraisal import AppraisalStatus
from app.schemas.goal import AppraisalGoalResponse, GoalResponse


class AppraisalBase(BaseModel):
    """Base schema for Appraisal."""
    
    appraisee_id: int
    appraiser_id: int
    reviewer_id: int
    appraisal_type_id: int
    appraisal_type_range_id: Optional[int] = None
    start_date: date
    end_date: date
    
    @validator('end_date')
    def end_date_must_be_after_start_date(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('End date must be after start date')
        return v


class AppraisalCreate(AppraisalBase):
    """Schema for creating an Appraisal."""
    
    status: AppraisalStatus = AppraisalStatus.DRAFT
    goal_ids: List[int] = []


class AppraisalUpdate(BaseModel):
    """Schema for updating an Appraisal."""
    
    appraisee_id: Optional[int] = None
    appraiser_id: Optional[int] = None
    reviewer_id: Optional[int] = None
    appraisal_type_id: Optional[int] = None
    appraisal_type_range_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[AppraisalStatus] = None
    appraiser_overall_comments: Optional[str] = None
    appraiser_overall_rating: Optional[int] = None
    reviewer_overall_comments: Optional[str] = None
    reviewer_overall_rating: Optional[int] = None
    
    @validator('end_date')
    def end_date_must_be_after_start_date(cls, v, values):
        if v is not None and 'start_date' in values and values['start_date'] is not None and v < values['start_date']:
            raise ValueError('End date must be after start date')
        return v
    
    @validator('appraiser_overall_rating', 'reviewer_overall_rating')
    def validate_rating(cls, v):
        if v is not None and not 1 <= v <= 5:
            raise ValueError('Rating must be between 1 and 5')
        return v


class AppraisalResponse(AppraisalBase):
    """Schema for Appraisal response."""
    
    appraisal_id: int
    status: AppraisalStatus
    appraiser_overall_comments: Optional[str] = None
    appraiser_overall_rating: Optional[int] = None
    reviewer_overall_comments: Optional[str] = None
    reviewer_overall_rating: Optional[int] = None
    created_at: date
    updated_at: date
    
    class Config:
        from_attributes = True


class AppraisalWithGoals(AppraisalResponse):
    """Schema for Appraisal with goals."""
    
    appraisal_goals: List[AppraisalGoalResponse] = []
    
    class Config:
        from_attributes = True


class AppraisalStatusUpdate(BaseModel):
    """Schema for updating Appraisal status."""
    
    status: AppraisalStatus


class SelfAssessmentUpdate(BaseModel):
    """Schema for updating self assessment."""
    
    goals: Dict[int, Dict[str, Optional[str | int]]]  # goal_id -> {self_comment, self_rating}


class AppraiserEvaluationUpdate(BaseModel):
    """Schema for updating appraiser evaluation."""
    
    goals: Dict[int, Dict[str, Optional[str | int]]]  # goal_id -> {appraiser_comment, appraiser_rating}
    appraiser_overall_comments: Optional[str] = None
    appraiser_overall_rating: Optional[int] = None
    
    @validator('appraiser_overall_rating')
    def validate_rating(cls, v):
        if v is not None and not 1 <= v <= 5:
            raise ValueError('Rating must be between 1 and 5')
        return v


class ReviewerEvaluationUpdate(BaseModel):
    """Schema for updating reviewer evaluation."""
    
    reviewer_overall_comments: Optional[str] = None
    reviewer_overall_rating: Optional[int] = None
    
    @validator('reviewer_overall_rating')
    def validate_rating(cls, v):
        if v is not None and not 1 <= v <= 5:
            raise ValueError('Rating must be between 1 and 5')
        return v
