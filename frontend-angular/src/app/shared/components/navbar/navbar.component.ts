import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService, User } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { PermissionsService, Permission } from '@core/services/permissions.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    ThemeToggleComponent
  ],
  template: `
    <mat-toolbar class="bg-background border-b border-border shadow-sm">
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center space-x-4">
          <span class="text-gradient font-bold text-xl cursor-pointer" routerLink="/dashboard">
            Performance Management
          </span>
          
          <!-- Navigation Links -->
          <nav class="hidden md:flex items-center space-x-4 ml-8">
            <button mat-button routerLink="/dashboard" routerLinkActive="text-primary">
              <mat-icon>dashboard</mat-icon>
              Dashboard
            </button>
            <button mat-button routerLink="/appraisals/my-appraisals" routerLinkActive="text-primary">
              <mat-icon>assignment</mat-icon>
              My Appraisals
            </button>
            <button mat-button routerLink="/appraisals/team-appraisals" 
                    routerLinkActive="text-primary"
                    *ngIf="canViewTeamAppraisals">
              <mat-icon>group</mat-icon>
              Team Appraisals
            </button>
            <button mat-button routerLink="/goal-templates" 
                    routerLinkActive="text-primary"
                    *ngIf="canManageGoalTemplates">
              <mat-icon>track_changes</mat-icon>
              Goal Templates
            </button>
          </nav>
        </div>
        
        <div class="flex items-center space-x-4">
          <app-theme-toggle></app-theme-toggle>
          
          <div *ngIf="currentUser$ | async as user" class="flex items-center space-x-2">
            <span class="text-sm text-muted-foreground">{{ user.emp_name }}</span>
            <button mat-icon-button [matMenuTriggerFor]="userMenu">
              <mat-icon>account_circle</mat-icon>
            </button>
            <mat-menu #userMenu="matMenu">
              <button mat-menu-item disabled>
                <mat-icon>person</mat-icon>
                <span>{{ user.emp_email }}</span>
              </button>
              <button mat-menu-item disabled>
                <mat-icon>work</mat-icon>
                <span>{{ user.emp_roles }}</span>
              </button>
              <mat-divider></mat-divider>
              <button mat-menu-item (click)="logout()">
                <mat-icon>logout</mat-icon>
                <span>Logout</span>
              </button>
            </mat-menu>
          </div>
        </div>
      </div>
    </mat-toolbar>
  `,
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit {
  currentUser$: Observable<User | null>;
  private permissionsService = inject(PermissionsService);

  constructor(
    private authService: AuthService,
    private themeService: ThemeService
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {}

  get canViewTeamAppraisals(): boolean {
    return this.permissionsService.hasPermission(Permission.VIEW_TEAM_APPRAISALS);
  }

  get canManageGoalTemplates(): boolean {
    return this.permissionsService.hasPermission(Permission.VIEW_GOAL_TEMPLATES);
  }

  logout(): void {
    this.authService.logout();
  }
}
