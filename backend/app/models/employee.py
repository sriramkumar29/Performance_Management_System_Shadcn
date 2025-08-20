from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base


class Employee(Base):
    """Employee model."""
    
    __tablename__ = "employees"
    
    emp_id = Column(Integer, primary_key=True, index=True)
    emp_name = Column(String, nullable=False)
    emp_email = Column(String, unique=True, nullable=False, index=True)
    emp_department = Column(String, nullable=False)
    emp_roles = Column(String, nullable=False)  # e.g., Intern, Fresher, Developer, Team Lead, Manager, VP, CEO
    emp_roles_level = Column(Integer, nullable=False)  # e.g., 1..7
    emp_reporting_manager_id = Column(Integer, ForeignKey("employees.emp_id", ondelete="SET NULL"), nullable=True)
    emp_status = Column(Boolean, default=True)
    emp_password = Column(String, nullable=False)  # Store hashed password
    
    # Relationships
    reporting_manager = relationship("Employee", remote_side=[emp_id], backref="subordinates")
    appraisals_as_appraisee = relationship("Appraisal", foreign_keys="Appraisal.appraisee_id", back_populates="appraisee")
    appraisals_as_appraiser = relationship("Appraisal", foreign_keys="Appraisal.appraiser_id", back_populates="appraiser")
    appraisals_as_reviewer = relationship("Appraisal", foreign_keys="Appraisal.reviewer_id", back_populates="reviewer")
