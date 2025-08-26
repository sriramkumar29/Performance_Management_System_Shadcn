import { Injectable } from '@angular/core';
import { AuthService, User } from './auth.service';

export enum Role {
  EMPLOYEE = 'Employee',
  TEAM_LEAD = 'Team Lead',
  MANAGER = 'Manager',
  SENIOR_MANAGER = 'Senior Manager',
  DIRECTOR = 'Director',
  VP = 'VP',
  HR = 'HR',
  ADMIN = 'Admin'
}

export enum Permission {
  // Appraisal Management
  CREATE_APPRAISAL = 'create_appraisal',
  VIEW_OWN_APPRAISAL = 'view_own_appraisal',
  VIEW_TEAM_APPRAISALS = 'view_team_appraisals',
  VIEW_ALL_APPRAISALS = 'view_all_appraisals',
  EDIT_APPRAISAL = 'edit_appraisal',
  DELETE_APPRAISAL = 'delete_appraisal',
  
  // Self Assessment
  COMPLETE_SELF_ASSESSMENT = 'complete_self_assessment',
  
  // Appraiser Evaluation
  CONDUCT_APPRAISER_EVALUATION = 'conduct_appraiser_evaluation',
  
  // Reviewer Evaluation
  CONDUCT_REVIEWER_EVALUATION = 'conduct_reviewer_evaluation',
  
  // Goal Templates
  VIEW_GOAL_TEMPLATES = 'view_goal_templates',
  CREATE_GOAL_TEMPLATE = 'create_goal_template',
  EDIT_GOAL_TEMPLATE = 'edit_goal_template',
  DELETE_GOAL_TEMPLATE = 'delete_goal_template',
  
  // Reports & Analytics
  VIEW_TEAM_REPORTS = 'view_team_reports',
  VIEW_ORGANIZATION_REPORTS = 'view_organization_reports',
  EXPORT_REPORTS = 'export_reports',
  
