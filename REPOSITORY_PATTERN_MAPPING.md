# Repository Pattern Mapping for Services

## Overview

This document outlines the mapping of database operations from the AppraisalService to the AppraisalRepository, following the Repository pattern for better separation of concerns.

## Methods Mapped to Repository

### 1. Employee Validation

**Before:**

```python
async def _validate_employees(self, db, appraisal_data):
    result = await db.execute(select(Employee).where(Employee.emp_id == emp_id))
    employee = result.scalars().first()
```

**After:**

```python
async def _validate_employees(self, db, appraisal_data):
    employee = await self.repository.get_employee_by_id(db, emp_id)
```

**Repository Method Added:**

```python
async def get_employee_by_id(self, db: AsyncSession, emp_id: int) -> Optional[Employee]
```

### 2. Appraisal Type and Range Validation

**Before:**

```python
result = await db.execute(select(AppraisalType).where(AppraisalType.id == appraisal_data.appraisal_type_id))
appraisal_type = result.scalars().first()
```

**After:**

```python
appraisal_type = await self.repository.get_appraisal_type_by_id(db, appraisal_data.appraisal_type_id)
```

**Repository Methods Added:**

```python
async def get_appraisal_type_by_id(self, db: AsyncSession, type_id: int) -> Optional[AppraisalType]
async def get_appraisal_range_by_id(self, db: AsyncSession, range_id: int) -> Optional[AppraisalRange]
```

### 3. Goal Validation

**Before:**

```python
for goal_id in goal_ids:
    result = await db.execute(select(Goal).where(Goal.goal_id == goal_id))
    goal = result.scalars().first()
```

**After:**

```python
goals = await self.repository.get_goals_by_ids(db, goal_ids)
```

**Repository Methods Added:**

```python
async def get_goal_by_id(self, db: AsyncSession, goal_id: int) -> Optional[Goal]
async def get_goals_by_ids(self, db: AsyncSession, goal_ids: List[int]) -> List[Goal]
```

### 4. Goal Addition to Appraisal

**Before:**

```python
existing = await db.execute(select(AppraisalGoal).where(...))
if not existing.scalars().first():
    appraisal_goal = AppraisalGoal(...)
    db.add(appraisal_goal)
```

**After:**

```python
await self.repository.add_goal_to_appraisal(db, appraisal.appraisal_id, goal_id)
```

**Repository Method:** Already existed and was reused.

### 5. Submission Requirements Validation

**Before:**

```python
total_res = await db.execute(select(func.coalesce(func.sum(Goal.goal_weightage), 0))...)
total_weightage = total_res.scalar() or 0
```

**After:**

```python
total_weightage, goal_count = await self.repository.get_weightage_and_count(db, appraisal_id)
```

**Repository Method:** Already existed and was reused.

### 6. Status Updates

**Before:**

```python
db_appraisal.status = new_status
await db.commit()
```

**After:**

```python
await self.repository.update_appraisal_status(db, db_appraisal, new_status)
```

**Repository Method Added:**

```python
async def update_appraisal_status(self, db: AsyncSession, appraisal: Appraisal, new_status: AppraisalStatus) -> None
```

### 7. Self Assessment Updates

**Before:**

```python
appraisal_goal.self_comment = goal_data["self_comment"]
appraisal_goal.self_rating = rating
```

**After:**

```python
await self.repository.update_appraisal_goal_self_assessment(db, appraisal_goal, self_comment, self_rating)
```

**Repository Method Added:**

```python
async def update_appraisal_goal_self_assessment(self, db: AsyncSession, appraisal_goal: AppraisalGoal, self_comment: Optional[str] = None, self_rating: Optional[int] = None) -> None
```

### 8. Appraiser Evaluation Updates

**Before:**

```python
appraisal_goal.appraiser_comment = goal_data["appraiser_comment"]
appraisal_goal.appraiser_rating = rating
db_appraisal.appraiser_overall_comments = appraiser_overall_comments
```

