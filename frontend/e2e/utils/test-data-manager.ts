/**
 * Test data management utilities for E2E tests
 * Ensures consistent test data across different test scenarios
 */

export interface TestEmployee {
  id?: number;
  name: string;
  email: string;
  role: string;
}

export interface TestAppraisalType {
  id?: number;
  name: string;
  description: string;
}

export class TestDataManager {
  private baseURL: string;
  private authToken: string | null = null;

  constructor(baseURL: string = 'http://localhost:7001') {
    this.baseURL = baseURL;
  }

  /**
   * Authenticate with the backend and store access token for subsequent requests.
   */
  async login(email: string, password: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseURL}/api/employees/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.authToken = data?.access_token || null;
      return Boolean(this.authToken);
    } catch {
      return false;
    }
  }

  /**
   * Ensure required test employees exist for smoke tests
   */
  async ensureTestEmployees(): Promise<void> {
    const requiredEmployees: TestEmployee[] = [
      {
        name: 'Test Developer',
        email: 'test.dev@example.com',
        role: 'employee'
      },
      {
        name: 'Test Manager',
        email: 'test.manager@example.com',
        role: 'manager'
      },
      {
        name: 'John CEO',
        email: 'john.ceo@example.com',
        role: 'hr'
      }
    ];

    for (const employee of requiredEmployees) {
      await this.createOrUpdateEmployee(employee);
    }
  }

  /**
   * Ensure required appraisal types exist
   */
  async ensureAppraisalTypes(): Promise<void> {
    const requiredTypes: TestAppraisalType[] = [
      {
        name: 'Annual',
        description: 'Annual performance review'
      },
      {
        name: 'Quarterly',
        description: 'Quarterly performance check-in'
      },
      {
        name: 'Probationary',
        description: 'Probationary period review'
      }
    ];

    for (const type of requiredTypes) {
      await this.createOrUpdateAppraisalType(type);
    }
  }

  /**
   * Setup complete test environment
   */
  async setupTestEnvironment(): Promise<void> {
    try {
      await this.ensureTestEmployees();
      await this.ensureAppraisalTypes();
    } catch (error) {
      console.warn('Test data setup failed, continuing with existing data:', error);
    }
  }

  /**
   * Ensure a minimal set of goal templates exist for UI listing/tests.
   * Requires manager privileges.
   */
  async ensureGoalTemplates(): Promise<void> {
    try {
      // Try to log in as a seeded manager; fallback to CEO if needed
      const loggedIn = (await this.login('lisa.manager@example.com', 'password123'))
        || (await this.login('john.ceo@example.com', 'password123'));
      if (!loggedIn) {
        console.warn('Skipping goal template seeding: could not authenticate');
        return;
      }

      const headers: HeadersInit = this.authToken
        ? { 'Content-Type': 'application/json', Authorization: `Bearer ${this.authToken}` }
        : { 'Content-Type': 'application/json' };

      const templates = [
        {
          temp_title: 'Code Quality',
          temp_description: 'Write clean, maintainable code with proper documentation and testing',
          temp_performance_factor: 'Technical Excellence',
          temp_importance: 'High',
          temp_weightage: 30,
          categories: ['Technical Skills', 'Quality Assurance']
        },
        {
          temp_title: 'Team Collaboration',
          temp_description: 'Work effectively with team members and contribute to team goals',
          temp_performance_factor: 'Teamwork',
          temp_importance: 'High',
          temp_weightage: 25,
          categories: ['Team Collaboration', 'Communication']
        },
        {
          temp_title: 'Project Delivery',
          temp_description: 'Deliver projects on time, within scope, and meeting quality standards',
          temp_performance_factor: 'Delivery Excellence',
          temp_importance: 'High',
          temp_weightage: 35,
          categories: ['Project Management']
        }
      ];

      for (const tpl of templates) {
        try {
          const res = await fetch(`${this.baseURL}/api/goals/templates`, {
            method: 'POST',
            headers,
            body: JSON.stringify(tpl)
          });
          if (!res.ok && res.status !== 409) {
            // 409 -> already exists (if backend supports conflict)
            console.warn(`Failed to create template ${tpl.temp_title}: ${res.status}`);
          }
        } catch (e) {
          console.warn(`Error creating template ${tpl.temp_title}:`, e);
        }
      }
    } catch (e) {
      console.warn('ensureGoalTemplates failed:', e);
    }
  }

  /**
   * Clean up test data
   */
  async cleanupTestData(): Promise<void> {
    try {
      await fetch(`${this.baseURL}/api/test-data/cleanup`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.warn('Test data cleanup failed:', error);
    }
  }

  private async createOrUpdateEmployee(employee: TestEmployee): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/api/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(employee),
      });

      if (!response.ok && response.status !== 409) { // 409 = already exists
        throw new Error(`Failed to create employee: ${response.status}`);
      }
    } catch (error) {
      // Employee might already exist, which is fine
      console.log(`Employee ${employee.name} already exists or creation failed:`, error);
    }
  }

  private async createOrUpdateAppraisalType(type: TestAppraisalType): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/api/appraisal-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(type),
      });

      if (!response.ok && response.status !== 409) { // 409 = already exists
        throw new Error(`Failed to create appraisal type: ${response.status}`);
      }
    } catch (error) {
      // Type might already exist, which is fine
      console.log(`Appraisal type ${type.name} already exists or creation failed:`, error);
    }
  }

  /**
   * Get available employees for dropdowns
   */
  async getAvailableEmployees(): Promise<TestEmployee[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/employees`);
      if (!response.ok) {
        throw new Error(`Failed to fetch employees: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch employees, returning defaults:', error);
      return [
        { name: 'Jane Smith', email: 'jane.smith@company.com', role: 'employee' },
        { name: 'Bob Wilson', email: 'bob.wilson@company.com', role: 'manager' }
      ];
    }
  }

  /**
   * Get available appraisal types
   */
  async getAvailableAppraisalTypes(): Promise<TestAppraisalType[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/appraisal-types`);
      if (!response.ok) {
        throw new Error(`Failed to fetch appraisal types: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch appraisal types, returning defaults:', error);
      return [
        { name: 'Annual', description: 'Annual performance review' },
        { name: 'Quarterly', description: 'Quarterly performance check-in' }
      ];
    }
  }
}

export default TestDataManager;
