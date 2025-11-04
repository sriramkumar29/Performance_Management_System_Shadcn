/**
 * API functions for Application Roles
 * Handles all HTTP requests for application role operations
 */

import { apiFetch } from '../utils/api';
import type { ApiResult } from '../utils/api';
import type {
    ApplicationRole,
    ApplicationRoleCreate,
    ApplicationRoleUpdate,
    ApplicationRoleWithStats,
} from '../types/applicationRole';

const BASE_PATH = '/application-roles';

/**
 * Get all application roles
 */
export async function getAllApplicationRoles(): Promise<ApiResult<ApplicationRole[]>> {
    return apiFetch<ApplicationRole[]>(`${BASE_PATH}/`);
}

/**
 * Get a specific application role by ID
 */
export async function getApplicationRoleById(
    appRoleId: number
): Promise<ApiResult<ApplicationRole>> {
    return apiFetch<ApplicationRole>(`${BASE_PATH}/${appRoleId}`);
}

/**
 * Get application role with usage statistics
 */
export async function getApplicationRoleWithStats(
    appRoleId: number
): Promise<ApiResult<ApplicationRoleWithStats>> {
    return apiFetch<ApplicationRoleWithStats>(`${BASE_PATH}/${appRoleId}/stats`);
}

/**
 * Create a new application role
 */
export async function createApplicationRole(
    data: ApplicationRoleCreate
): Promise<ApiResult<ApplicationRole>> {
    return apiFetch<ApplicationRole>(`${BASE_PATH}/`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Update an existing application role
 */
export async function updateApplicationRole(
    appRoleId: number,
    data: ApplicationRoleUpdate
): Promise<ApiResult<ApplicationRole>> {
    return apiFetch<ApplicationRole>(`${BASE_PATH}/${appRoleId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * Delete an application role
 */
export async function deleteApplicationRole(
    appRoleId: number
): Promise<ApiResult<void>> {
    return apiFetch<void>(`${BASE_PATH}/${appRoleId}`, {
        method: 'DELETE',
    });
}
