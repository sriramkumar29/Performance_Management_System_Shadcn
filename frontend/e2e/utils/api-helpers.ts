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
    const response = await fetch(`${this.baseURL}/api/auth/login`, {
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
    
    return {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      role: data.user.role,
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
      await this.authenticatedRequest('DELETE', '/api/test-data/cleanup');
    } catch (error) {
      console.warn('Test data cleanup failed:', error);
    }
  }

  /**
   * Create test users for different roles
   */
  async createTestUsers(): Promise<{ employee: TestUser; manager: TestUser; hr: TestUser }> {
    const users = {
      employee: await this.createTestUser('employee', 'test.employee@company.com', 'Test Employee'),
      manager: await this.createTestUser('manager', 'test.manager@company.com', 'Test Manager'),
      hr: await this.createTestUser('hr', 'test.hr@company.com', 'Test HR'),
    };

    return users;
  }

  private async createTestUser(role: string, email: string, name: string): Promise<TestUser> {
    const response = await fetch(`${this.baseURL}/api/test-data/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        name,
        role,
        password: 'test123', // Standard test password
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create test user: ${response.status}`);
    }

    const userData = await response.json();
    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
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
