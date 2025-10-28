# Goal Template Refactoring Plan

## Executive Summary

This document outlines the plan to refactor the goal template system to support **role-based goal template headers**. Currently, goal templates are global and not associated with specific roles. The refactoring will introduce a `goal_template_header` table that groups templates by role, with each header having its own title and description.

### Key Change: Header-Level Import

**Critical Design Decision**: The import functionality will work at the **header level**, not individual templates. When users import goal templates:

- ✅ Users select **complete goal template headers** (not individual templates)
- ✅ Each header represents a **cohesive set of related goals** (e.g., "Core Competencies", "Leadership Goals")
- ✅ Selecting a header imports **ALL templates within that header** as a complete set
- ✅ The import modal displays **comprehensive information** similar to the goal template management page:
  - Full header details (title, description, role, template count)
  - Complete template information (title, description, performance factors, importance, categories)
  - Collapsible/expandable view to see all included templates
- ✅ Weightage is adjusted at the **header level**, with proportional distribution to individual templates

**Example**:
- Header: "Software Engineer - Core Competencies" (Default total: 75%)
  - Template 1: Code Quality (25%)
  - Template 2: Technical Design (30%)
  - Template 3: Collaboration (20%)
- User selects this header and adjusts total to 60%
- All three templates are imported with proportionally adjusted weightages:
  - Code Quality: 20% (25/75 * 60)
  - Technical Design: 24% (30/75 * 60)
  - Collaboration: 16% (20/75 * 60)

---

## Current Architecture Analysis

### Backend Structure

#### Current Database Schema
- **`goals_template` table**: Contains individual goal templates with fields:
  - `temp_id` (PK)
  - `temp_title`
  - `temp_description`
  - `temp_performance_factor`
  - `temp_importance`
  - `temp_weightage`

- **`goal_template_categories` table**: Many-to-many relationship between templates and categories

- **`categories` table**: Stores category information

- **`roles` table**: Contains role definitions with:
  - `id` (PK)
  - `role_name`

#### Current Workflow
1. Goal templates are created globally without role association
2. Templates can be imported into appraisals via `ImportFromTemplateModal.tsx`
3. Templates are managed through `CreateTemplateModal.tsx` and `EditTemplateModal.tsx`
4. No role-based filtering or grouping exists

### Frontend Structure

#### Current Components
1. **`ImportFromTemplateModal.tsx`**:
   - Lists all templates for import (no role filtering)
   - **Recent Updates**: Now supports batch import via `onGoalsAdded` callback
   - Creates pseudo `AppraisalGoal` objects with `goal_template_id` tracking
   - Handles multi-category support with `category_ids` and `categories` arrays

2. **`CreateTemplateModal.tsx`**: Creates new templates (no role association)

3. **`EditTemplateModal.tsx`**: Edits existing templates (no role association)

4. **`CreateAppraisalButton.tsx`**: Has "Manage Templates" button that navigates to `/goal-templates`

5. **`CreateAppraisal.tsx`**:
   - **Recent Updates**: Now has separate handlers for single (`onGoalAdded`) and batch (`onGoalsAdded`) goal imports
   - Implements goal change tracking with `goalChanges` state containing `added`, `removed`, and `updated` arrays
   - Syncs goal changes to backend via `syncGoalChanges` helper
   - Supports editing draft appraisals with proper goal deduplication

6. **`goalHelpers.ts`** (New helper file):
   - `handleAddGoal`: Normalizes goal shape to support both single and multi-category formats
   - `addGoalsBatch`: Batch-add helper with deduplication by `goal_template_id` or `goal_id`
   - `handleEditGoal`, `handleDeleteGoal`: Goal CRUD helpers
   - `calculateTotalWeightage`, `validateGoals`: Validation utilities
   - `computeGoalChanges`: Computes diff between current and original goals

---

## Proposed Architecture

### New Database Schema

#### 1. Create `goal_template_header` Table

```sql
CREATE TABLE goal_template_header (
    header_id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_role_title UNIQUE (role_id, title)
);

-- Index for faster role-based lookups
CREATE INDEX idx_goal_template_header_role_id ON goal_template_header(role_id);
```

#### 2. Modify `goals_template` Table

Add `header_id` foreign key to link templates to headers:

```sql
ALTER TABLE goals_template
ADD COLUMN header_id INTEGER REFERENCES goal_template_header(header_id) ON DELETE CASCADE;

-- Index for faster header-based lookups
CREATE INDEX idx_goals_template_header_id ON goals_template(header_id);
```

#### 3. Migration Strategy

**Migration file**: `backend/alembic/versions/XXXX_add_goal_template_header.py`

```python
"""Add goal_template_header table and link to goals_template

Revision ID: XXXX
Revises: previous_revision
Create Date: 2025-XX-XX

"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    # Create goal_template_header table
    op.create_table(
        'goal_template_header',
        sa.Column('header_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('header_id'),
        sa.UniqueConstraint('role_id', 'title', name='uq_role_title')
    )
    op.create_index('idx_goal_template_header_role_id', 'goal_template_header', ['role_id'])

    # Add header_id to goals_template (nullable for migration)
    op.add_column('goals_template', sa.Column('header_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_goals_template_header_id',
        'goals_template',
        'goal_template_header',
        ['header_id'],
        ['header_id'],
        ondelete='CASCADE'
    )
    op.create_index('idx_goals_template_header_id', 'goals_template', ['header_id'])

def downgrade():
    op.drop_index('idx_goals_template_header_id', table_name='goals_template')
    op.drop_constraint('fk_goals_template_header_id', 'goals_template', type_='foreignkey')
    op.drop_column('goals_template', 'header_id')
    op.drop_index('idx_goal_template_header_role_id', table_name='goal_template_header')
    op.drop_table('goal_template_header')
```

---

## Backend Implementation Plan

### Phase 1: Models & Schemas

#### 1.1 Create New Model (`backend/app/models/goal.py`)

```python
class GoalTemplateHeader(Base):
    """Goal template header model - groups templates by role."""

    __tablename__ = "goal_template_header"

    header_id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    role = relationship("Role", back_populates="template_headers")
    goal_templates = relationship("GoalTemplate", back_populates="header", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint('role_id', 'title', name='uq_role_title'),
    )
```

