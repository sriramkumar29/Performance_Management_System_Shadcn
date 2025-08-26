# Role-Based Access Control (RBAC) Implementation

## Overview
This document outlines the comprehensive RBAC implementation for the Performance Management System Angular frontend.

## Architecture

### Core Components

1. **PermissionsService** (`@core/services/permissions.service.ts`)
   - Centralized permissions management
   - Role hierarchy and permission matrix
   - Helper methods for access control

2. **RoleGuard** (`@core/guards/role.guard.ts`)
   - Route-level access control
   - Permission and role validation
   - Automatic redirection for unauthorized access

3. **AuthService** (`@core/services/auth.service.ts`)
   - User authentication state
   - Current user information with roles

## Role Hierarchy

```
1. Employee (Level 1)
2. Team Lead (Level 2) 
3. Manager (Level 3)
4. Senior Manager (Level 4)
5. Director (Level 5)
6. VP (Level 6)
7. HR (Level 7)
8. Admin (Level 8)
```

## Permissions Matrix

### Core Permissions
- `VIEW_OWN_APPRAISAL` - View own performance appraisals
- `COMPLETE_SELF_ASSESSMENT` - Complete self-assessment phase
- `VIEW_TEAM_APPRAISALS` - View team members' appraisals
- `CREATE_APPRAISAL` - Create new appraisals
- `CONDUCT_APPRAISER_EVALUATION` - Perform appraiser evaluation
- `CONDUCT_REVIEWER_EVALUATION` - Perform reviewer evaluation
- `VIEW_GOAL_TEMPLATES` - View goal templates
- `CREATE_GOAL_TEMPLATE` - Create new goal templates
- `EDIT_GOAL_TEMPLATE` - Edit existing goal templates
- `DELETE_GOAL_TEMPLATE` - Delete goal templates
- `MANAGE_USERS` - User management
- `VIEW_REPORTS` - Access reporting features
- `SYSTEM_ADMIN` - Full system administration

### Role-Permission Mapping

| Permission | Employee | Team Lead | Manager | Sr Manager | Director | VP | HR | Admin |
|------------|----------|-----------|---------|------------|----------|----|----|-------|
| VIEW_OWN_APPRAISAL | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| COMPLETE_SELF_ASSESSMENT | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| VIEW_TEAM_APPRAISALS | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| CREATE_APPRAISAL | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| CONDUCT_APPRAISER_EVALUATION | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| CONDUCT_REVIEWER_EVALUATION | | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| VIEW_GOAL_TEMPLATES | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| CREATE_GOAL_TEMPLATE | | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| EDIT_GOAL_TEMPLATE | | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DELETE_GOAL_TEMPLATE | | | | ✓ | ✓ | ✓ | ✓ | ✓ |
| MANAGE_USERS | | | | | | | ✓ | ✓ |
| VIEW_REPORTS | | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SYSTEM_ADMIN | | | | | | | | ✓ |

## Implementation Details

### Route Protection

Routes are protected using the `RoleGuard` with permission requirements:

```typescript
{
  path: 'team-appraisals',
  loadComponent: () => import('./team-appraisals.component'),
  canActivate: [RoleGuard],
  data: { permissions: [Permission.VIEW_TEAM_APPRAISALS] }
}
```

### Component-Level Access Control

Components use permission checks for UI visibility:

```typescript
get canViewTeamAppraisals(): boolean {
  return this.permissionsService.hasPermission(Permission.VIEW_TEAM_APPRAISALS);
}
```

### Template Usage

```html
<button *ngIf="canViewTeamAppraisals" routerLink="/appraisals/team-appraisals">
  Team Appraisals
</button>
```

## Key Methods

### PermissionsService Methods

- `hasPermission(permission: Permission): boolean` - Check single permission
- `hasAnyPermission(permissions: Permission[]): boolean` - Check any of multiple permissions
- `hasAllPermissions(permissions: Permission[]): boolean` - Check all permissions
- `hasMinimumRole(role: Role): boolean` - Check minimum role level
- `canAccessAppraisal(appraisal: any): boolean` - Check appraisal access rights

### RoleGuard Configuration

Route data options:
- `permissions: Permission[]` - Required permissions
- `role: Role` - Minimum required role
- `requireAll: boolean` - Whether all permissions are required (default: false)

## Security Features

1. **Route-Level Protection** - Unauthorized users redirected to dashboard
2. **Component-Level Visibility** - UI elements hidden based on permissions
3. **Role Hierarchy** - Higher roles inherit lower role permissions
4. **Centralized Logic** - Single source of truth for permissions
5. **Type Safety** - TypeScript enums for roles and permissions

## Usage Examples

### Protecting a Route
```typescript
{
  path: 'admin',
  canActivate: [RoleGuard],
  data: { 
    permissions: [Permission.SYSTEM_ADMIN],
    requireAll: true 
  }
}
```

### Component Permission Check
```typescript
export class MyComponent {
  private permissionsService = inject(PermissionsService);
  
  get canCreateAppraisal(): boolean {
    return this.permissionsService.hasPermission(Permission.CREATE_APPRAISAL);
  }
}
```

### Template Conditional Rendering
```html
<div *ngIf="permissionsService.hasMinimumRole(Role.MANAGER)">
  Manager-only content
</div>
```

## Testing

To test RBAC implementation:

1. Login with different user roles
2. Verify route access restrictions
3. Check UI element visibility
4. Test navigation restrictions
5. Validate permission inheritance

## Maintenance

When adding new features:

1. Define new permissions in `Permission` enum
2. Update role-permission matrix in `PermissionsService`
3. Add route guards where needed
4. Implement component-level checks
5. Update this documentation

## Migration Notes

- Replaced hardcoded role checks with centralized permissions
- Updated all components to use `PermissionsService`
- Added comprehensive route protection
- Implemented permission-based UI visibility controls
