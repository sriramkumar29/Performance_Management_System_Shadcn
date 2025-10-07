# Performance Management System Specification

## Overview

The Performance Management System is a comprehensive web-based application designed for small to medium-sized organizations (up to 100 employees) to streamline and automate the performance appraisal process. The system facilitates goal creation, assignment, tracking, and evaluation through a structured workflow involving multiple stakeholders including employees, appraisers, and reviewers.

### Purpose of the Functionality

- **Standardize Performance Reviews**: Create consistent evaluation criteria through goal templates
- **Automate Workflow Management**: Guide appraisals through defined status transitions with proper access controls
- **Enable Multi-level Assessment**: Support self-assessment, appraiser evaluation, and reviewer validation
- **Maintain Audit Trail**: Track all changes and transitions throughout the appraisal lifecycle
- **Ensure Data Security**: Implement role-based access control to protect sensitive evaluation data

### Background Context

Organizations require structured performance evaluation processes to:

- Align employee goals with organizational objectives
- Provide consistent feedback and development opportunities
- Support promotion and compensation decisions
- Meet compliance requirements for performance documentation
- Facilitate manager-employee development conversations

### Scope of Enhancement

**Included Features:**

- Goal template management system for role-based performance criteria
- Complete appraisal lifecycle management (Draft → Complete)
- Multi-stakeholder evaluation workflow
- Role-based access control and security measures
- Automated period calculation for different appraisal types
- Self-assessment, appraiser evaluation, and reviewer validation modules
- Real-time status tracking and user notifications via toast messages
- Comprehensive audit trail and logging system
- JWT-based authentication with token refresh mechanism
- Responsive web interface with modern UI components
- Date calculation utilities for complex appraisal periods
- Import functionality for goal templates (export functionality not implemented)

**Excluded Features:**

- Advanced analytics and reporting dashboards
- Integration with compensation management systems
- Email notifications and automated reminders
- Bulk operations for appraisal management
- Password reset functionality (basic authentication only)

## Objects

### 1. Employee

**Purpose**: Represents system users who can serve as appraisees, appraisers, or reviewers

| Field Name               | Data Type | Description                                     |
| ------------------------ | --------- | ----------------------------------------------- |
| emp_id                   | Integer   | Primary key, unique employee identifier         |
| emp_name                 | String    | Full name of the employee                       |
| emp_email                | String    | Unique email address for authentication         |
| emp_department           | String    | Department/division assignment                  |
| emp_roles                | String    | Role designation (e.g., Developer, Manager, VP) |
| emp_roles_level          | Integer   | Numerical role hierarchy level (1-7)            |
| emp_reporting_manager_id | Integer   | Foreign key to manager's emp_id                 |
| emp_status               | Boolean   | Active/inactive status                          |
| emp_password             | String    | Hashed authentication password                  |

### 2. AppraisalType

**Purpose**: Defines different types of performance reviews with their characteristics

| Field Name | Data Type | Description                                                                           |
| ---------- | --------- | ------------------------------------------------------------------------------------- |
| id         | Integer   | Primary key                                                                           |
| name       | String    | Type name (Annual, Half-yearly, Quarterly, Project-end, Tri-annual, Annual-Probation) |
| has_range  | Boolean   | Whether this type requires range selection                                            |

### 3. AppraisalRange

**Purpose**: Defines periods within appraisal types (e.g., Q1, Q2 for Quarterly)

| Field Name         | Data Type | Description                            |
| ------------------ | --------- | -------------------------------------- |
| id                 | Integer   | Primary key                            |
| appraisal_type_id  | Integer   | Foreign key to AppraisalType           |
| name               | String    | Range identifier (1st, 2nd, 3rd, 4th)  |
| start_month_offset | Integer   | Months from year start to period start |
| end_month_offset   | Integer   | Months from year start to period end   |

### 4. Category

**Purpose**: Categorizes goals into logical groups for better organization

| Field Name | Data Type | Description                                                |
| ---------- | --------- | ---------------------------------------------------------- |
| id         | Integer   | Primary key                                                |
| name       | String    | Category name (Performance, Leadership, Development, etc.) |

### 5. GoalTemplate

**Purpose**: Pre-defined goal structures that can be reused across appraisals

| Field Name              | Data Type | Description                                         |
| ----------------------- | --------- | --------------------------------------------------- |
| temp_id                 | Integer   | Primary key                                         |
| temp_title              | String    | Template goal title                                 |
| temp_description        | String    | Detailed goal description                           |
| temp_performance_factor | String    | Performance area (Quality, Delivery, Collaboration) |
| temp_importance         | String    | Priority level (High, Medium, Low)                  |
| temp_weightage          | Integer   | Percentage weight (must total 100% per appraisal)   |

### 6. Goal