#### 1.2 Update GoalTemplate Model

```python
class GoalTemplate(Base):
    """Goal template model."""

    __tablename__ = "goals_template"

    temp_id = Column(Integer, primary_key=True, index=True)
    header_id = Column(Integer, ForeignKey("goal_template_header.header_id", ondelete="CASCADE"), nullable=True)
    temp_title = Column(String, nullable=False)
    temp_description = Column(String, nullable=False)
    temp_performance_factor = Column(String, nullable=False)
    temp_importance = Column(String, nullable=False)
    temp_weightage = Column(Integer, nullable=False)

    # Relationships
    header = relationship("GoalTemplateHeader", back_populates="goal_templates")
    categories = relationship("Category", secondary=goal_template_categories, back_populates="goal_templates")
    goals = relationship("Goal", back_populates="template")
```

#### 1.3 Update Role Model

```python
class Role(Base):
    """Role model for defining employee roles and hierarchy."""

    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String(50), unique=True, nullable=False, index=True)

    # Relationships
    template_headers = relationship("GoalTemplateHeader", back_populates="role", cascade="all, delete-orphan")
```

#### 1.4 Create Schemas (`backend/app/schemas/goal.py`)

```python
# Header Schemas
class GoalTemplateHeaderBase(BaseModel):
    """Base schema for GoalTemplateHeader."""
    role_id: int
    title: str
    description: Optional[str] = None

class GoalTemplateHeaderCreate(GoalTemplateHeaderBase):
    """Schema for creating a GoalTemplateHeader."""
    pass

class GoalTemplateHeaderUpdate(BaseModel):
    """Schema for updating a GoalTemplateHeader."""
    title: Optional[str] = None
    description: Optional[str] = None

class GoalTemplateHeaderResponse(GoalTemplateHeaderBase):
    """Schema for GoalTemplateHeader response."""
    header_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Updated Template Schemas
class GoalTemplateCreate(GoalTemplateBase):
    """Schema for creating a GoalTemplate."""
    header_id: Optional[int] = None  # Added
    categories: List[str] = []

class GoalTemplateResponse(GoalTemplateBase):
    """Schema for GoalTemplate response."""
    temp_id: int
    header_id: Optional[int] = None  # Added
    categories: List[CategoryResponse] = []

    class Config:
        from_attributes = True

# New combined response for role-based templates
class GoalTemplateHeaderWithTemplates(GoalTemplateHeaderResponse):
    """Schema for header with all its templates."""
    goal_templates: List[GoalTemplateResponse] = []
```

### Phase 2: Repositories

#### 2.1 Create `GoalTemplateHeaderRepository` (`backend/app/repositories/goal_template_header_repository.py`)

```python
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.goal import GoalTemplateHeader
from app.repositories.base_repository import BaseRepository
from app.exceptions.domain_exceptions import RepositoryException
from app.utils.logger import get_logger, log_execution_time

class GoalTemplateHeaderRepository(BaseRepository[GoalTemplateHeader]):
    """Repository for GoalTemplateHeader operations."""

    def __init__(self):
        super().__init__(GoalTemplateHeader)
        self.logger = get_logger(__name__)

    @property
    def entity_name(self) -> str:
        return "GoalTemplateHeader"

    @property
    def id_field(self) -> str:
        return "header_id"

    @log_execution_time()
    async def get_by_role_id(
        self,
        db: AsyncSession,
        role_id: int,
        load_templates: bool = False
    ) -> List[GoalTemplateHeader]:
        """Get all template headers for a specific role."""
        try:
            query = select(GoalTemplateHeader).where(GoalTemplateHeader.role_id == role_id)

            if load_templates:
                query = query.options(
                    selectinload(GoalTemplateHeader.goal_templates)
                    .selectinload(GoalTemplate.categories)
                )

            result = await db.execute(query)
            return result.scalars().all()
        except Exception as e:
            self.logger.error(f"Error getting headers by role_id {role_id}: {str(e)}")
            raise RepositoryException(f"Failed to get headers for role {role_id}")

    @log_execution_time()
    async def get_with_templates(
        self,
        db: AsyncSession,
        header_id: int
    ) -> Optional[GoalTemplateHeader]:
        """Get header with all its templates loaded."""
        try:
            query = (
                select(GoalTemplateHeader)
                .where(GoalTemplateHeader.header_id == header_id)
                .options(
                    selectinload(GoalTemplateHeader.goal_templates)
                    .selectinload(GoalTemplate.categories)
                )
            )
            result = await db.execute(query)
            return result.scalars().first()
        except Exception as e:
            self.logger.error(f"Error getting header {header_id} with templates: {str(e)}")
            raise RepositoryException(f"Failed to get header {header_id}")
```

#### 2.2 Update `GoalTemplateRepository`

Add methods to support header-based operations:

```python
@log_execution_time()
async def get_by_header_id(
    self,
    db: AsyncSession,
    header_id: int
) -> List[GoalTemplate]:
    """Get all templates for a specific header."""
    try:
        query = (
            select(GoalTemplate)
            .where(GoalTemplate.header_id == header_id)
            .options(selectinload(GoalTemplate.categories))
        )
        result = await db.execute(query)
        return result.scalars().all()
    except Exception as e:
        self.logger.error(f"Error getting templates by header_id {header_id}: {str(e)}")
        raise RepositoryException(f"Failed to get templates for header {header_id}")
```

### Phase 3: Services

#### 3.1 Create `GoalTemplateHeaderService` (`backend/app/services/goal_template_header_service.py`)

