import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '@core/services/auth.service';
import { PermissionsService, Permission } from '@core/services/permissions.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterModule
  ],
  template: `
    <div class="p-6 bg-background min-h-screen">
      <div class="max-w-7xl mx-auto">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-foreground mb-2">
            Welcome back, {{ currentUser?.emp_name }}!
          </h1>
          <p class="text-muted-foreground">
            {{ currentUser?.emp_department }} • {{ currentUser?.emp_roles }}
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <!-- My Appraisals Card -->
          <mat-card class="hover:shadow-lg transition-shadow cursor-pointer" 
                    routerLink="/appraisals/my-appraisals">
            <mat-card-header>
              <mat-icon mat-card-avatar class="text-primary">assignment</mat-icon>
              <mat-card-title>My Appraisals</mat-card-title>
              <mat-card-subtitle>View your performance reviews</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p class="text-muted-foreground">
                Track your performance appraisals, goals, and feedback from managers.
              </p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-button color="primary" routerLink="/appraisals/my-appraisals">
                <mat-icon>arrow_forward</mat-icon>
                View Appraisals
              </button>
            </mat-card-actions>
          </mat-card>

          <!-- Team Appraisals Card -->
          <mat-card class="hover:shadow-lg transition-shadow cursor-pointer" 
                    routerLink="/appraisals/team-appraisals"
                    *ngIf="canViewTeamAppraisals">
            <mat-card-header>
              <mat-icon mat-card-avatar class="text-secondary">group</mat-icon>
              <mat-card-title>Team Appraisals</mat-card-title>
              <mat-card-subtitle>Manage team performance</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p class="text-muted-foreground">
                Review and evaluate your team members' performance appraisals.
              </p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-button color="primary" routerLink="/appraisals/team-appraisals">
                <mat-icon>arrow_forward</mat-icon>
                Manage Team
              </button>
            </mat-card-actions>
          </mat-card>

          <!-- Goal Templates Card -->
          <mat-card class="hover:shadow-lg transition-shadow cursor-pointer" 
                    routerLink="/goal-templates"
                    *ngIf="canManageGoalTemplates">
            <mat-card-header>
              <mat-icon mat-card-avatar class="text-accent">track_changes</mat-icon>
              <mat-card-title>Goal Templates</mat-card-title>
              <mat-card-subtitle>Create performance goals</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p class="text-muted-foreground">
                Create and manage reusable goal templates for appraisals.
              </p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-button color="primary" routerLink="/goal-templates">
                <mat-icon>arrow_forward</mat-icon>
                Manage Templates
              </button>
            </mat-card-actions>
          </mat-card>

          <!-- Create Appraisal Card -->
          <mat-card class="hover:shadow-lg transition-shadow cursor-pointer" 
                    routerLink="/appraisals/create"
                    *ngIf="canCreateAppraisal">
            <mat-card-header>
              <mat-icon mat-card-avatar class="text-primary">add_circle</mat-icon>
              <mat-card-title>Create Appraisal</mat-card-title>
              <mat-card-subtitle>Start new performance review</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p class="text-muted-foreground">
                Begin a new performance appraisal process with goal setting.
              </p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-button color="primary" routerLink="/appraisals/create">
                <mat-icon>arrow_forward</mat-icon>
                Create New
              </button>
            </mat-card-actions>
          </mat-card>
        </div>

        <!-- Quick Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <mat-card class="text-center">
            <mat-card-content>
              <div class="text-2xl font-bold text-primary mb-1">{{ stats.totalAppraisals }}</div>
              <div class="text-sm text-muted-foreground">Total Appraisals</div>
            </mat-card-content>
          </mat-card>
          
          <mat-card class="text-center">
            <mat-card-content>
              <div class="text-2xl font-bold text-secondary mb-1">{{ stats.pendingAppraisals }}</div>
              <div class="text-sm text-muted-foreground">Pending Reviews</div>
            </mat-card-content>
          </mat-card>
          
          <mat-card class="text-center">
            <mat-card-content>
              <div class="text-2xl font-bold text-accent mb-1">{{ stats.completedGoals }}</div>
              <div class="text-sm text-muted-foreground">Completed Goals</div>
            </mat-card-content>
          </mat-card>
          
          <mat-card class="text-center">
            <mat-card-content>
              <div class="text-2xl font-bold text-primary mb-1">{{ stats.averageRating }}</div>
              <div class="text-sm text-muted-foreground">Average Rating</div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private permissionsService = inject(PermissionsService);
  
  currentUser: User | null = null;
  
  stats = {
    totalAppraisals: 0,
    pendingAppraisals: 0,
    completedGoals: 0,
    averageRating: '0.0'
  };

  // Permission-based computed properties
  get canViewTeamAppraisals(): boolean {
    return this.permissionsService.hasPermission(Permission.VIEW_TEAM_APPRAISALS);
  }

  get canManageGoalTemplates(): boolean {
    return this.permissionsService.hasPermission(Permission.VIEW_GOAL_TEMPLATES);
  }

  get canCreateAppraisal(): boolean {
    return this.permissionsService.hasPermission(Permission.CREATE_APPRAISAL);
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    
    if (this.currentUser) {
      // Load dashboard statistics (placeholder for now)
      this.loadDashboardStats();
    }
  }

  private loadDashboardStats(): void {
    // TODO: Implement API calls to get actual statistics
    this.stats = {
      totalAppraisals: 15,
      pendingAppraisals: 5,
      completedGoals: 10,
      averageRating: '4.5'
    };
  }


}
