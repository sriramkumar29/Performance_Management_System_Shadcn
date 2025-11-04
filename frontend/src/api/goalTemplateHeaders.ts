/**
 * API functions for Goal Template Headers
 * Handles all HTTP requests for header CRUD operations
 */

import { apiFetch } from '../utils/api';
import type { ApiResult } from '../utils/api';
import type {
  GoalTemplateHeader,
  GoalTemplateHeaderCreate,
  GoalTemplateHeaderUpdate,
  GoalTemplateHeaderWithTemplates,
} from '../types/goalTemplateHeader';

const BASE_PATH = '/goal-template-headers';

/**
 * Create a new goal template header
 */
export async function createTemplateHeader(
  data: GoalTemplateHeaderCreate
): Promise<ApiResult<GoalTemplateHeader>> {
  return apiFetch<GoalTemplateHeader>(`${BASE_PATH}/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get all headers for a specific role with their templates
 */
export async function getHeadersByRole(
  roleId: number
): Promise<ApiResult<GoalTemplateHeaderWithTemplates[]>> {
  return apiFetch<GoalTemplateHeaderWithTemplates[]>(
    `${BASE_PATH}/role/${roleId}`
  );
}

/**
 * Get a specific header with all its templates
 */
export async function getHeaderById(
  headerId: number
): Promise<ApiResult<GoalTemplateHeaderWithTemplates>> {
  return apiFetch<GoalTemplateHeaderWithTemplates>(`${BASE_PATH}/${headerId}`);
}

/**
 * Get all headers with pagination and optional filtering
 * @param skip - Number of records to skip
 * @param limit - Maximum number of records to return
 * @param filterType - Optional filter: 'organization', 'self', or 'shared'
 * @param search - Optional search term for filtering by title or description
 * @param applicationRoleId - Optional filter by application role (job position)
 */
export async function getAllHeaders(
  skip: number = 0,
  limit: number = 100,
  filterType?: 'organization' | 'self' | 'shared',
  search?: string,
  applicationRoleId?: number
): Promise<ApiResult<GoalTemplateHeaderWithTemplates[]>> {
  let url = `${BASE_PATH}/?skip=${skip}&limit=${limit}`;
  if (filterType) {
    url += `&filter_type=${filterType}`;
  }
  if (search && search.length > 0) {
    // encode search term to be safe in URL
    url += `&search=${encodeURIComponent(search)}`;
  }
  if (applicationRoleId) {
    url += `&application_role_id=${applicationRoleId}`;
  }
  return apiFetch<GoalTemplateHeaderWithTemplates[]>(url);
}

/**
 * Update a goal template header
 */
export async function updateTemplateHeader(
  headerId: number,
  data: GoalTemplateHeaderUpdate
): Promise<ApiResult<GoalTemplateHeader>> {
  return apiFetch<GoalTemplateHeader>(`${BASE_PATH}/${headerId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Clone an Organization header (and its templates) into a Self header owned by the current user.
 */
export async function cloneHeaderToSelf(
  headerId: number
): Promise<ApiResult<GoalTemplateHeader>> {
  return apiFetch<GoalTemplateHeader>(`${BASE_PATH}/${headerId}/clone-to-self`, {
    method: 'POST',
  });
}

/**
 * Delete a goal template header (cascades to templates)
 */
export async function deleteTemplateHeader(
  headerId: number
): Promise<ApiResult<void>> {
  return apiFetch<void>(`${BASE_PATH}/${headerId}`, {
    method: 'DELETE',
  });
}

/**
 * Get all templates for a specific role
 * Note: This fetches templates directly, not through headers
 */
export async function getTemplatesByRole(
  roleId: number
): Promise<ApiResult<any[]>> {
  return apiFetch<any[]>(`/goals/templates/role/${roleId}`);
}

/**
 * Create a template under a specific header
 */
export async function createTemplateForHeader(
  headerId: number,
  templateData: any
): Promise<ApiResult<any>> {
  // Backend expects POST to /api/goals/templates with header_id in the body
  const body = { ...templateData, header_id: headerId };
  return apiFetch<any>(`/goals/templates`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
