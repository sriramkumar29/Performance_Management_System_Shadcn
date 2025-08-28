import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, filter, take, map, catchError, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface User {
  emp_id: number;
  emp_name: string;
  emp_email: string;
  emp_department: string;
  emp_roles: string;
  emp_roles_level: number;
  emp_reporting_manager?: number;
  emp_status: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
  refresh_token?: string; // optional if backend supports refresh tokens
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private refreshInProgress = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadStoredUser();
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    const headers = new HttpHeaders({ 'X-Skip-Auth': 'true' });
    return this.http.post<AuthResponse>(`${environment.apiUrl}/api/auth/login`, credentials, { headers }).pipe(
      tap((response) => {
        localStorage.setItem('token', response.access_token);
        // Store refresh token only if provided by backend
        if (response.refresh_token) {
          localStorage.setItem('refresh_token', response.refresh_token);
        }
        localStorage.setItem('user', JSON.stringify(response.user));
        this.currentUserSubject.next(response.user);
        this.isAuthenticatedSubject.next(true);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/auth/login']);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Attempts to refresh the access token using the stored refresh token.
   * Queues concurrent requests to wait for a single refresh operation.
   */
  refreshAccessToken(): Observable<string> {
    if (this.refreshInProgress) {
      return this.refreshSubject.pipe(
        filter((t): t is string => !!t),
        take(1)
      );
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      // No refresh token available; force logout
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    this.refreshInProgress = true;
    this.refreshSubject.next(null);

    const headers = new HttpHeaders({ 'X-Skip-Auth': 'true' });
    return this.http
      .post<{ access_token: string; token_type: string }>(
        `${environment.apiUrl}/api/auth/refresh`,
        { refresh_token: refreshToken },
        { headers }
      )
      .pipe(
        tap((resp) => {
          localStorage.setItem('token', resp.access_token);
          this.refreshSubject.next(resp.access_token);
        }),
        map((resp) => resp.access_token),
        catchError((err) => {
          // Refresh failed; notify queued requests and logout to clear invalid credentials
          try {
            this.refreshSubject.error(err);
          } catch {
            // ignore if subject already closed
          }
          this.logout();
          return throwError(() => err);
        }),
        finalize(() => {
          this.refreshInProgress = false;
          // Reset subject so future refresh cycles can subscribe safely
          this.refreshSubject = new BehaviorSubject<string | null>(null);
        })
      );
  }

  private loadStoredUser(): void {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        this.logout();
      }
    }
  }

  hasRole(requiredRoles: string[]): boolean {
    const user = this.getCurrentUser();
    return user ? requiredRoles.includes(user.emp_roles) : false;
  }

  hasMinimumRoleLevel(minLevel: number): boolean {
    const user = this.getCurrentUser();
    return user ? user.emp_roles_level >= minLevel : false;
  }
}