  // System Administration
  MANAGE_USERS = 'manage_users',
  MANAGE_SYSTEM_SETTINGS = 'manage_system_settings'
}

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
  
  // Role hierarchy levels for easy comparison
  private readonly roleHierarchy: Record<string, number> = {
    [Role.EMPLOYEE]: 1,
    [Role.TEAM_LEAD]: 2,
    [Role.MANAGER]: 3,
    [Role.SENIOR_MANAGER]: 4,
    [Role.DIRECTOR]: 5,
    [Role.VP]: 6,
    [Role.HR]: 7,
    [Role.ADMIN]: 8
  };

  // Comprehensive permissions matrix
  private readonly permissionsMatrix: Record<string, Permission[]> = {
    [Role.EMPLOYEE]: [
      Permission.VIEW_OWN_APPRAISAL,
      Permission.COMPLETE_SELF_ASSESSMENT
    ],
    
    [Role.TEAM_LEAD]: [
      Permission.VIEW_OWN_APPRAISAL,
      Permission.COMPLETE_SELF_ASSESSMENT,
      Permission.VIEW_TEAM_APPRAISALS,
      Permission.CONDUCT_APPRAISER_EVALUATION,
      Permission.VIEW_TEAM_REPORTS
    ],
    
    [Role.MANAGER]: [
      Permission.CREATE_APPRAISAL,
      Permission.VIEW_OWN_APPRAISAL,
      Permission.VIEW_TEAM_APPRAISALS,
      Permission.EDIT_APPRAISAL,
      Permission.COMPLETE_SELF_ASSESSMENT,
      Permission.CONDUCT_APPRAISER_EVALUATION,
      Permission.CONDUCT_REVIEWER_EVALUATION,
      Permission.VIEW_GOAL_TEMPLATES,
      Permission.CREATE_GOAL_TEMPLATE,
      Permission.EDIT_GOAL_TEMPLATE,
      Permission.VIEW_TEAM_REPORTS,
      Permission.EXPORT_REPORTS
    ],
    
    [Role.SENIOR_MANAGER]: [
      Permission.CREATE_APPRAISAL,
      Permission.VIEW_OWN_APPRAISAL,
      Permission.VIEW_TEAM_APPRAISALS,
      Permission.EDIT_APPRAISAL,
      Permission.DELETE_APPRAISAL,
      Permission.COMPLETE_SELF_ASSESSMENT,
      Permission.CONDUCT_APPRAISER_EVALUATION,
      Permission.CONDUCT_REVIEWER_EVALUATION,
      Permission.VIEW_GOAL_TEMPLATES,
      Permission.CREATE_GOAL_TEMPLATE,
      Permission.EDIT_GOAL_TEMPLATE,
      Permission.DELETE_GOAL_TEMPLATE,
      Permission.VIEW_TEAM_REPORTS,
      Permission.VIEW_ORGANIZATION_REPORTS,
      Permission.EXPORT_REPORTS
    ],
    
    [Role.DIRECTOR]: [
      Permission.CREATE_APPRAISAL,
      Permission.VIEW_OWN_APPRAISAL,
      Permission.VIEW_TEAM_APPRAISALS,
      Permission.VIEW_ALL_APPRAISALS,
      Permission.EDIT_APPRAISAL,
      Permission.DELETE_APPRAISAL,
      Permission.COMPLETE_SELF_ASSESSMENT,
      Permission.CONDUCT_APPRAISER_EVALUATION,
      Permission.CONDUCT_REVIEWER_EVALUATION,
      Permission.VIEW_GOAL_TEMPLATES,
      Permission.CREATE_GOAL_TEMPLATE,
      Permission.EDIT_GOAL_TEMPLATE,
      Permission.DELETE_GOAL_TEMPLATE,
      Permission.VIEW_TEAM_REPORTS,
      Permission.VIEW_ORGANIZATION_REPORTS,
      Permission.EXPORT_REPORTS
    ],
    
    [Role.VP]: [
      Permission.CREATE_APPRAISAL,
      Permission.VIEW_OWN_APPRAISAL,
      Permission.VIEW_TEAM_APPRAISALS,
      Permission.VIEW_ALL_APPRAISALS,
      Permission.EDIT_APPRAISAL,
      Permission.DELETE_APPRAISAL,
      Permission.COMPLETE_SELF_ASSESSMENT,
      Permission.CONDUCT_APPRAISER_EVALUATION,
      Permission.CONDUCT_REVIEWER_EVALUATION,
      Permission.VIEW_GOAL_TEMPLATES,
      Permission.CREATE_GOAL_TEMPLATE,
      Permission.EDIT_GOAL_TEMPLATE,
      Permission.DELETE_GOAL_TEMPLATE,
      Permission.VIEW_TEAM_REPORTS,
      Permission.VIEW_ORGANIZATION_REPORTS,
      Permission.EXPORT_REPORTS,
      Permission.MANAGE_USERS
    ],
    
    [Role.HR]: [
      Permission.CREATE_APPRAISAL,
      Permission.VIEW_OWN_APPRAISAL,
      Permission.VIEW_TEAM_APPRAISALS,
      Permission.VIEW_ALL_APPRAISALS,
      Permission.EDIT_APPRAISAL,
      Permission.DELETE_APPRAISAL,
      Permission.COMPLETE_SELF_ASSESSMENT,
      Permission.CONDUCT_APPRAISER_EVALUATION,
      Permission.CONDUCT_REVIEWER_EVALUATION,
      Permission.VIEW_GOAL_TEMPLATES,
      Permission.CREATE_GOAL_TEMPLATE,
      Permission.EDIT_GOAL_TEMPLATE,
      Permission.DELETE_GOAL_TEMPLATE,
      Permission.VIEW_TEAM_REPORTS,
      Permission.VIEW_ORGANIZATION_REPORTS,
      Permission.EXPORT_REPORTS,
      Permission.MANAGE_USERS,
      Permission.MANAGE_SYSTEM_SETTINGS
    ],
    
    [Role.ADMIN]: [
      Permission.CREATE_APPRAISAL,
      Permission.VIEW_OWN_APPRAISAL,
      Permission.VIEW_TEAM_APPRAISALS,
      Permission.VIEW_ALL_APPRAISALS,
      Permission.EDIT_APPRAISAL,
      Permission.DELETE_APPRAISAL,
      Permission.COMPLETE_SELF_ASSESSMENT,
      Permission.CONDUCT_APPRAISER_EVALUATION,
      Permission.CONDUCT_REVIEWER_EVALUATION,
      Permission.VIEW_GOAL_TEMPLATES,
      Permission.CREATE_GOAL_TEMPLATE,
      Permission.EDIT_GOAL_TEMPLATE,
      Permission.DELETE_GOAL_TEMPLATE,
      Permission.VIEW_TEAM_REPORTS,
      Permission.VIEW_ORGANIZATION_REPORTS,
      Permission.EXPORT_REPORTS,
      Permission.MANAGE_USERS,
      Permission.MANAGE_SYSTEM_SETTINGS
    ]
  };

  constructor(private authService: AuthService) {}

  /**
   * Check if current user has a specific permission
   */
  hasPermission(permission: Permission): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;

    const userRole = this.normalizeRole(user.emp_roles);
    const rolePermissions = this.permissionsMatrix[userRole] || [];
    
    return rolePermissions.includes(permission);
  }

  /**
   * Check if current user has any of the specified permissions
   */
  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  /**
   * Check if current user has all specified permissions
   */
  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  /**
   * Check if current user has a minimum role level
   */
  hasMinimumRole(minimumRole: Role): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;

    const userRole = this.normalizeRole(user.emp_roles);
    const userLevel = this.roleHierarchy[userRole] || 0;
    const minimumLevel = this.roleHierarchy[minimumRole] || 0;

    return userLevel >= minimumLevel;
  }

  /**
   * Check if user can manage another user (based on hierarchy)
   */
  canManageUser(targetUserId: number): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return false;

    // Admin and HR can manage all users
    if (this.hasAnyPermission([Permission.MANAGE_USERS, Permission.MANAGE_SYSTEM_SETTINGS])) {
      return true;
    }

    // Managers can manage their direct reports
    // This would require additional API call to check reporting structure
    return this.hasMinimumRole(Role.MANAGER);
  }

  /**
   * Check if user can conduct appraisal for specific employee
   */
  canConductAppraisal(appraisalData: { appraiser_id?: number, reviewer_id?: number }): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return false;

    // User can conduct appraisal if they are the assigned appraiser or reviewer
    const isAppraiser = appraisalData.appraiser_id === currentUser.emp_id;
    const isReviewer = appraisalData.reviewer_id === currentUser.emp_id;

    return isAppraiser || isReviewer;
  }

  /**
   * Get all permissions for current user
   */
  getCurrentUserPermissions(): Permission[] {
    const user = this.authService.getCurrentUser();
    if (!user) return [];

    const userRole = this.normalizeRole(user.emp_roles);
    return this.permissionsMatrix[userRole] || [];
  }

  /**
   * Get user's role level for display purposes
   */
  getCurrentUserRoleLevel(): number {
    const user = this.authService.getCurrentUser();
    if (!user) return 0;

    const userRole = this.normalizeRole(user.emp_roles);
    return this.roleHierarchy[userRole] || 0;
  }

  /**
   * Normalize role string to match enum values
   */
  private normalizeRole(roleString: string): string {
    if (!roleString) return Role.EMPLOYEE;

    const normalizedRole = roleString.toLowerCase().trim();
    
    // Map common role variations to standard roles
    const roleMapping: Record<string, string> = {
      'employee': Role.EMPLOYEE,
      'team lead': Role.TEAM_LEAD,
      'teamlead': Role.TEAM_LEAD,
      'lead': Role.TEAM_LEAD,
      'manager': Role.MANAGER,
      'senior manager': Role.SENIOR_MANAGER,
      'seniormanager': Role.SENIOR_MANAGER,
      'director': Role.DIRECTOR,
      'vp': Role.VP,
      'vice president': Role.VP,
      'hr': Role.HR,
      'human resources': Role.HR,
      'admin': Role.ADMIN,
      'administrator': Role.ADMIN
    };

    return roleMapping[normalizedRole] || Role.EMPLOYEE;
  }

  /**
   * Check if user is manager or above
   */
  isManagerOrAbove(): boolean {
    return this.hasMinimumRole(Role.MANAGER);
  }

  /**
   * Check if user is HR or Admin
   */
  isHROrAdmin(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;

    const userRole = this.normalizeRole(user.emp_roles);
    return userRole === Role.HR || userRole === Role.ADMIN;
  }

  /**
   * Check if user can access specific appraisal based on their role and relationship
   */
  canAccessAppraisal(appraisal: { 
    employee_id: number, 
    appraiser_id?: number, 
    reviewer_id?: number,
    status: string 
  }): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return false;

    // Admin and HR can access all appraisals
    if (this.isHROrAdmin()) return true;

    // Users can access their own appraisals
    if (appraisal.employee_id === currentUser.emp_id) return true;

    // Appraisers can access appraisals they're assigned to evaluate
    if (appraisal.appraiser_id === currentUser.emp_id) return true;

    // Reviewers can access appraisals they're assigned to review
    if (appraisal.reviewer_id === currentUser.emp_id) return true;

    // Managers can access their team's appraisals
    if (this.hasPermission(Permission.VIEW_TEAM_APPRAISALS)) return true;

    return false;
  }
}