**Purpose**: Individual goals assigned to employees within appraisals

| Field Name              | Data Type | Description                          |
| ----------------------- | --------- | ------------------------------------ |
| goal_id                 | Integer   | Primary key                          |
| goal_template_id        | Integer   | Optional foreign key to GoalTemplate |
| category_id             | Integer   | Foreign key to Category              |
| goal_title              | String    | Specific goal title                  |
| goal_description        | String    | Detailed goal description            |
| goal_performance_factor | String    | Performance area                     |
| goal_importance         | String    | Priority level (High, Medium, Low)   |
| goal_weightage          | Integer   | Percentage weight (1-100)            |

### 7. Appraisal

**Purpose**: Main appraisal record linking employees, goals, and evaluations

| Field Name                 | Data Type | Description                                    |
| -------------------------- | --------- | ---------------------------------------------- |
| appraisal_id               | Integer   | Primary key                                    |
| appraisee_id               | Integer   | Foreign key to Employee being evaluated        |
| appraiser_id               | Integer   | Foreign key to Employee conducting evaluation  |
| reviewer_id                | Integer   | Foreign key to Employee providing final review |
| appraisal_type_id          | Integer   | Foreign key to AppraisalType                   |
| appraisal_type_range_id    | Integer   | Optional foreign key to AppraisalRange         |
| start_date                 | Date      | Appraisal period start date                    |
| end_date                   | Date      | Appraisal period end date                      |
| status                     | Enum      | Current workflow status                        |
| appraiser_overall_comments | String    | Appraiser's summary evaluation                 |
| appraiser_overall_rating   | Integer   | Appraiser's overall rating (1-5)               |
| reviewer_overall_comments  | String    | Reviewer's final comments                      |
| reviewer_overall_rating    | Integer   | Reviewer's final rating (1-5)                  |
| created_at                 | Date      | Record creation timestamp                      |
| updated_at                 | Date      | Last modification timestamp                    |

### 8. AppraisalGoal

**Purpose**: Links goals to appraisals with evaluation data

| Field Name        | Data Type | Description                        |
| ----------------- | --------- | ---------------------------------- |
| id                | Integer   | Primary key                        |
| appraisal_id      | Integer   | Foreign key to Appraisal           |
| goal_id           | Integer   | Foreign key to Goal                |
| self_comment      | String    | Employee's self-assessment comment |
| self_rating       | Integer   | Employee's self-rating (1-5)       |
| appraiser_comment | String    | Appraiser's evaluation comment     |
| appraiser_rating  | Integer   | Appraiser's rating (1-5)           |

### 9. GoalTemplateCategories (Association Table)

**Purpose**: Many-to-many relationship linking goal templates to categories

| Field Name  | Data Type | Description                                      |
| ----------- | --------- | ------------------------------------------------ |
| template_id | Integer   | Primary key, Foreign key to GoalTemplate.temp_id |
| category_id | Integer   | Primary key, Foreign key to Category.id          |

**Constraints:**

- Composite primary key (template_id, category_id)
- CASCADE delete on both foreign key relationships
- Enables multiple categories per goal template
- Supports goal template categorization and filtering

## User Roles & Permissions

### 1. Admin

**Permissions:**

- Full system access and configuration
- Manage all employees, appraisals, and goal templates
- View all appraisals regardless of status
- Configure appraisal types and ranges
- System administration and user management

### 2. Manager/Team Lead (Role Level 3+)

**Permissions:**

- Create and manage goal templates
- Create appraisals for direct reports
- Assign and modify goals for team members
- Act as appraiser for subordinate evaluations
- Import goals from templates during appraisal creation

### 3. Employee/Appraisee

**Permissions:**

- View own appraisals based on status restrictions:
  - **Waiting Acknowledgement Status**: View assigned goals and provide self-ratings/comments
  - **Self Assessment Status**: View goals and provide self-ratings/comments
  - **Complete Status**: View entire appraisal including all evaluations
- Complete self-assessment when appraisal status allows
- Acknowledge goal assignments
- Cannot modify goals or access other employees' appraisals

### 4. Appraiser

**Permissions:**

- Evaluate employees assigned as appraisee
- Access appraisals in "Appraiser Evaluation" status
- Provide ratings and comments for individual goals
- Submit overall appraiser rating and comments
- Cannot modify goals or access self-assessment phase data prematurely

### 5. Reviewer

**Permissions:**

- Review appraisals in "Reviewer Evaluation" status
- View complete appraisal data including self and appraiser assessments
- Provide final reviewer rating and comments
- Mark appraisals as complete
- Cannot modify previous assessment data

## Specifications

### Validation Logic

#### Goal Template Validation

