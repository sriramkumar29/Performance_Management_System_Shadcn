from fastapi import Depends, HTTPException, status, Security
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt import InvalidTokenError
from app.core.config import settings
from app.models.employee import Employee
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/employees/login")

async def get_current_user(token: str = Security(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception
    result = await db.execute(select(Employee).where(Employee.emp_email == email))
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    return user
