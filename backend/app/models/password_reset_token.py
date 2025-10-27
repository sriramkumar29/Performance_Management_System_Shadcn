from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from datetime import datetime
from app.db.database import Base


class PasswordResetToken(Base):
    """Model to track one-time password reset tokens (jti) for users.

    This allows marking tokens as used so they cannot be reused.
    """

    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    emp_id = Column(Integer, ForeignKey("employees.emp_id", ondelete="CASCADE"), nullable=False, index=True)
    jti = Column(String, unique=True, nullable=False, index=True)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
