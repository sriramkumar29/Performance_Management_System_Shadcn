/**
 * Role hierarchy utilities for the Performance Management System.
 *
 * Role IDs and hierarchy levels:
 * 1 = Employee (Level 1)
 * 2 = Lead (Level 2)
 * 3 = Manager (Level 3)
 * 4 = CEO (Level 4)
 * 5 = Admin (Level 5)
 */

export const ROLE_ID_EMPLOYEE = 1;
export const ROLE_ID_LEAD = 2;
export const ROLE_ID_MANAGER = 3;
export const ROLE_ID_CEO = 4;
export const ROLE_ID_ADMIN = 5;

export const ROLE_NAME_EMPLOYEE = "Employee";
export const ROLE_NAME_LEAD = "Lead";
export const ROLE_NAME_MANAGER = "Manager";
export const ROLE_NAME_CEO = "CEO";
export const ROLE_NAME_ADMIN = "Admin";

/**
 * Role hierarchy mapping (role_id -> hierarchy level)
 */
export const ROLE_HIERARCHY: Record<number, number> = {
  [ROLE_ID_EMPLOYEE]: 1,
  [ROLE_ID_LEAD]: 2,
  [ROLE_ID_MANAGER]: 3,
  [ROLE_ID_CEO]: 4,
  [ROLE_ID_ADMIN]: 5,
};

/**
 * Get hierarchy level for a role ID
 */
export function getRoleLevel(roleId: number): number {
  return ROLE_HIERARCHY[roleId] ?? 0;
}

/**
 * Check if user has admin role
 */
export function isAdmin(roleId?: number, roleName?: string): boolean {
  if (roleId === ROLE_ID_ADMIN) return true;
  if (roleName && /admin/i.test(roleName)) return true;
  return false;
}

/**
 * Check if user has manager role or higher
 */
export function isManagerOrAbove(roleId?: number, roleName?: string): boolean {
  // Exclude explicit Admin role from being treated as Manager-or-above for
  // eligibility checks. Admin remains a separate privileged role.
  if (roleId === ROLE_ID_ADMIN) return false;
  if (roleId && getRoleLevel(roleId) >= ROLE_HIERARCHY[ROLE_ID_MANAGER]) return true;
  if (roleName && /manager|ceo/i.test(roleName)) return true;
  return false;
}

/**
 * Check if user has lead role or higher
 */
export function isLeadOrAbove(roleId?: number, roleName?: string): boolean {
  // Exclude explicit Admin role from being treated as Lead-or-above for
  // eligibility checks. Admin remains a separate privileged role.
  if (roleId === ROLE_ID_ADMIN) return false;
  if (roleId && getRoleLevel(roleId) >= ROLE_HIERARCHY[ROLE_ID_LEAD]) return true;
  if (roleName && /lead|manager|ceo/i.test(roleName)) return true;
  return false;
}

/**
 * Check if user is eligible to be an appraiser (Lead or above)
 */
export function isAppraiserEligible(roleId?: number, roleName?: string): boolean {
  return isLeadOrAbove(roleId, roleName);
}

/**
 * Check if user is eligible to be a reviewer (Manager or above, excluding Admin)
 * Note: The appraiser who creates the appraisal can also be a reviewer if they are Manager or above,
 * but this is handled separately in the appraisal creation logic.
 */
export function isReviewerEligible(roleId?: number, roleName?: string): boolean {
  return isManagerOrAbove(roleId, roleName);
}

/**
 * Compare two role levels
 * Returns: positive if roleId1 > roleId2, negative if roleId1 < roleId2, 0 if equal
 */
export function compareRoleLevels(roleId1: number, roleId2: number): number {
  return getRoleLevel(roleId1) - getRoleLevel(roleId2);
}