```python
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.goal import GoalTemplateHeader
from app.schemas.goal import (
    GoalTemplateHeaderCreate,
    GoalTemplateHeaderUpdate,
    GoalTemplateHeaderWithTemplates
)
from app.services.base_service import BaseService
from app.repositories.goal_template_header_repository import GoalTemplateHeaderRepository
from app.exceptions.domain_exceptions import (
    BusinessRuleViolationError,
    EntityNotFoundError as DomainEntityNotFoundError
)
from app.utils.logger import get_logger, log_execution_time

class GoalTemplateHeaderService(BaseService):
    """Service for goal template header operations."""

    def __init__(self):
        super().__init__(GoalTemplateHeader)
        self.repository = GoalTemplateHeaderRepository()
        self.logger = get_logger(__name__)

    @property
    def entity_name(self) -> str:
        return "GoalTemplateHeader"

    @property
    def id_field(self) -> str:
        return "header_id"

    @log_execution_time()
    async def get_by_role_id(
        self,
        db: AsyncSession,
        role_id: int,
        include_templates: bool = False
    ) -> List[GoalTemplateHeader]:
        """Get all template headers for a role."""
        return await self.repository.get_by_role_id(db, role_id, include_templates)

    @log_execution_time()
    async def get_header_with_templates(
        self,
        db: AsyncSession,
        header_id: int
    ) -> GoalTemplateHeader:
        """Get header with all templates."""
        header = await self.repository.get_with_templates(db, header_id)
        if not header:
            raise DomainEntityNotFoundError(f"Header {header_id} not found")
        return header

    @log_execution_time()
    async def create_header_with_templates(
        self,
        db: AsyncSession,
        header_data: GoalTemplateHeaderCreate,
        template_ids: Optional[List[int]] = None
    ) -> GoalTemplateHeader:
        """Create a new header and optionally link existing templates."""
        # Validate role exists
        # Create header
        # Link templates if provided
        pass
```

#### 3.2 Update `GoalTemplateService`

Add methods to support header-based operations:

```python
@log_execution_time()
async def create_template_for_header(
    self,
    db: AsyncSession,
    header_id: int,
    template_data: GoalTemplateCreate
) -> GoalTemplate:
    """Create a template under a specific header."""
    # Validate header exists
    # Create template with header_id
    pass

@log_execution_time()
async def get_templates_by_role(
    self,
    db: AsyncSession,
    role_id: int
) -> List[GoalTemplate]:
    """Get all templates for a specific role (via headers)."""
    pass
```

### Phase 4: Routers

#### 4.1 Create `goal_template_headers.py` (`backend/app/routers/goal_template_headers.py`)

```python
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.db.database import get_db
from app.models.employee import Employee
from app.schemas.goal import (
    GoalTemplateHeaderCreate,
    GoalTemplateHeaderUpdate,
    GoalTemplateHeaderResponse,
    GoalTemplateHeaderWithTemplates
)
from app.routers.auth import get_current_active_user
from app.services.goal_template_header_service import GoalTemplateHeaderService

router = APIRouter(dependencies=[Depends(get_current_active_user)])

@router.post("/", response_model=GoalTemplateHeaderResponse, status_code=status.HTTP_201_CREATED)
async def create_header(
    header_data: GoalTemplateHeaderCreate,
    db: AsyncSession = Depends(get_db),
    service: GoalTemplateHeaderService = Depends(),
    current_user: Employee = Depends(get_current_active_user)
):
    """Create a new goal template header for a role."""
    pass

@router.get("/role/{role_id}", response_model=List[GoalTemplateHeaderWithTemplates])
async def get_headers_by_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    service: GoalTemplateHeaderService = Depends(),
    current_user: Employee = Depends(get_current_active_user)
):
    """Get all template headers for a specific role with their templates."""
    pass

@router.get("/{header_id}", response_model=GoalTemplateHeaderWithTemplates)
async def get_header(
    header_id: int,
    db: AsyncSession = Depends(get_db),
    service: GoalTemplateHeaderService = Depends(),
    current_user: Employee = Depends(get_current_active_user)
):
    """Get a specific header with all its templates."""
    pass

@router.put("/{header_id}", response_model=GoalTemplateHeaderResponse)
async def update_header(
    header_id: int,
    header_data: GoalTemplateHeaderUpdate,
    db: AsyncSession = Depends(get_db),
    service: GoalTemplateHeaderService = Depends(),
    current_user: Employee = Depends(get_current_active_user)
):
    """Update a goal template header."""
    pass

@router.delete("/{header_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_header(
    header_id: int,
    db: AsyncSession = Depends(get_db),
    service: GoalTemplateHeaderService = Depends(),
    current_user: Employee = Depends(get_current_active_user)
):
    """Delete a goal template header and all its templates."""
    pass
```

#### 4.2 Update `goals.py` Router

Add new endpoints for role-based template operations:

```python
@router.get("/templates/role/{role_id}", response_model=List[GoalTemplateResponse])
async def get_templates_by_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    template_service: GoalTemplateService = Depends(get_goal_template_service),
    current_user: Employee = Depends(get_current_active_user)
):
    """Get all goal templates for a specific role."""
    pass

@router.post("/templates/header/{header_id}", response_model=GoalTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template_for_header(
    header_id: int,
    template_data: GoalTemplateCreate,
    db: AsyncSession = Depends(get_db),
    template_service: GoalTemplateService = Depends(get_goal_template_service),
    current_user: Employee = Depends(get_current_active_user)
):
    """Create a new goal template under a specific header."""
    pass
```

#### 4.3 Register New Router in `main.py`

```python
from app.routers import goal_template_headers

app.include_router(
    goal_template_headers.router,
    prefix="/api/goal-template-headers",
    tags=["Goal Template Headers"]
)
```

---

## Frontend Implementation Plan

### Phase 1: New Pages & Routes

#### 1.1 Create Role-Based Template Management Page

**File**: `frontend/src/pages/GoalTemplatesByRole.tsx`

This page will:
- Display a list of roles
- Show template headers for each role
- Allow creating/editing/deleting headers
- Manage templates within each header

#### 1.2 Update Routing

**File**: `frontend/src/App.tsx` or routing configuration

```typescript
{
  path: "/goal-templates-by-role",
  element: <ProtectedRoute component={GoalTemplatesByRole} requiredRole="Manager" />
}
```

### Phase 2: New Components

#### 2.1 Create `RoleTemplateHeaderCard.tsx`

**File**: `frontend/src/components/templates/RoleTemplateHeaderCard.tsx`

