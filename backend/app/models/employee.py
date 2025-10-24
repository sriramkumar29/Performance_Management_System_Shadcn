from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.constants import EMPLOYEES_EMP_ID, ON_DELETE_SET_NULL


class Employee(Base):
    """Employee model."""

    __tablename__ = "employees"

    emp_id = Column(Integer, primary_key=True, index=True)
    emp_name = Column(String, nullable=False)
    emp_email = Column(String, unique=True, nullable=False, index=True)
    emp_department = Column(String, nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False, index=True)
    emp_reporting_manager_id = Column(Integer, ForeignKey(EMPLOYEES_EMP_ID, ondelete=ON_DELETE_SET_NULL), nullable=True)
    emp_status = Column(Boolean, default=True)
    emp_password = Column(String, nullable=False)  # Store hashed password

    # Relationships
    role = relationship("Role", backref="employees")
    reporting_manager = relationship("Employee", remote_side=[emp_id], backref="subordinates")
    # Note: Appraisal relationships defined with string references to avoid circular imports
    appraisals_as_appraisee = relationship("Appraisal", foreign_keys="[Appraisal.appraisee_id]", back_populates="appraisee")
    appraisals_as_appraiser = relationship("Appraisal", foreign_keys="[Appraisal.appraiser_id]", back_populates="appraiser")
    appraisals_as_reviewer = relationship("Appraisal", foreign_keys="[Appraisal.reviewer_id]", back_populates="reviewer")
