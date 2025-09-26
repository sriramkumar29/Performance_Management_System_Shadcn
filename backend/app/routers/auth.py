"""
Authentication dependencies for the Performance Management System.

DEPRECATED: This file is maintained for backward compatibility.
New code should import from app.dependencies.auth instead.

This module provides authentication and authorization dependencies
for FastAPI routes with proper service layer integration.
"""

# Import everything from the new location for backward compatibility
from app.dependencies.auth import (
    oauth2_scheme,
    get_auth_service,
    get_current_user,
    get_current_active_user,
    get_current_manager,
    require_manager_role,
    require_admin_role,
    require_hr_role
)

# Re-export everything to maintain compatibility
__all__ = [
    "oauth2_scheme",
    "get_auth_service", 
    "get_current_user",
    "get_current_active_user",
    "get_current_manager",
    "require_manager_role",
    "require_admin_role", 
    "require_hr_role"
]
