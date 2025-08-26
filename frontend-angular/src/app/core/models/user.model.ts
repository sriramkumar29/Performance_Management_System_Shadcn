export interface User {
  emp_id: number;
  emp_email: string;
  emp_name: string;
  emp_department: string;
  emp_roles: string;
  emp_roles_level: number;
  emp_reporting_manager?: number;
  emp_status: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LoginRequest {
  emp_email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}