```typescript
interface RoleTemplateHeaderCardProps {
  header: {
    header_id: number;
    role_id: number;
    title: string;
    description: string;
    goal_templates: GoalTemplate[];
  };
  onEdit: (headerId: number) => void;
  onDelete: (headerId: number) => void;
  onAddTemplate: (headerId: number) => void;
  onEditTemplate: (templateId: number) => void;
  onDeleteTemplate: (templateId: number) => void;
}

// Component renders:
// - Header title and description
// - List of templates under this header
// - Actions to manage header and templates
```

#### 2.2 Create `CreateHeaderModal.tsx`

**File**: `frontend/src/components/modals/CreateHeaderModal.tsx`

Form fields:
- Role selection (dropdown)
- Header title (text input)
- Header description (textarea)

#### 2.3 Create `EditHeaderModal.tsx`

**File**: `frontend/src/components/modals/EditHeaderModal.tsx`

Similar to create, but pre-filled with existing data.

#### 2.4 Update `CreateTemplateModal.tsx`

Add field:
- Header selection (dropdown filtered by role)

#### 2.5 Update `EditTemplateModal.tsx`

Add field:
- Header selection (dropdown filtered by role)

#### 2.6 Update `ImportFromTemplateModal.tsx`

**Current Implementation Notes**:
- Already supports batch import via `onGoalsAdded` prop (lines 22, 224-228)
- Creates pseudo goals with `goal_template_id` for tracking (line 200)
- Handles multi-category support properly (lines 214-218)
- Uses `closeAndReset()` to clear selection state
- **Current Display**: Shows individual templates in a flat list with basic info

**Required Improvements** (Header-Level Import with Complete Information):
1. **Add role filter dropdown** at the top
2. **Display headers as selectable cards** (not individual templates)
3. **Show complete header information**:
   - Header title and description (full text)
   - Role name/badge
   - Number of templates in the header
   - Total default weightage for entire header
4. **Display comprehensive template details** (within header card, collapsible):
   - All templates listed with full information
   - Template title and description (full, not truncated)
   - Performance factors (full text)
   - Importance level with visual indicators
   - Default weightage per template
   - All categories (with icons/badges)
5. **Header-Level Selection UI**:
   - Checkbox selects ENTIRE header (all its templates)
   - Individual templates NOT selectable
   - Adjustable total weightage for the header
   - Proportional distribution to individual templates
   - Visual preview of what will be imported
   - Running total of selected weightage
6. **Smart Weightage Adjustment**:
   - Allow adjusting header's total weightage
   - Automatically recalculate individual template weightages proportionally
   - Validate against remaining weightage
7. **Maintain existing batch import functionality**

```typescript
interface GoalTemplateHeader {
  header_id: number;
  role_id: number;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface GoalTemplate {
  temp_id: number;
  header_id: number;
  temp_title: string;
  temp_description: string;
  temp_performance_factor: string;
  temp_importance: string;
  temp_weightage: number;
  categories: Category[];
}

interface TemplateHeaderWithTemplates {
  header: GoalTemplateHeader;
  templates: GoalTemplate[];
  total_default_weightage: number; // Sum of all template weightages
}

interface HeaderSelection {
  header_id: number;
  checked: boolean;
  adjusted_total_weightage?: number; // User-adjusted total for this header
}

// Component state:
const [selectedHeaders, setSelectedHeaders] = useState<Record<number, HeaderSelection>>({});
const [headerGroups, setHeaderGroups] = useState<TemplateHeaderWithTemplates[]>([]);
const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
const [expandedHeaders, setExpandedHeaders] = useState<Set<number>>(new Set());

// Component structure:
// 1. Role filter dropdown (new)
// 2. Search/filter input (searches across header titles, descriptions, template content)
// 3. For each header in selected role:
//    - Checkbox to select ENTIRE header
//    - Header card with title, description, role, template count
//    - Total default weightage display
//    - Input to adjust total weightage (proportionally adjusts all templates)
//    - Collapsible section showing ALL templates with full details
//    - Each template shows: title, description, performance factors, importance, categories
// 4. Selection summary at bottom
// 5. Import button triggers batch import using onGoalsAdded (existing - line 225)

// Key functions:
const toggleHeaderSelection = (headerId: number, defaultWeightage: number) => {
  setSelectedHeaders(prev => ({
    ...prev,
    [headerId]: prev[headerId]?.checked
      ? { ...prev[headerId], checked: false }
      : { header_id: headerId, checked: true, adjusted_total_weightage: defaultWeightage }
  }));
};

const adjustHeaderWeightage = (headerId: number, newTotal: number) => {
  setSelectedHeaders(prev => ({
    ...prev,
    [headerId]: { ...prev[headerId], adjusted_total_weightage: newTotal }
  }));
};

const handleImportHeaders = () => {
  const selectedHeaderIds = Object.keys(selectedHeaders)
    .filter(id => selectedHeaders[Number(id)].checked)
    .map(Number);

  const allGoals: AppraisalGoal[] = [];

  selectedHeaderIds.forEach(headerId => {
    const headerGroup = headerGroups.find(h => h.header.header_id === headerId);
    if (!headerGroup) return;

    const adjustedTotal = selectedHeaders[headerId].adjusted_total_weightage
      || headerGroup.total_default_weightage;
    const ratio = adjustedTotal / headerGroup.total_default_weightage;

    // Create goals from all templates in this header
    headerGroup.templates.forEach(template => {
      const adjustedWeightage = Math.round(template.temp_weightage * ratio);
      const pseudoGoal = createPseudoGoalFromTemplate(template, adjustedWeightage);
      allGoals.push(pseudoGoal);
    });
  });

  // Batch import all goals at once
  onGoalsAdded(allGoals);
  toast.success(`Imported ${allGoals.length} goals from ${selectedHeaderIds.length} header(s)`);
  closeAndReset();
};
```

