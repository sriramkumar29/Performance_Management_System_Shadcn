from pydantic import BaseModel, Field
from typing import Optional, List


class AppraisalRangeBase(BaseModel):
    """Base schema for AppraisalRange."""
    
    name: str
    start_month_offset: int
    end_month_offset: int


class AppraisalRangeCreate(AppraisalRangeBase):
    """Schema for creating an AppraisalRange."""
    
    appraisal_type_id: int


class AppraisalRangeUpdate(BaseModel):
    """Schema for updating an AppraisalRange."""
    
    name: Optional[str] = None
    start_month_offset: Optional[int] = None
    end_month_offset: Optional[int] = None


class AppraisalRangeResponse(AppraisalRangeBase):
    """Schema for AppraisalRange response."""
    
    id: int
    appraisal_type_id: int
    
    class Config:
        from_attributes = True


class AppraisalTypeBase(BaseModel):
    """Base schema for AppraisalType."""
    
    name: str
    has_range: bool = False


class AppraisalTypeCreate(AppraisalTypeBase):
    """Schema for creating an AppraisalType."""
    pass


class AppraisalTypeUpdate(BaseModel):
    """Schema for updating an AppraisalType."""
    
    name: Optional[str] = None
    has_range: Optional[bool] = None


class AppraisalTypeResponse(AppraisalTypeBase):
    """Schema for AppraisalType response."""
    
    id: int
    
    class Config:
        from_attributes = True


class AppraisalTypeWithRanges(AppraisalTypeResponse):
    """Schema for AppraisalType with ranges."""
    
    ranges: List[AppraisalRangeResponse] = []
    
    class Config:
        from_attributes = True
