from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base


class AppraisalType(Base):
    """Appraisal type model."""
    
    __tablename__ = "appraisal_types"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)  # e.g., Annual, Half-yearly, Quarterly, Tri-annual, Project-end, Annual-Probation
    has_range = Column(Boolean, default=False)
    
    # Relationships
    ranges = relationship("AppraisalRange", back_populates="appraisal_type", cascade="all, delete-orphan")
    appraisals = relationship("Appraisal", back_populates="appraisal_type")


class AppraisalRange(Base):
    """Appraisal range model."""
    
    __tablename__ = "appraisal_ranges"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    appraisal_type_id = Column(Integer, ForeignKey("appraisal_types.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), nullable=False)  # e.g., "1st", "2nd", "3rd", "4th"
    start_month_offset = Column(Integer, nullable=False)  # Month offset from start of year
    end_month_offset = Column(Integer, nullable=False)  # Month offset from start of year
    
    # Relationships
    appraisal_type = relationship("AppraisalType", back_populates="ranges")
    appraisals = relationship("Appraisal", back_populates="appraisal_range")