1. **Weightage Validation**:

   - Individual goal template weightage: 1-100%
   - No total weightage requirement at template level
   - Templates can be saved with any valid individual weightage
   - 100% total weightage validation occurs at appraisal level when goals are assigned

2. **Importance Validation**:

   - Must be one of: "High", "Medium", "Low"
   - Required field, cannot be null or empty

3. **Category Assignment**:
   - Multiple categories can be assigned to a single template
   - Categories must exist in the system before assignment or can be added

#### Appraisal Validation

1. **Role Assignment Validation**:

   - Appraiser must have manager role or level ≥ 3
   - Reviewer must be different from appraisee and appraiser
   - Appraisee cannot be their own appraiser or reviewer

2. **Goal Weightage Validation**:

   - Total goal weightage per appraisal must equal 100%
   - Individual goal weightage: 1-100%
   - Cannot submit appraisal without achieving 100% total weightage

3. **Status Transition Validation**:

   - Enforce strict workflow sequence
   - Validate user permissions for status changes
   - Prevent unauthorized status modifications

4. **Rating Validation**:
   - All ratings (self, appraiser, reviewer) must be 1-5
   - Ratings are optional until respective evaluation phase

### Processing Logic

#### Appraisal Lifecycle Workflow

1. **Draft Creation**:

   - Manager or authorized user creates appraisal with basic details
   - Assigns appraisee, appraiser (auto assign be self), and reviewer
   - Selects appraisal type and range if applicable
   - System automatically calculates period dates based on type and range
   - Frontend restricts creation to managers/users with role level > 2 or specific role names
   - Backend validates role assignments prevent conflicts (appraiser ≠ appraisee, reviewer ≠ appraisee/appraiser)

2. **Goal Assignment**:

   - Import from templates or create custom goals
   - Validate total weightage equals 100%
   - Goals become read-only after submission

3. **Status Progression**:

   ```
   Draft → Submitted (Waiting Acknowledgement in UI) → Appraisee Self Assessment →
   Appraiser Evaluation → Reviewer Evaluation → Complete
   ```

4. **Self Assessment Phase**:

   - Triggered when status = "Appraisee Self Assessment"
   - Employee provides ratings (1-5) and comments for each goal
   - Goals display as read-only during assessment
   - Advances to "Appraiser Evaluation" upon completion

5. **Appraiser Evaluation Phase**:

   - Triggered when status = "Appraiser Evaluation"
   - Appraiser sees self-assessment data as read-only
   - Provides appraiser ratings and comments per goal
   - Submits overall rating and comments
   - Advances to "Reviewer Evaluation"

6. **Reviewer Evaluation Phase**:
   - Triggered when status = "Reviewer Evaluation"
   - Reviewer sees all previous assessment data as read-only
   - Provides final reviewer rating and comments
   - Marks appraisal as "Complete"

#### Period Calculation Logic

1. **Automatic Date Calculation**:

   - Annual: Full calendar year or fiscal year
   - Half-yearly: 6-month periods (1st: Jan-Jun, 2nd: Jul-Dec)
   - Quarterly: 3-month periods (1st: Jan-Mar, 2nd: Apr-Jun, 3rd: Jul-Sep, 4th: Oct-Dec.)
   - Tri-annual: 4-month periods (1st: Jan-Apr, 2nd: May-Aug, 3rd: Sep-Dec)

2. **Date Override**:
   - System calculates default dates
   - Managers can manually adjust start/end dates if needed
   - Manual dates must fall within reasonable ranges

### Error Handling

#### Business Rule Violations

1. **Invalid Status Transition**:

   - Error: "Invalid status transition from [current] to [requested]"
   - HTTP Status: 400 Bad Request
   - Action: Display valid next states to user

2. **Insufficient Permissions**:

   - Error: "[Role] role required" or role-based access denied
   - HTTP Status: 403 Forbidden
   - Action: Redirect to appropriate view or display access denied message
   - Frontend implements role-based UI restrictions and navigation guards

3. **Weightage Validation Failures**:

   - Error: "Total weightage must be 100%, current: [X]%" or "Total weightage must be 100%, but got [X]%"
   - HTTP Status: 400 Bad Request (ValidationError/BusinessRuleViolationError)
   - Action: Highlight affected goals and show current total
   - Additional: "Total weightage would exceed 100%: current [X]% + new [Y]% = [Z]%" for goal additions

4. **Missing Required Data**:
   - Error: "Cannot submit appraisal: must have goals totalling 100% weightage"
   - HTTP Status: 400 Bad Request
   - Action: Guide user to complete required fields

#### Data Integrity Violations

1. **Invalid References**:

   - Error: "[Entity] with ID [X] not found" (e.g., "Employee with ID 123 not found")
   - HTTP Status: 404 Not Found (via EntityNotFoundError/DomainEntityNotFoundError)
   - Action: Return to previous valid state
   - Entities validated: Employee, Goal, Appraisal, Goal Template, Category, Appraisal Type, Appraisal Range