**After:**

```python
await self.repository.update_appraisal_goal_appraiser_evaluation(db, appraisal_goal, appraiser_comment, appraiser_rating)
await self.repository.update_overall_appraiser_evaluation(db, db_appraisal, appraiser_overall_comments, appraiser_overall_rating)
```

**Repository Methods Added:**

```python
async def update_appraisal_goal_appraiser_evaluation(self, db: AsyncSession, appraisal_goal: AppraisalGoal, appraiser_comment: Optional[str] = None, appraiser_rating: Optional[int] = None) -> None
async def update_overall_appraiser_evaluation(self, db: AsyncSession, appraisal: Appraisal, overall_comments: Optional[str] = None, overall_rating: Optional[int] = None) -> None
```

### 9. Reviewer Evaluation Updates

**Before:**

```python
db_appraisal.reviewer_overall_comments = reviewer_overall_comments
db_appraisal.reviewer_overall_rating = reviewer_overall_rating
```

**After:**

```python
await self.repository.update_overall_reviewer_evaluation(db, db_appraisal, reviewer_overall_comments, reviewer_overall_rating)
```

**Repository Method Added:**

```python
async def update_overall_reviewer_evaluation(self, db: AsyncSession, appraisal: Appraisal, overall_comments: Optional[str] = None, overall_rating: Optional[int] = None) -> None
```

### 10. Complex Queries with Relationships

**Before:**

```python
query = (select(Appraisal).where(Appraisal.appraisal_id == appraisal_id).options(...))
result = await db.execute(query)
```

**After:**

```python
appraisal = await self.repository.get_with_goals_and_relationships(db, appraisal_id)
```

**Repository Method Added:**

```python
async def get_with_goals_and_relationships(self, db: AsyncSession, appraisal_id: int) -> Optional[Appraisal]
```

### 11. Finding Appraisal Goals

**Before:**

```python
appraisal_goal = next((ag for ag in db_appraisal.appraisal_goals if ag.goal_id == goal_id), None)
```

**After:**

```python
appraisal_goal = await self.repository.find_appraisal_goal(db, db_appraisal.appraisal_id, goal_id)
```

**Repository Method Added:**

```python
async def find_appraisal_goal(self, db: AsyncSession, appraisal_id: int, goal_id: int) -> Optional[AppraisalGoal]
```

### 12. Filtered Queries

**Before:**

```python
query = select(Appraisal).options(...)
if filters:
    query = query.where(and_(*filters))
result = await db.execute(query)
```

**After:**

```python
return await self.repository.get_with_filters(db, skip=skip, limit=limit, filters=filters)
```

**Repository Method:** Already existed and was reused.

## Benefits Achieved

1. **Separation of Concerns**: Database logic is now isolated in the repository layer
2. **Testability**: Service methods can be unit tested by mocking the repository
3. **Reusability**: Repository methods can be reused across different services
4. **Maintainability**: Changes to database queries only need to be made in one place
5. **Consistency**: All database operations follow the same pattern
6. **Single Responsibility**: Service focuses on business logic, repository handles data access

## Import Cleanup

Removed unnecessary imports from the service:

- `select`, `selectinload`, `and_` from SQLAlchemy (moved to repository)
- Direct model imports for `Employee`, `AppraisalGoal`, `AppraisalType`, `AppraisalRange`

---

## Employee Service Repository Mapping

### Overview

This section outlines the mapping of database operations from the EmployeeService to the EmployeeRepository, following the Repository pattern for better separation of concerns.

### Methods Mapped to Repository

#### 1. Employee Retrieval with Relationships

**Before:**

```python
async def get_by_id_or_404(self, db, entity_id, *, load_relationships=None):
    employee = await self.repository.get_by_id(db, entity_id)
    # No support for loading relationships
```

**After:**

