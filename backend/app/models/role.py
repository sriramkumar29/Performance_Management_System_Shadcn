from sqlalchemy import Column, Integer, String
from app.db.database import Base


class Role(Base):
    """Role model for defining employee roles and hierarchy."""

    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String(50), unique=True, nullable=False, index=True)

    def __repr__(self):
        return f"<Role(id={self.id}, role_name='{self.role_name}')>"
