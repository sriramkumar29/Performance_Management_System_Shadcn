import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface GoalCategory {
  id: number;
  name: string;
}

export interface Goal {
  goal_id: number;
  goal_title: string;
  goal_description?: string | null;
  goal_importance?: string | null;
  goal_weightage: number;
  category?: GoalCategory | null;
}

export interface AppraisalGoal {
  id: number;
  goal_id: number;
  goal: Goal;
  self_rating?: number | null;
  self_comment?: string | null;
  appraiser_rating?: number | null;
  appraiser_comment?: string | null;
}

export interface AppraisalWithGoals {
  appraisal_id: number;
  appraisee_id: number;
  appraiser_id: number;
  reviewer_id: number;
  appraisal_type_id: number;
  appraisal_type_range_id?: number | null;
  start_date: string;
  end_date: string;
  status: string;
  appraisal_goals: AppraisalGoal[];
  appraiser_overall_comments?: string | null;
  appraiser_overall_rating?: number | null;
  reviewer_overall_comments?: string | null;
  reviewer_overall_rating?: number | null;
}

export interface Employee {
  emp_id: number;
  emp_name: string;
  emp_email: string;
  emp_department?: string;
  emp_roles?: string;
  emp_roles_level?: number;
}

export interface AppraisalType {
  id: number;
  name: string;
  has_range?: boolean;
}

export interface AppraisalRange {
  id: number;
  name: string;
  appraisal_type_id: number;
}

export interface GoalTemplate {
  temp_id: number;
  temp_title: string;
  temp_description?: string;
  temp_performance_factor?: string;
  temp_category?: string;
  temp_importance?: string;
  temp_weightage: number;
}

export interface CreateAppraisalRequest {
  appraisee_id: number;
  reviewer_id: number;
  appraisal_type_id: number;
  appraisal_type_range_id?: number;
  start_date: string;
  end_date: string;
}

export interface CreateGoalRequest {
  goal_title: string;
  goal_description?: string;
  goal_performance_factor?: string;
  goal_importance?: string;
  goal_weightage: number;
  category_id?: number;
}

export interface SelfAssessmentPayload {
  goals: Record<number, {
    self_rating: number;
    self_comment: string;
  }>;
}

export interface AppraiserEvaluationPayload {
  goals: Record<number, {
    appraiser_rating: number;
    appraiser_comment: string;
  }>;
  appraiser_overall_comments: string;
  appraiser_overall_rating: number;
}

export interface ReviewerEvaluationPayload {
  reviewer_overall_comments: string;
  reviewer_overall_rating: number;
}

@Injectable({
  providedIn: 'root'
})
export class AppraisalService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  // Get single appraisal with goals
  async getAppraisal(id: number): Promise<AppraisalWithGoals> {
    return await firstValueFrom(
      this.http.get<AppraisalWithGoals>(`${this.baseUrl}/api/appraisals/${id}`)
    );
  }

  // Get appraisals for current user
  async getMyAppraisals(): Promise<AppraisalWithGoals[]> {
    const response = await firstValueFrom(
      this.http.get<AppraisalWithGoals[]>(`${this.baseUrl}/api/appraisals`)
    );
    return response;
  }

  // Get team appraisals (for managers)
  async getTeamAppraisals(): Promise<AppraisalWithGoals[]> {
    const response = await firstValueFrom(
      this.http.get<AppraisalWithGoals[]>(`${this.baseUrl}/api/appraisals`)
    );
    return response;
  }

  // Create new appraisal
  async createAppraisal(data: CreateAppraisalRequest): Promise<AppraisalWithGoals> {
    const response = await firstValueFrom(
      this.http.post<AppraisalWithGoals>(`${this.baseUrl}/api/appraisals`, data)
    );
    return response;
  }

  // Update appraisal status
  async updateAppraisalStatus(id: number, status: string): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.baseUrl}/api/appraisals/${id}/status`, { status })
    );
  }

  // Add goal to appraisal
  async addGoalToAppraisal(appraisalId: number, goalData: CreateGoalRequest): Promise<AppraisalGoal> {
    const response = await firstValueFrom(
      this.http.post<AppraisalGoal>(`${this.baseUrl}/api/appraisals/${appraisalId}/goals`, goalData)
    );
    return response;
  }

  // Update goal in appraisal
  async updateGoalInAppraisal(appraisalId: number, goalId: number, goalData: Partial<CreateGoalRequest>): Promise<AppraisalGoal> {
    const response = await firstValueFrom(
      this.http.put<AppraisalGoal>(`${this.baseUrl}/api/appraisals/${appraisalId}/goals/${goalId}`, goalData)
    );
    return response;
  }

  // Delete goal from appraisal
  async deleteGoalFromAppraisal(appraisalId: number, goalId: number): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.baseUrl}/api/appraisals/${appraisalId}/goals/${goalId}`)
    );
  }

  // Import goals from templates
  async importGoalsFromTemplates(appraisalId: number, templateIds: number[]): Promise<AppraisalGoal[]> {
    const response = await firstValueFrom(
      this.http.post<AppraisalGoal[]>(`${this.baseUrl}/api/appraisals/${appraisalId}/import-goals`, {
        template_ids: templateIds
      })
    );
    return response;
  }

  // Submit self assessment
  async submitSelfAssessment(appraisalId: number, payload: SelfAssessmentPayload): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.baseUrl}/api/appraisals/${appraisalId}/self-assessment`, payload)
    );
  }

  // Submit appraiser evaluation
  async submitAppraiserEvaluation(appraisalId: number, payload: AppraiserEvaluationPayload): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.baseUrl}/api/appraisals/${appraisalId}/appraiser-evaluation`, payload)
    );
  }

  // Submit reviewer evaluation
  async submitReviewerEvaluation(appraisalId: number, payload: ReviewerEvaluationPayload): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.baseUrl}/api/appraisals/${appraisalId}/reviewer-evaluation`, payload)
    );
  }

  // Get employees (for dropdowns)
  async getEmployees(): Promise<Employee[]> {
    const response = await firstValueFrom(
      this.http.get<Employee[]>(`${this.baseUrl}/api/employees`)
    );
    return response;
  }

  // Get appraisal types
  async getAppraisalTypes(): Promise<AppraisalType[]> {
    const response = await firstValueFrom(
      this.http.get<AppraisalType[]>(`${this.baseUrl}/api/appraisal-types`)
    );
    return response;
  }

  // Get appraisal ranges for a type
  async getAppraisalRanges(typeId: number): Promise<AppraisalRange[]> {
    const response = await firstValueFrom(
      this.http.get<AppraisalRange[]>(`${this.baseUrl}/api/appraisal-types/ranges?appraisal_type_id=${typeId}`)
    );
    return response;
  }

  // Get goal templates
  async getGoalTemplates(): Promise<GoalTemplate[]> {
    const response = await firstValueFrom(
      this.http.get<GoalTemplate[]>(`${this.baseUrl}/api/goals/templates`)
    );
    return response;
  }

  // Get goal categories
  async getGoalCategories(): Promise<GoalCategory[]> {
    const response = await firstValueFrom(
      this.http.get<GoalCategory[]>(`${this.baseUrl}/api/goals/categories`)
    );
    return response;
  }
}