**API Changes Required**:
```typescript
// Update loadTemplates() to fetch by role
const loadTemplates = async (roleId?: number) => {
  try {
    const endpoint = roleId
      ? `/api/goals/templates/role/${roleId}`
      : '/api/goals/templates';
    const res = await apiFetch<GoalTemplateWithHeader[]>(endpoint);
    if (res.ok && res.data) setTemplates(res.data);
  } catch (e: unknown) {
    const errorMessage =
      e instanceof Error ? e.message : "Failed to load templates";
    console.error("Failed to load templates:", errorMessage);
  }
};

// Or fetch headers with templates
const loadHeadersWithTemplates = async (roleId: number) => {
  try {
    const res = await apiFetch<TemplatesByHeader[]>(
      `/api/goal-template-headers/role/${roleId}`
    );
    if (res.ok && res.data) {
      // Flatten for existing template selection logic
      const allTemplates = res.data.flatMap(h =>
        h.templates.map(t => ({ ...t, header: h.header }))
      );
      setTemplates(allTemplates);
      setHeaderGroups(res.data);
    }
  } catch (e: unknown) {
    console.error("Failed to load templates:", e);
  }
};
```

### Phase 3: API Integration

#### 3.1 Create New API Functions

**File**: `frontend/src/utils/api.ts` or separate service file

