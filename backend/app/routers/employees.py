from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.db.database import get_db
from app.models.employee import Employee
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    EmployeeWithSubordinates
)
from app.routers.auth import get_current_user
from passlib.context import CryptContext
from fastapi import Request
from pydantic import BaseModel
from app.core.config import settings
import jwt
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Employee).where(Employee.emp_email == data.email))
    employee = result.scalars().first()
    if not employee or not pwd_context.verify(data.password, employee.emp_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Create access token
    access_payload = {
        "sub": employee.emp_email,
        "emp_id": employee.emp_id,
        "type": "access",
        "exp": datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    }
    access_token = jwt.encode(access_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    # Create refresh token
    refresh_payload = {
        "sub": employee.emp_email,
        "emp_id": employee.emp_id,
        "type": "refresh",
        "exp": datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    }
    refresh_token = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Refresh access token using refresh token."""
    try:
        # Decode refresh token
        payload = jwt.decode(data.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = payload.get("sub")
        emp_id = payload.get("emp_id")
        token_type = payload.get("type")
        
        if not email or not emp_id or token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        
        # Verify employee still exists
        result = await db.execute(select(Employee).where(Employee.emp_email == email))
        employee = result.scalars().first()
        if not employee:
            raise HTTPException(status_code=401, detail="Employee not found")
        
        # Create new access token
        access_payload = {
            "sub": employee.emp_email,
            "emp_id": employee.emp_id,
            "type": "access",
            "exp": datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        }
        new_access_token = jwt.encode(access_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        
        # Create new refresh token
        refresh_payload = {
            "sub": employee.emp_email,
            "emp_id": employee.emp_id,
            "type": "refresh",
            "exp": datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        }
        new_refresh_token = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        
        return TokenResponse(access_token=new_access_token, refresh_token=new_refresh_token)
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    employee: EmployeeCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new employee."""
    try:
        print(f"Received employee data: {employee.model_dump()}")
        
        # Start a transaction
        async with db.begin():
            # Check if email already exists
            result = await db.execute(select(Employee).where(Employee.emp_email == employee.emp_email))
            existing_employee = result.scalars().first()
            
            if existing_employee:
                print(f"Email {employee.emp_email} already exists")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            
            # Handle reporting manager (convert 0 to None)
            emp_data = employee.model_dump()
            if emp_data.get('emp_reporting_manager_id') == 0:
                emp_data['emp_reporting_manager_id'] = None
                print("Converted reporting_manager_id 0 to None")
            
            # Check if reporting manager exists if provided
            if emp_data.get('emp_reporting_manager_id'):
                manager_id = emp_data['emp_reporting_manager_id']
                print(f"Checking reporting manager with ID: {manager_id}")
                result = await db.execute(select(Employee).where(Employee.emp_id == manager_id))
                manager = result.scalars().first()
                
                if not manager:
                    print(f"Reporting manager with ID {manager_id} not found")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Reporting manager with ID {manager_id} not found"
                    )
            
            # Hash the password before storing
            plain_password = emp_data.pop("password")
            hashed_password = pwd_context.hash(plain_password)
            emp_data["emp_password"] = hashed_password

            # Create new employee
            print(f"Creating employee with data: {emp_data}")
            db_employee = Employee(**emp_data)
            db.add(db_employee)
            await db.flush()  # Flush to get the employee ID
            
            # Commit the transaction
            await db.commit()
            
            # Refresh to get all fields including defaults
            await db.refresh(db_employee)
            
            print(f"Successfully created employee with ID: {db_employee.emp_id}")
            return db_employee
            
    except HTTPException as he:
        # Re-raise HTTP exceptions
        print(f"HTTP Exception: {str(he)}")
        raise
    except Exception as e:
        # Log the full error for debugging
        print(f"Unexpected error creating employee: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        
        # Rollback in case of error
        if db.in_transaction():
            await db.rollback()
        
        error_detail = str(e)
        if "duplicate key value" in error_detail and "email" in error_detail:
            error_detail = "Email already exists"
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating employee: {error_detail}"
        )


@router.get("/", response_model=List[EmployeeResponse])
async def read_employees(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get all employees."""
    
    result = await db.execute(select(Employee).offset(skip).limit(limit))
    employees = result.scalars().all()
    
    return employees


@router.get("/by-email", response_model=EmployeeResponse)
async def read_employee_by_email(
    email: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get an employee by email."""
    result = await db.execute(select(Employee).where(Employee.emp_email == email))
    employee = result.scalars().first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    return employee


@router.get("/managers", response_model=List[EmployeeResponse])
async def read_managers(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get all managers (employees with roles level >= 5)."""
    
    result = await db.execute(
        select(Employee)
        .where(Employee.emp_roles_level >= 5)
        .offset(skip)
        .limit(limit)
    )
    managers = result.scalars().all()
    
    return managers


@router.get("/{emp_id}", response_model=EmployeeResponse)
async def read_employee(
    emp_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get an employee by ID."""
    
    result = await db.execute(select(Employee).where(Employee.emp_id == emp_id))
    employee = result.scalars().first()
    
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    return employee


@router.get("/{emp_id}/subordinates", response_model=EmployeeWithSubordinates)
async def read_employee_with_subordinates(
    emp_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get an employee with their subordinates."""
    
    result = await db.execute(select(Employee).where(Employee.emp_id == emp_id))
    employee = result.scalars().first()
    
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    return employee


@router.put("/{emp_id}", response_model=EmployeeResponse)
async def update_employee(
    emp_id: int,
    employee: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Update an employee."""
    
    result = await db.execute(select(Employee).where(Employee.emp_id == emp_id))
    db_employee = result.scalars().first()
    
    if not db_employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Check if email already exists if updating email
    if employee.emp_email and employee.emp_email != db_employee.emp_email:
        result = await db.execute(select(Employee).where(Employee.emp_email == employee.emp_email))
        existing_employee = result.scalars().first()
        
        if existing_employee:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Check if reporting manager exists if provided
    if employee.emp_reporting_manager_id:
        result = await db.execute(select(Employee).where(Employee.emp_id == employee.emp_reporting_manager_id))
        manager = result.scalars().first()
        
        if not manager:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reporting manager not found"
            )
        
        # Prevent circular reporting relationship
        if employee.emp_reporting_manager_id == emp_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee cannot report to themselves"
            )
    
    # Update employee
    update_data = employee.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_employee, key, value)
    
    await db.commit()
    await db.refresh(db_employee)
    
    return db_employee


@router.delete("/{emp_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(
    emp_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Delete an employee."""
    
    result = await db.execute(select(Employee).where(Employee.emp_id == emp_id))
    db_employee = result.scalars().first()
    
    if not db_employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    await db.delete(db_employee)
    await db.commit()
    
    return None