2. **Duplicate Resource Creation**:
   - Error: "[Entity] with name '[name]' already exists" (e.g., "Appraisal type with name 'Annual' already exists")
   - HTTP Status: 409 Conflict (via DuplicateResourceError)
   - Action: Suggest alternative names or update existing resource
   - Applied to: Appraisal types, Appraisal ranges, Employee emails

**Note**: The system does not currently implement duplicate appraisal period validation (employee having multiple active appraisals for the same period). Multiple appraisals can be created for the same employee across different periods without conflict checking.

### Field Mapping/Assignments

#### Goal Template to Goal Mapping

When importing from template:

- `temp_title` → `goal_title`
- `temp_description` → `goal_description`
- `temp_performance_factor` → `goal_performance_factor`
- `temp_importance` → `goal_importance`
- `temp_weightage` → `goal_weightage`
- Template categories → Goal category assignment
- `temp_id` → `goal_template_id` (maintains template reference)

#### Appraisal Period Auto-Assignment

Based on appraisal type and range using comprehensive date calculation logic:

- **Annual/Project-end**: January 1 - December 31 (full calendar year)
- **Half-yearly**: 1st (Jan-Jun), 2nd (Jul-Dec)
- **Quarterly**: Q1 (Jan-Mar), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec)
- **Tri-annual**: 1st (Jan-Apr), 2nd (May-Aug), 3rd (Sep-Dec)
- **Annual-Probation**: Same as Annual but with different evaluation criteria
- Manual date override capability with validation constraints
- Leap year handling and month-end date adjustments

#### Authentication and Session Management

- JWT access tokens (short-lived) with refresh token mechanism
- Automatic token refresh before expiration
- Session persistence across browser sessions
- Unauthorized request handling with automatic logout
- Token validation with comprehensive error handling

#### Security Access Control Mapping

Status-based field visibility:

**Draft/Submitted Status**:

- Appraiser: Goals (editable)
- Appraisee/Reviewer: No access

**Self Assessment Status**:

- Appraisee: Goals (read-only) + self rating/comment fields (editable)
- Appraiser/Reviewer: No access (security restriction)

**Appraiser Evaluation Status**:

- Appraisee: No access (security restriction - completely blocked from viewing appraisal)
- Appraiser: Goals + self assessment (read-only) + appraiser rating/comment fields (editable)
- Reviewer: No access

**Reviewer Evaluation Status**:

- Appraisee: No access (security restriction - completely blocked from viewing appraisal)
- Appraiser: No access (security restriction)
- Reviewer: All data (read-only) + reviewer fields (editable)

**Complete Status**:

- All parties: Complete appraisal data (read-only)
- Maintains permanent record of all evaluations

### Audit Trail and Logging

#### Comprehensive Logging System

1. **Application Logging**:

   - Multi-level logging (DEBUG, INFO, WARNING, ERROR, CRITICAL)
   - Separate log files for application, database, requests, and errors
   - Rotating file handlers with size limits and backup retention
   - JSON formatted logs for structured data analysis

2. **Business Operation Logging**:

   - All CRUD operations with user context and timestamps
   - Status transition logging with before/after states
   - Authentication and authorization events
   - Performance timing for critical operations

3. **Security Audit Trail**:

   - Login/logout activities with IP tracking capability
   - Failed authentication attempts
   - Unauthorized access attempts
   - Token refresh and expiration events
   - Role-based access violations

4. **Data Change Tracking**:
   - Created/Updated timestamps on all entities
   - User identification for all modifications
   - Goal assignment and evaluation history
   - Appraisal workflow progression tracking

### Technology Stack and Architecture

#### Backend Technologies

- **FastAPI**: Modern Python web framework with automatic API documentation
- **SQLAlchemy**: ORM with async support for database operations
- **PostgreSQL**: Primary database for data persistence
- **JWT**: Token-based authentication with refresh token support
- **Pydantic**: Data validation and serialization
- **Pytest**: Comprehensive testing framework with integration tests

#### Frontend Technologies

- **React 18**: Modern UI library with TypeScript support
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/ui**: High-quality UI component library
- **React Router**: Client-side routing and navigation
- **Sonner**: Toast notification system

#### Development and Testing

- **ESLint & Prettier**: Code quality and formatting
- **Playwright**: End-to-end testing framework
- **Vitest**: Unit and integration testing for frontend

This specification ensures a secure, structured, and auditable performance management process that guides all stakeholders through their respective responsibilities while maintaining data integrity and access control throughout the appraisal lifecycle. The system provides a robust foundation for performance management with comprehensive logging, security measures, and modern architectural patterns.
