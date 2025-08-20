from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.db.database import engine, Base
from app.routers import employees, appraisals, goals, appraisal_types, appraisal_goals

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Clean up resources on shutdown
    await engine.dispose()

app = FastAPI(
    title="Performance Appraisal Management System",
    description="API for managing employee performance appraisals",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(employees.router, prefix="/api/employees", tags=["Employees"])
app.include_router(appraisals.router, prefix="/api/appraisals", tags=["Appraisals"])
app.include_router(appraisal_goals.router, prefix="/api/appraisals", tags=["Appraisal Goals"])
app.include_router(goals.router, prefix="/api/goals", tags=["Goals"])
app.include_router(appraisal_types.router, prefix="/api/appraisal-types", tags=["Appraisal Types"])

@app.get("/")
async def root():
    return {"message": "Welcome to Performance Appraisal Management System API"}
