from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.database import Base


class Role(Base):
    """Role model for defining employee roles and hierarchy."""

    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String(50), unique=True, nullable=False, index=True)

    # Relationships
    template_headers = relationship("GoalTemplateHeader", back_populates="role", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Role(id={self.id}, role_name='{self.role_name}')>"