```python
async def get_by_id_or_404(self, db, entity_id, *, load_relationships=None):
    if load_relationships:
        employee = await self.repository.get_by_id_with_relationships(db, entity_id, load_relationships)
    else:
        employee = await self.repository.get_by_id(db, entity_id)
```

**Repository Method Added:**

```python
async def get_by_id_with_relationships(db: AsyncSession, emp_id: int, load_relationships: Optional[List[str]] = None) -> Optional[Employee]
```

#### 2. Email Uniqueness Validation

**Before:**

```python
async def _validate_email_unique(self, db, email, exclude_id=None):
    query = select(Employee).where(Employee.emp_email == email)
    if exclude_id:
        query = query.where(Employee.emp_id != exclude_id)
    result = await db.execute(query)
    existing_employee = result.scalars().first()
```

**After:**

```python
async def _validate_email_unique(self, db, email, exclude_id=None):
    email_exists = await self.repository.check_email_exists(db, email, exclude_id)
```

**Repository Method Added:**

```python
async def check_email_exists(db: AsyncSession, email: str, exclude_id: Optional[int] = None) -> bool
```

#### 3. Manager Validation

**Before:**

```python
async def _validate_reporting_manager(self, db, manager_id):
    manager = await self.get_by_id(db, manager_id)
    if not manager:
        raise EntityNotFoundError("Reporting manager", manager_id)
    if not manager.emp_status:
        raise ValidationError("Reporting manager must be an active employee")
```

**After:**

```python
async def _validate_reporting_manager(self, db, manager_id):
    manager = await self.repository.validate_manager_exists(db, manager_id)
    if not manager:
        raise EntityNotFoundError("Reporting manager", manager_id)
```

**Repository Method Added:**

```python
async def validate_manager_exists(db: AsyncSession, manager_id: int) -> Optional[Employee]
```

#### 4. Employee Creation

**Before:**

```python
async def create_employee(self, db, *, employee_data):
    # ... validation logic ...
    db_employee = Employee(**obj_data)
    db.add(db_employee)
    await db.flush()
    await db.refresh(db_employee)
    return db_employee
```

**After:**

```python
async def create_employee(self, db, *, employee_data):
    # ... validation logic ...
    db_employee = Employee(**obj_data)
    return await self.repository.create(db, db_employee)
```

**Repository Method:** Already existed and was reused.

#### 5. Active Employees Retrieval

**Before:**

```python
async def get_managers(self, db, *, skip=0, limit=100):
    filters = [Employee.emp_status == True]
    return await self.repository.get_multi(
        db=db, skip=skip, limit=limit,
        filters=filters, order_by=Employee.emp_name
    )
```

**After:**

```python
async def get_managers(self, db, *, skip=0, limit=100):
    return await self.repository.get_active_employees(
        db=db, skip=skip, limit=limit
    )
```

**Repository Method Added:**

```python
async def get_active_employees(db: AsyncSession, *, skip: int = 0, limit: int = 100) -> List[Employee]
```

### Employee Service Benefits Achieved

1. **Cleaner Service Layer**: Removed direct SQLAlchemy operations from service methods
2. **Better Validation Logic**: Repository methods handle validation at data layer
3. **Improved Relationship Loading**: Dedicated method for loading relationships
4. **Enhanced Testability**: Repository methods can be easily mocked
5. **Code Reusability**: Repository methods can be shared across services
6. **Consistent Pattern**: All database operations follow the same repository pattern

### Import Cleanup for Employee Service

Removed unnecessary imports from the service:

- `select`, `selectinload` from SQLAlchemy (moved to repository)
- `and_` from SQLAlchemy (no longer needed in service)

---

## Next Steps

1. Consider adding transaction management to repository methods if needed
2. Add logging to repository methods for better debugging
3. Create repository interfaces for better testability
4. Consider adding caching layer in repository if performance becomes an issue
5. Apply similar repository pattern to other services (Goal, Category, etc.)
6. Add comprehensive unit tests for repository methods
