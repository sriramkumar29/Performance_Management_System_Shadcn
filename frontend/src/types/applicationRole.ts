/**
 * TypeScript interfaces for Application Roles
 * Application roles represent job positions (e.g., Developer, QA Engineer)
 * Used for goal template organization
 */

export interface ApplicationRole {
    app_role_id: number;
    app_role_name: string;
    created_at: string;
    updated_at: string;
}

export interface ApplicationRoleCreate {
    app_role_name: string;
}

export interface ApplicationRoleUpdate {
    app_role_name?: string;
}

export interface ApplicationRoleWithStats extends ApplicationRole {
    employee_count: number;
    template_header_count: number;
}
