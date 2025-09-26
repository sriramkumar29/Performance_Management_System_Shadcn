from sqlalchemy import Column, Integer, String, Date, ForeignKey, Enum, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.database import Base
from app.constants import (
    EMPLOYEES_EMP_ID, 
    APPRAISAL_TYPES_ID, 
    APPRAISAL_RANGES_ID,
    ON_DELETE_CASCADE, 
    ON_DELETE_SET_NULL, 
    ON_DELETE_RESTRICT,
    CONSTRAINT_RATING_1_TO_5
)


class AppraisalStatus(str, enum.Enum):
    """Enum for appraisal status."""
    
    DRAFT = "Draft"
    SUBMITTED = "Submitted"
    APPRAISEE_SELF_ASSESSMENT = "Appraisee Self Assessment"
    APPRAISER_EVALUATION = "Appraiser Evaluation"
    REVIEWER_EVALUATION = "Reviewer Evaluation"
    COMPLETE = "Complete"


class Appraisal(Base):
    """Appraisal model."""
    
    __tablename__ = "appraisals"
    
    appraisal_id = Column(Integer, primary_key=True, index=True)
    appraisee_id = Column(Integer, ForeignKey(EMPLOYEES_EMP_ID, ondelete=ON_DELETE_CASCADE), nullable=False)
    appraiser_id = Column(Integer, ForeignKey(EMPLOYEES_EMP_ID, ondelete=ON_DELETE_SET_NULL), nullable=False)
    reviewer_id = Column(Integer, ForeignKey(EMPLOYEES_EMP_ID, ondelete=ON_DELETE_SET_NULL), nullable=False)
    appraisal_type_id = Column(Integer, ForeignKey(APPRAISAL_TYPES_ID, ondelete=ON_DELETE_RESTRICT), nullable=False)
    appraisal_type_range_id = Column(Integer, ForeignKey(APPRAISAL_RANGES_ID, ondelete=ON_DELETE_RESTRICT), nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(Enum(AppraisalStatus), default=AppraisalStatus.DRAFT, nullable=False)
    appraiser_overall_comments = Column(String, nullable=True)
    appraiser_overall_rating = Column(Integer, CheckConstraint(f"appraiser_overall_rating {CONSTRAINT_RATING_1_TO_5}"), nullable=True)
    reviewer_overall_comments = Column(String, nullable=True)
    reviewer_overall_rating = Column(Integer, CheckConstraint(f"reviewer_overall_rating {CONSTRAINT_RATING_1_TO_5}"), nullable=True)
    created_at = Column(Date, server_default=func.now(), nullable=False)
    updated_at = Column(Date, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships - using string-based references to avoid circular imports
    appraisee = relationship(
        "Employee", 
        foreign_keys=[appraisee_id], 
        back_populates="appraisals_as_appraisee",
        lazy="selectin"
    )
    appraiser = relationship(
        "Employee", 
        foreign_keys=[appraiser_id], 
        back_populates="appraisals_as_appraiser",
        lazy="selectin"
    )
    reviewer = relationship(
        "Employee", 
        foreign_keys=[reviewer_id], 
        back_populates="appraisals_as_reviewer",
        lazy="selectin"
    )
    appraisal_type = relationship(
        "AppraisalType", 
        back_populates="appraisals",
        lazy="selectin"
    )
    appraisal_range = relationship(
        "AppraisalRange", 
        back_populates="appraisals",
        lazy="selectin"
    )
    appraisal_goals = relationship(
        "AppraisalGoal", 
        back_populates="appraisal", 
        cascade="all, delete-orphan"
    )