```typescript
// Header operations
export const createTemplateHeader = async (data: CreateHeaderData) => {
  return apiFetch('/api/goal-template-headers/', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const getHeadersByRole = async (roleId: number) => {
  return apiFetch(`/api/goal-template-headers/role/${roleId}`);
};

export const updateTemplateHeader = async (headerId: number, data: UpdateHeaderData) => {
  return apiFetch(`/api/goal-template-headers/${headerId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const deleteTemplateHeader = async (headerId: number) => {
  return apiFetch(`/api/goal-template-headers/${headerId}`, {
    method: 'DELETE'
  });
};

// Template operations with header context
export const createTemplateForHeader = async (headerId: number, data: CreateTemplateData) => {
  return apiFetch(`/api/goals/templates/header/${headerId}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const getTemplatesByRole = async (roleId: number) => {
  return apiFetch(`/api/goals/templates/role/${roleId}`);
};
```

### Phase 4: Navigation Updates

#### 4.1 Update `CreateAppraisalButton.tsx`

Change the "Manage Templates" button to navigate to the new page:

```typescript
<Button
  type="button"
  variant={BUTTON_STYLES.VIEW.variant}
  onClick={() => navigate("/goal-templates-by-role")}
  title="Manage goal templates by role"
  aria-label="Manage goal templates by role"
>
  <LayoutGrid className={ICON_SIZES.DEFAULT} />
  <span className="hidden sm:inline sm:ml-2">Manage Templates</span>
</Button>
```

---

## Migration & Data Handling

### Existing Data Migration

For existing goal templates without headers:

1. **Option A**: Create a default "Unassigned" header for each role
2. **Option B**: Require manual assignment during migration
3. **Option C**: Leave `header_id` as nullable and show unassigned templates separately

**Recommended**: Option A with a migration script:

```python
# Migration script: backend/scripts/migrate_existing_templates.py

async def migrate_existing_templates(db: AsyncSession):
    """Assign existing templates to default headers."""

    # Get all roles
    roles = await db.execute(select(Role))
    roles = roles.scalars().all()

    # Create "General" header for each role
    for role in roles:
        header = GoalTemplateHeader(
            role_id=role.id,
            title=f"{role.role_name} - General Templates",
            description="Default header for existing templates"
        )
        db.add(header)
        await db.flush()

        # Assign all orphaned templates to this header
        await db.execute(
            update(GoalTemplate)
            .where(GoalTemplate.header_id.is_(None))
            .values(header_id=header.header_id)
        )

    await db.commit()
```

---

## Testing Strategy

### Backend Tests

#### Unit Tests

1. **Model Tests** (`tests/unit/test_models.py`):
   - Test `GoalTemplateHeader` model relationships
   - Test cascade delete behavior
   - Test unique constraint on `(role_id, title)`

2. **Repository Tests** (`tests/unit/test_repositories.py`):
   - Test `get_by_role_id`
   - Test `get_with_templates`
   - Test create/update/delete operations

3. **Service Tests** (`tests/unit/test_services.py`):
   - Test business logic for header operations
   - Test validation rules

#### Integration Tests

1. **Router Tests** (`tests/integration/test_goal_template_headers.py`):
   - Test all CRUD endpoints
   - Test role-based filtering
   - Test authorization

### Frontend Tests

1. **Component Tests**:
   - Test `RoleTemplateHeaderCard` rendering
   - Test modal interactions
   - Test form validation

2. **Integration Tests**:
   - Test complete flow: create header → add templates → import to appraisal
   - Test role filtering in import modal

---

## Deployment Plan

### Phase 1: Database Changes (Week 1)

1. Create and test migration scripts locally
2. Backup production database
3. Run migration to create `goal_template_header` table
4. Run data migration script to assign existing templates

### Phase 2: Backend API (Week 2)

1. Deploy new models, repositories, services
2. Deploy new routers and endpoints
3. Update existing endpoints to support both old and new flows (backward compatibility)
4. Test all endpoints

### Phase 3: Frontend Updates (Week 3)

1. Deploy new pages and components
2. Update existing components (Import modal, Create/Edit modals)
3. Update navigation
4. Test end-to-end flows

### Phase 4: Cleanup & Documentation (Week 4)

1. Remove deprecated code paths
2. Update API documentation
3. Update user documentation
4. Monitor production for issues

---

## Backward Compatibility

During transition:

1. Keep `header_id` nullable in `goals_template`
2. API endpoints should support both headerless and header-based templates
3. Frontend should gracefully handle templates without headers
4. After successful migration, make `header_id` required in a follow-up release

---

## Security & Authorization

### Role-Based Access Control

1. **Managers and above**: Can create/edit/delete headers and templates for their role and below
2. **Employees**: Can view templates for their role (read-only)
3. **Admin**: Full access to all headers and templates

### Validation Rules

1. Users can only create headers for their own role or roles below them
2. Prevent duplicate header titles within the same role
3. Validate role_id exists before creating header
4. Prevent orphaned templates (cascade delete)

---

## UI/UX Considerations

### Goal Template Management Page

**Layout**:
```
+----------------------------------------------------------+
|  Goal Templates by Role                                   |
+----------------------------------------------------------+
|  [Role Filter: All Roles ▼]  [+ Create Header]           |
+----------------------------------------------------------+
|                                                           |
|  📋 Software Engineer - Core Competencies                |
|      Description: Core technical goals for engineers      |
|      [Edit] [Delete] [+ Add Template]                    |
|                                                           |
|      ├─ Template 1: Code Quality (25%)                   |
|      ├─ Template 2: Technical Design (30%)               |
|      └─ Template 3: Collaboration (20%)                  |
|                                                           |
|  📋 Software Engineer - Leadership                       |
|      Description: Leadership and mentoring goals          |
|      [Edit] [Delete] [+ Add Template]                    |
|                                                           |
|      ├─ Template 1: Mentoring (40%)                      |
|      └─ Template 2: Team Coordination (35%)              |
|                                                           |
+----------------------------------------------------------+
```

### Import Modal Updates (Import Complete Template Headers)

**Design Philosophy**: Import entire goal template sets (headers) as a complete unit, similar to how you would view them in the management page. Users select headers, not individual templates.

**Current State** (Individual Template Selection):
```
+----------------------------------------------------------+
| Import Goals from Templates                               |
+----------------------------------------------------------+
| [Search...]                        Remaining: 100%        |
+----------------------------------------------------------+
| ☐ Code Quality - 25%                                     |
| ☐ Technical Design - 30%                                 |
| ☐ Mentoring - 40%                                        |
+----------------------------------------------------------+
```

**New Enhanced Layout** (Header-Level Selection):
```
+──────────────────────────────────────────────────────────+
| Import Goal Template for Role                             |
+──────────────────────────────────────────────────────────+
| [Role: Software Engineer ▼]  [Search Headers/Templates...]|
| Remaining Weightage: 100%                                 |
+──────────────────────────────────────────────────────────+
|                                                           |
| ☐ 📋 Core Competencies                                   |
|   ┌──────────────────────────────────────────────────┐  |
|   │ Role: Software Engineer | 3 Templates             │  |
|   │ Total Default Weightage: 75%                       │  |
|   │                                                    │  |
|   │ 📝 Description:                                    │  |
|   │ Core technical goals for software engineers,      │  |
|   │ covering code quality, design, and collaboration. │  |
|   │                                                    │  |
|   │ ▼ Templates Included (Click to expand/collapse):  │  |
|   │                                                    │  |
|   │   🎯 Code Quality                          25%    │  |
|   │   Description: Write clean, maintainable code...  │  |
|   │   Performance Factors: Code review scores,        │  |
|   │   static analysis metrics, documentation...       │  |
|   │   🔴 High Priority | 📦 Technical, Quality       │  |
|   │                                                    │  |
|   │   🎯 Technical Design                      30%    │  |
|   │   Description: Design scalable systems...         │  |
|   │   Performance Factors: Design doc quality...      │  |
|   │   🟡 Medium Priority | 📦 Technical, Design      │  |
|   │                                                    │  |
|   │   🎯 Collaboration                         20%    │  |
|   │   Description: Work effectively with team...      │  |
|   │   Performance Factors: Peer feedback...           │  |
|   │   🟢 Low Priority | 📦 Teamwork                  │  |
|   │                                                    │  |
|   │ [Adjust Total Weightage: 75% ]                    │  |
|   │                                                    │  |
|   │ ℹ️ Note: All 3 templates will be imported as     │  |
|   │ a complete set. Individual weightages will be     │  |
|   │ proportionally adjusted if you change the total.  │  |
|   └──────────────────────────────────────────────────┘  |
|                                                           |
| ☐ 📋 Leadership & Mentoring                              |
|   ┌──────────────────────────────────────────────────┐  |
|   │ Role: Software Engineer | 2 Templates             │  |
|   │ Total Default Weightage: 65%                       │  |
|   │                                                    │  |
|   │ 📝 Description:                                    │  |
|   │ Leadership and mentoring goals for senior         │  |
|   │ engineers to develop team members.                │  |
|   │                                                    │  |
|   │ △ Templates Included (Collapsed - click to view)  │  |
|   │                                                    │  |
|   │ [Adjust Total Weightage: 65% ]                    │  |
|   └──────────────────────────────────────────────────┘  |
|                                                           |
| ☐ 📋 Project Management                                  |
|   ┌──────────────────────────────────────────────────┐  |
|   │ Role: Software Engineer | 2 Templates             │  |
|   │ Total Default Weightage: 40%                       │  |
|   │                                                    │  |
|   │ 📝 Description:                                    │  |
|   │ Project delivery and timeline management goals.   │  |
|   │                                                    │  |
|   │ △ Templates Included (Collapsed)                  │  |
|   └──────────────────────────────────────────────────┘  |
|                                                           |
+──────────────────────────────────────────────────────────+
| 📊 Selection Summary:                                    |
| • 1 header selected (Core Competencies)                  |
| • 3 goals will be imported                               |
| • Total weightage: 75% (25% remaining)                   |
|                                                           |
| ⚠️ Weightage Warning: Total exceeds 100%                |
| (shown only if total > remaining)                        |
+──────────────────────────────────────────────────────────+
| [Cancel]                     [Import Selected Header(s)] |
+──────────────────────────────────────────────────────────+
```

**Key Features**:

1. **Header-Level Selection**:
   - Checkbox selects ENTIRE header (all templates)
   - Cannot select individual templates
   - One header = one complete goal template set

2. **Comprehensive Header Display**:
   - Role badge and template count
   - Total default weightage for the header
   - Full description of the template set
   - Collapsible list of ALL included templates

3. **Complete Template Information** (Within Header):
   - Full title and description
   - Complete performance factors
   - Priority level with visual indicators
   - All categories
   - Individual default weightages

4. **Smart Weightage Management**:
   - Adjust total weightage at header level
   - Individual template weightages are proportionally adjusted
   - Example: If header default is 75% but you set it to 60%:
     - Template 1: 25% → 20% (25/75 * 60)
     - Template 2: 30% → 24% (30/75 * 60)
     - Template 3: 20% → 16% (20/75 * 60)

5. **Selection Experience**:
   - Clear visual indication of selected headers
   - Real-time calculation of total impact
   - Validation prevents exceeding 100%
   - Summary shows what will be imported

6. **Role-Based Filtering**:
   - Filter headers by role at the top
   - Only shows headers relevant to selected role
   - Can search across header titles, descriptions, and template content

---

## API Endpoints Summary

### New Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/goal-template-headers/` | Create new header |
| GET | `/api/goal-template-headers/role/{role_id}` | Get headers by role with templates |
| GET | `/api/goal-template-headers/{header_id}` | Get specific header with templates |
| PUT | `/api/goal-template-headers/{header_id}` | Update header |
| DELETE | `/api/goal-template-headers/{header_id}` | Delete header (cascade) |
| GET | `/api/goals/templates/role/{role_id}` | Get all templates for a role |
| POST | `/api/goals/templates/header/{header_id}` | Create template under header |

### Updated Endpoints

| Method | Endpoint | Changes |
|--------|----------|---------|
| POST | `/api/goals/templates` | Add optional `header_id` field |
| PUT | `/api/goals/templates/{template_id}` | Add optional `header_id` field |
| GET | `/api/goals/templates` | Add optional `?role_id=` and `?header_id=` query params |

---

## File Structure Summary

### Backend

```
backend/
├── alembic/versions/
│   └── XXXX_add_goal_template_header.py
├── app/
│   ├── models/
│   │   └── goal.py (updated: GoalTemplateHeader, GoalTemplate)
│   │   └── role.py (updated: relationships)
│   ├── schemas/
│   │   └── goal.py (updated: new header schemas)
│   ├── repositories/
│   │   ├── goal_template_header_repository.py (new)
│   │   └── goal_template_repository.py (updated)
│   ├── services/
│   │   ├── goal_template_header_service.py (new)
│   │   └── goal_service.py (updated)
│   └── routers/
│       ├── goal_template_headers.py (new)
│       └── goals.py (updated)
└── scripts/
    └── migrate_existing_templates.py (new)
```

### Frontend

```
frontend/src/
├── pages/
│   └── GoalTemplatesByRole.tsx (new)
├── components/
│   ├── templates/
│   │   └── RoleTemplateHeaderCard.tsx (new)
│   └── modals/
│       ├── CreateHeaderModal.tsx (new)
│       ├── EditHeaderModal.tsx (new)
│       ├── CreateTemplateModal.tsx (updated)
│       └── EditTemplateModal.tsx (updated)
├── features/
│   ├── goals/
│   │   └── ImportFromTemplateModal.tsx (updated)
│   └── appraisal/
│       └── CreateAppraisalButton.tsx (updated)
└── utils/
    └── api.ts (updated: new API functions)
```

---

## Success Criteria

1. ✅ Database migration completes without errors
2. ✅ All existing templates are assigned to headers
3. ✅ New role-based template management page is functional
4. ✅ Import modal filters templates by role
5. ✅ Templates are grouped by headers in UI
6. ✅ Backward compatibility maintained during transition
7. ✅ All tests pass (unit + integration)
8. ✅ Documentation updated
9. ✅ No breaking changes to appraisal creation flow

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during migration | High | Full database backup before migration |
| Breaking existing appraisals | High | Maintain backward compatibility; thorough testing |
| Performance degradation | Medium | Add database indexes; test with production-size data |
| User confusion with new UI | Medium | Provide user documentation and training |
| Template orphaning | Medium | Implement cascade delete and data validation |

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Database migration | 3 days | None |
| Backend API development | 5 days | Database migration |
| Frontend component development | 5 days | Backend API |
| Integration & testing | 3 days | Frontend + Backend |
| Documentation & deployment | 2 days | All above |
| **Total** | **~3-4 weeks** | |

---

## Current Implementation State & Key Integration Points

### Recent Frontend Updates (Already Implemented)

#### 1. **Batch Import Support** (`ImportFromTemplateModal.tsx`)
- **Lines 22, 224-228**: Added `onGoalsAdded` callback for batch import
- Templates are now imported in a single batch operation instead of individually
- Improves performance and reduces race conditions
- **Integration Point**: This callback is already wired in `CreateAppraisal.tsx` (lines 248-268, 722)

#### 2. **Goal Template ID Tracking** (`ImportFromTemplateModal.tsx`)
- **Line 200**: `goal_template_id` is set when creating pseudo goals from templates
- This allows tracking which template each goal came from
- **Critical for Refactoring**: Will be used to link goals back to specific headers

#### 3. **Goal Change Tracking** (`CreateAppraisal.tsx`)
- **Lines 153-157**: Comprehensive change tracking with `added`, `removed`, `updated` arrays
- Goals are staged locally before being synced to backend
- **Lines 439-441**: `syncGoalChanges` syncs staged changes to server
- **Integration Point**: Header information can be preserved through this flow

#### 4. **Goal Helpers Module** (`goalHelpers.ts`)
- **Lines 73-89**: `addGoalsBatch` with deduplication by `goal_template_id`
- **Lines 25-71**: `handleAddGoal` with goal shape normalization
- **Lines 134-165**: `computeGoalChanges` for diff calculation
- **Integration Point**: These helpers already support the data structures needed for header-based templates

#### 5. **Multi-Category Support**
- Both `ImportFromTemplateModal.tsx` (lines 214-218) and `goalHelpers.ts` (lines 33-52) normalize goals to support:
  - `category_ids: number[]` - array of category IDs
  - `categories: Category[]` - array of category objects
  - Legacy `category_id: number` - single category for backward compatibility

### Required Frontend Changes (Minimal Impact)

#### 1. **Add Role Filtering to Import Modal**
```typescript
// Add to ImportFromTemplateModal.tsx state
const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
const [roles, setRoles] = useState<Role[]>([]);
const [headerGroups, setHeaderGroups] = useState<TemplatesByHeader[]>([]);

// Update loadTemplates to fetch by role
useEffect(() => {
  if (open) {
    loadRoles();
    if (selectedRoleId) {
      loadHeadersWithTemplates(selectedRoleId);
    } else {
      loadTemplates(); // Existing behavior
    }
  }
}, [open, selectedRoleId]);
```

#### 2. **Group Templates by Header in UI**
```typescript
// Render headers as collapsible sections
{headerGroups.map((group) => (
  <Collapsible key={group.header.header_id}>
    <CollapsibleTrigger>
      <div className="header-section">
        <h3>{group.header.title}</h3>
        <p>{group.header.description}</p>
      </div>
    </CollapsibleTrigger>
    <CollapsibleContent>
      {group.templates.map((t) => (
        // Existing template card structure (lines 307-413)
        <div key={t.temp_id}>...</div>
      ))}
    </CollapsibleContent>
  </Collapsible>
))}
```

#### 3. **Update CreateAppraisal to Pass Role Context**
```typescript
// In CreateAppraisal.tsx, pass appraisee's role to import modal
<ImportFromTemplateModal
  open={importFromTemplateOpen}
  onClose={() => setImportFromTemplateOpen(false)}
  onGoalAdded={handleGoalAdded}
  onGoalsAdded={handleGoalsAdded}  // Already implemented
  appraisalId={createdAppraisalId ?? undefined}
  remainingWeightage={Math.max(0, 100 - totalWeightageUi)}
  defaultRoleId={appraiseeRoleId}  // NEW: Auto-filter by appraisee's role
/>
```

### Backend Integration Points

#### 1. **Goal Template ID is Already Stored**
- `goal_template_id` field already exists in goals table
- This links goals back to their source templates
- **Action**: Ensure this field is preserved when syncing goals in `appraisalHelpers.ts`

#### 2. **Existing Sync Flow** (`CreateAppraisal.tsx`)
```typescript
// Lines 439-441: Existing sync function
const syncGoalChanges = async (appraisalId: number) => {
  await syncGoalChangesHelper(appraisalId, goalChanges, originalGoals);
};

// When creating goals from templates, include header_id
// This will be automatic once templates have header_id from backend
```

#### 3. **API Response Shape Update**
Current template response:
```typescript
{
  temp_id: number;
  temp_title: string;
  // ...
  categories: Category[];
}
```

New response (minimal change):
```typescript
{
  temp_id: number;
  header_id: number;  // NEW
  temp_title: string;
  // ...
  categories: Category[];
  header?: {  // OPTIONAL: Include for UI grouping
    header_id: number;
    role_id: number;
    title: string;
    description: string;
  };
}
```

### Migration Considerations for Existing Data

#### Goals Created from Templates
- **Current**: Goals have `goal_template_id` linking to template
- **After Migration**: Templates will have `header_id` linking to header
- **Query Pattern**: `goal → template → header → role`
- No changes needed to existing goals table

#### Orphaned Templates
- Templates without `header_id` can still be displayed in "Unassigned" section
- Migration script will assign all existing templates to default headers per role
- UI can gracefully handle both states during transition

### Key Advantages of Current Architecture

1. **Batch Operations Already Implemented**: Reduces API calls and improves performance
2. **Template ID Tracking**: Maintains relationship between goals and source templates
3. **Flexible Change Tracking**: Supports complex editing scenarios
4. **Normalized Data Structures**: Helper functions handle multiple data shapes
5. **Backward Compatible**: Legacy single-category support preserved

### Recommended Implementation Sequence

1. **Backend First** (Weeks 1-2):
   - Create `goal_template_header` table
   - Add `header_id` to `goals_template`
   - Implement header CRUD endpoints
   - Run migration script
   - Update template endpoints to include header data

2. **Frontend Role Management Page** (Week 3):
   - Create `GoalTemplatesByRole.tsx` page
   - Implement header CRUD operations
   - Test header and template management

3. **Frontend Import Modal Update** (Week 3):
   - Add role filter dropdown
   - Group templates by header
   - Test with both headerless and header-based templates

4. **Integration Testing** (Week 4):
   - Test complete flow: create header → add templates → import to appraisal
   - Verify goal tracking preserves template relationships
   - Test backward compatibility

5. **Cleanup & Deployment** (Week 4):
   - Remove deprecated code paths
   - Update documentation
   - Deploy to production

---

## Conclusion

This refactoring will transform the goal template system into a role-based, hierarchical structure that provides better organization and management. The phased approach ensures minimal disruption to existing functionality while providing a clear upgrade path.

**The recent frontend updates have already laid the groundwork for this refactoring:**
- ✅ Batch import support reduces API overhead
- ✅ Template ID tracking enables proper goal-template relationships
- ✅ Change tracking system supports complex editing scenarios
- ✅ Helper functions normalize data for consistent handling
- ✅ Multi-category support provides flexibility

**The new architecture will:**
- ✅ Support role-specific template collections with headers
- ✅ Enable better template organization through header grouping
- ✅ **Import complete goal template sets as cohesive units** (header-level import)
- ✅ Display comprehensive template information similar to management page
- ✅ Provide smart weightage management with proportional distribution
- ✅ Improve user experience with grouped, contextual templates
- ✅ Maintain backward compatibility with existing data
- ✅ Follow existing codebase patterns and best practices
- ✅ Leverage existing batch operations and change tracking

**Key Benefits of Header-Level Import:**
- **Consistency**: Goals are always imported as complete, well-designed sets
- **Simplicity**: Users don't need to cherry-pick individual templates
- **Efficiency**: One-click import of entire template packages
- **Flexibility**: Total weightage adjustable with automatic proportional distribution
- **Transparency**: See exactly what will be imported before confirming
- **Professional**: Mirrors how organizations typically structure performance goals

**Example Use Cases:**
1. **New Engineer Onboarding**: Manager imports "Software Engineer - Core Competencies" header containing 5 standard technical goals
2. **Promotion Review**: Manager imports "Senior Engineer - Leadership" header with 3 leadership-focused goals
3. **Quarterly Review**: Manager imports "Q4 Project Delivery" header with project-specific goals
4. **Role Transition**: When employee changes roles, manager imports the new role's standard goal templates

This approach ensures that goal templates are used as intended - as comprehensive, well-thought-out packages rather than fragmented individual items.
