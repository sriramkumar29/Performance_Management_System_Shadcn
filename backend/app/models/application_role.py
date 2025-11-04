"""
Application role model for job positions/functions.
Used for goal template organization instead of system roles.
"""

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class ApplicationRole(Base):
    """
    Application role (job position) model.

    Examples: Software Developer, Lead Developer, QA Engineer,
              Support Engineer, DevOps Engineer, UI/UX Designer, etc.

    This is separate from system roles (Employee, Lead, Manager) which
    are used for access control and hierarchy.
    """

    __tablename__ = "application_roles"

    app_role_id = Column(Integer, primary_key=True, index=True)
    app_role_name = Column(String(100), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    employees = relationship("Employee", back_populates="application_role")
    template_headers = relationship("GoalTemplateHeader", back_populates="application_role", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ApplicationRole(id={self.app_role_id}, name='{self.app_role_name}')>"
