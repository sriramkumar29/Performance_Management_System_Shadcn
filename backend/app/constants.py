"""
Centralized constants for the Performance Management System.

This file contains all commonly used string literals, error messages, and constants
to avoid duplication across the application and improve maintainability.
"""

# =============================================================================
# ERROR MESSAGES - Entity Not Found
# =============================================================================

EMPLOYEE_NOT_FOUND = "Employee not found"
APPRAISAL_NOT_FOUND = "Appraisal not found"
APPRAISAL_TYPE_NOT_FOUND = "Appraisal type not found"
APPRAISAL_RANGE_NOT_FOUND = "Appraisal range not found"
GOAL_NOT_FOUND = "Goal not found"
GOAL_TEMPLATE_NOT_FOUND = "Goal template not found"
APPRAISAL_GOAL_NOT_FOUND = "Appraisal goal not found"
CATEGORY_NOT_FOUND = "Category not found"
REPORTING_MANAGER_NOT_FOUND = "Reporting manager not found"

# =============================================================================
# ERROR MESSAGES - Already Exists
# =============================================================================

EMAIL_ALREADY_REGISTERED = "Email already registered"
EMAIL_ALREADY_EXISTS = "Email already exists"
APPRAISAL_TYPE_NAME_EXISTS = "Appraisal type with this name already exists"
APPRAISAL_RANGE_NAME_EXISTS = "Range with this name already exists for this appraisal type"
GOAL_NAME_EXISTS = "Goal with this name already exists"

# =============================================================================
# ERROR MESSAGES - Authentication & Authorization
# =============================================================================

INVALID_EMAIL_OR_PASSWORD = "Invalid email or password"
INVALID_REFRESH_TOKEN = "Invalid refresh token"
REFRESH_TOKEN_EXPIRED = "Refresh token expired"
ACCESS_DENIED = "Access denied"
UNAUTHORIZED = "Unauthorized access"
ACCOUNT_DISABLED = "Account is disabled"
INVALID_ACCESS_TOKEN = "Invalid access token"
ACCESS_TOKEN_EXPIRED = "Access token expired"

# =============================================================================
# ERROR MESSAGES - Validation
# =============================================================================

APPRAISAL_RANGE_MISMATCH = "Appraisal range does not belong to the selected appraisal type"
CIRCULAR_REPORTING_RELATIONSHIP = "Employee cannot report to themselves"
INVALID_STATUS_TRANSITION = "Invalid status transition"
INVALID_WEIGHTAGE_TOTAL = "Total weightage must be 100%"
WEIGHTAGE_MUST_BE_VALID = "Weightage must be between 0 and 100"
RATING_MUST_BE_VALID = "Rating must be between 1 and 5"
END_DATE_AFTER_START_DATE = "End date must be after start date"
IMPORTANCE_MUST_BE_VALID = "Importance must be one of: High, Medium, Low"

# =============================================================================
# ERROR MESSAGES - Business Logic
# =============================================================================

CANNOT_SUBMIT_WITHOUT_GOALS = "Cannot submit appraisal: must have goals totalling 100% weightage"
REPORTING_MANAGER_NOT_FOUND = "Reporting manager not found"
GOAL_NOT_IN_APPRAISAL = "Goal not found in this appraisal"

# =============================================================================
# SUCCESS MESSAGES
# =============================================================================

EMPLOYEE_CREATED_SUCCESSFULLY = "Employee created successfully"
APPRAISAL_CREATED_SUCCESSFULLY = "Appraisal created successfully"
APPRAISAL_UPDATED_SUCCESSFULLY = "Appraisal updated successfully"
GOAL_CREATED_SUCCESSFULLY = "Goal created successfully"

# =============================================================================
# FIELD VALIDATION MESSAGES
# =============================================================================

REQUIRED_FIELD = "This field is required"
INVALID_FORMAT = "Invalid format"
INVALID_EMAIL_FORMAT = "Invalid email format"
PASSWORD_TOO_SHORT = "Password must be at least 8 characters"
NAME_TOO_SHORT = "Name must be at least 2 characters"
EMPLOYEE_EMAIL_ADDRESS_DESC = "Employee email address"

# =============================================================================
# HTTP STATUS MESSAGES
# =============================================================================

INTERNAL_SERVER_ERROR = "Internal server error"
BAD_REQUEST = "Bad request"
NOT_FOUND = "Not Found"
FORBIDDEN = "Forbidden"
CONFLICT = "Resource conflict"
UNAUTHORIZED_HTTP = "Unauthorized"
VALIDATION_ERROR = "Validation Error"

# =============================================================================
# FILE AND ROUTE ERROR MESSAGES
# =============================================================================

FILE_NOT_FOUND = "File not found"
API_ENDPOINT_NOT_FOUND = "API endpoint not found"
ROUTE_NOT_FOUND = "Route not found"
FRONTEND_NOT_FOUND = "Frontend not found. Make sure to build your React app first."
API_RUNNING_FRONTEND_NOT_FOUND = "API is running. Frontend not found - build your React app first."

# =============================================================================
# ENTITY ROLES AND TYPES
# =============================================================================

ROLE_APPRAISEE = "Appraisee"
ROLE_APPRAISER = "Appraiser" 
ROLE_REVIEWER = "Reviewer"
ROLE_MANAGER = "Manager"
ROLE_EMPLOYEE = "Employee"

# =============================================================================
# COMMON PATTERNS FOR DYNAMIC MESSAGES
# =============================================================================

def get_entity_not_found_message(entity_name: str, entity_id: int = None) -> str:
    """Generate a standardized 'not found' message for any entity."""
    if entity_id:
        return f"{entity_name} with ID {entity_id} not found"
    return f"{entity_name} not found"

def get_duplicate_name_message(entity_name: str) -> str:
    """Generate a standardized 'name already exists' message for any entity."""
    return f"{entity_name} with this name already exists"

def get_invalid_transition_message(current_status: str, new_status: str) -> str:
    """Generate a standardized status transition error message."""
    return f"Invalid status transition from {current_status} to {new_status}"

def get_weightage_error_message(total_weightage: float) -> str:
    """Generate a standardized weightage validation error message."""
    return f"Total weightage must be 100%, but got {total_weightage}%"

def get_goal_not_in_appraisal_message(goal_id: int) -> str:
    """Generate a message for when a goal is not found in a specific appraisal."""
    return f"Goal with ID {goal_id} not found in this appraisal"