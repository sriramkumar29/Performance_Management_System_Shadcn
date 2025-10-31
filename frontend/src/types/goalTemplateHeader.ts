/**
 * TypeScript interfaces for Goal Template Headers
 * Used for role-based template management
 */

export interface Category {
  id: number;
  name: string;
}

export type GoalTemplateType = 'Organization' | 'Self';

export interface GoalTemplateHeader {
  header_id: number;
  role_id: number;
  title: string;
  description?: string;
  creator_id?: number;
  goal_template_type: GoalTemplateType;
  is_shared: boolean;
  shared_users_id?: number[];
  created_at: string;
  updated_at: string;
}

export interface GoalTemplateHeaderCreate {
  role_id: number;
  title: string;
  description?: string;
  goal_template_type?: GoalTemplateType;
  is_shared?: boolean;
  shared_users_id?: number[];
}

export interface GoalTemplateHeaderUpdate {
  title?: string;
  description?: string;
  goal_template_type?: GoalTemplateType;
  is_shared?: boolean;
  shared_users_id?: number[];
}

export interface GoalTemplate {
  temp_id: number;
  header_id?: number;
  temp_title: string;
  temp_description: string;
  temp_performance_factor: string;
  temp_importance: 'High' | 'Medium' | 'Low';
  temp_weightage: number;
  categories: Category[];
}

export interface GoalTemplateHeaderWithTemplates extends GoalTemplateHeader {
  goal_templates: GoalTemplate[];
  total_default_weightage: number;
}

export interface Role {
  id: number;
  role_name: string;
}

// For import modal selection state
export interface HeaderSelection {
  header_id: number;
  checked: boolean;
  adjusted_total_weightage?: number;
}

// For displaying templates grouped by header
export interface TemplatesByHeader {
  header: GoalTemplateHeader;
  templates: GoalTemplate[];
  total_default_weightage: number;
}
