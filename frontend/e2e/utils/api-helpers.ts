/**
 * API Helper utilities for E2E testing
 * Based on Phase 2 integration testing discoveries
 */

interface LoginCredentials {
  email: string;
  password: string;
}

interface TestUser {
  id: number;
  email: string;
  name: string;
  role: string;
  token?: string;
}

interface AppraisalData {
  title: string;
  description?: string;
  goals: GoalData[];
}

interface GoalData {
  title: string;
  description: string;
  weightage: number;
  category: string;
}

export class APIHelper {
  private baseURL: string;
  private testToken?: string;

  constructor(baseURL: string = 'http://localhost:7001') {
    this.baseURL = baseURL;
  }

  /**
   * Authentication helper - based on Phase 2 JWT validation
   */
  async login(credentials: LoginCredentials): Promise<TestUser> {
    const response = await fetch(`${this.baseURL}/api/employees/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    this.testToken = data.access_token;
    
    // Backend response only contains tokens, not user data
    // We'll need to fetch user data separately or return mock data for tests
    return {
      id: 1, // Mock ID since backend doesn't return user data in login response
      email: credentials.email,
      name: 'Test User',
      role: 'employee',
      token: this.testToken,
    };
  }

  /**
   * Create test appraisal with validated business rules
   * Ensures goal weightage totals 100%
   */
  async createTestAppraisal(appraisalData: AppraisalData): Promise<any> {
    // Validate goal weightage totals 100% (Phase 2 discovery)
    const totalWeightage = appraisalData.goals.reduce((sum, goal) => sum + goal.weightage, 0);
    if (totalWeightage !== 100) {
      throw new Error(`Goal weightage must total 100%, got ${totalWeightage}%`);
    }

    const response = await this.authenticatedRequest('POST', '/api/appraisals', {
      title: appraisalData.title,
      description: appraisalData.description || '',
      status: 'draft', // Initial status from Phase 2 workflow
    });

    const appraisal = await response.json();

    // Add goals to the appraisal
    for (const goal of appraisalData.goals) {
      await this.authenticatedRequest('POST', `/api/appraisals/${appraisal.id}/goals`, {
        title: goal.title,
        description: goal.description,
        weightage: goal.weightage,
        category: goal.category,
      });
    }

    return appraisal;
  }

  /**
   * Transition appraisal status using validated workflow sequence
   * Based on Phase 2 discovery: draft → submitted → appraisee_self_assessment → appraiser_evaluation → reviewer_evaluation → complete
   */
  async transitionAppraisalStatus(appraisalId: number, toStatus: string): Promise<any> {
    const validTransitions = {
      'draft': ['submitted'],
      'submitted': ['appraisee_self_assessment'],
      'appraisee_self_assessment': ['appraiser_evaluation'],
      'appraiser_evaluation': ['reviewer_evaluation'],
      'reviewer_evaluation': ['complete']
    };

    // Get current status
    const currentAppraisal = await this.getAppraisal(appraisalId);
    const fromStatus = currentAppraisal.status;

    if (!validTransitions[fromStatus]?.includes(toStatus)) {
      throw new Error(`Invalid status transition: ${fromStatus} → ${toStatus}`);
    }

    return await this.authenticatedRequest('PATCH', `/api/appraisals/${appraisalId}/status`, {
      status: toStatus,
    });
  }

  /**
   * Submit self-assessment with goal-level data (Phase 2 schema discovery)
   */
  async submitSelfAssessment(appraisalId: number, goalEvaluations: Record<number, { self_comment: string; self_rating: number }>): Promise<any> {
    const evaluationData = {
      goals: goalEvaluations,
    };

    return await this.authenticatedRequest('POST', `/api/appraisals/${appraisalId}/self-assessment`, evaluationData);
  }

  /**
   * Submit appraiser evaluation with validated schema
   */
  async submitAppraisalEvaluation(
    appraisalId: number, 
    goalEvaluations: Record<number, { appraiser_comment: string; appraiser_rating: number }>,
    overallRating: number,
    overallComments: string
  ): Promise<any> {
    const evaluationData = {
      goals: goalEvaluations,
      appraiser_overall_rating: overallRating,
      appraiser_overall_comments: overallComments,
    };

    return await this.authenticatedRequest('POST', `/api/appraisals/${appraisalId}/evaluation`, evaluationData);
  }

  /**
   * Get appraisal details
   */
  async getAppraisal(appraisalId: number): Promise<any> {
    const response = await this.authenticatedRequest('GET', `/api/appraisals/${appraisalId}`);
    return await response.json();
  }

  /**
   * Clean up test data after tests
   */
  async cleanupTestData(): Promise<void> {
    try {
      // For now, we'll just log the cleanup attempt
      // In the future, we might want to delete test users created during the test
      console.log('Test data cleanup - skipped (no dedicated endpoint)');
    } catch (error) {
      console.warn('Test data cleanup failed:', error);
    }
  }

  /**
   * Create test users for different roles
   */
  async createTestUsers(): Promise<{ employee: TestUser; manager: TestUser; hr: TestUser }> {
    // For now, return mock users since we're using existing users
    // In a real test environment, we'd create fresh test users
    const users = {
      employee: { id: 1, email: 'test@example.com', name: 'Test Employee', role: 'Developer' },
      manager: { id: 1, email: 'test@example.com', name: 'Test Employee', role: 'Developer' },
      hr: { id: 1, email: 'test@example.com', name: 'Test Employee', role: 'Developer' },
    };

    return users;
  }

  private async createTestUser(role: string, email: string, name: string): Promise<TestUser> {
    // Map roles to appropriate levels and departments
    const roleMapping = {
      'employee': { level: 3, roles: 'Developer', department: 'Engineering' },
      'manager': { level: 5, roles: 'Manager', department: 'Engineering' },
      'hr': { level: 6, roles: 'HR Manager', department: 'Human Resources' }
    };

    const roleInfo = roleMapping[role as keyof typeof roleMapping] || roleMapping.employee;

    const response = await fetch(`${this.baseURL}/api/employees/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emp_name: name,
        emp_email: email,
        emp_department: roleInfo.department,
        emp_roles: roleInfo.roles,
        emp_roles_level: roleInfo.level,
        emp_reporting_manager_id: null,
        emp_status: true,
        password: 'test123', // Standard test password
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create test user: ${response.status}`);
    }

    const userData = await response.json();
    return {
      id: userData.emp_id,
      email: userData.emp_email,
      name: userData.emp_name,
      role: userData.emp_roles,
    };
  }

  private async authenticatedRequest(method: string, endpoint: string, data?: any): Promise<Response> {
    if (!this.testToken) {
      throw new Error('No authentication token available. Please login first.');
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.testToken}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${method} ${endpoint} - ${response.status} ${response.statusText}\n${errorText}`);
    }

    return response;
  }
}

export { type TestUser, type AppraisalData, type GoalData };
