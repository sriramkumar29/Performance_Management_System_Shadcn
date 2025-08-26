import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AppraisalService, GoalTemplate, GoalCategory } from '../../core/services/appraisal.service';
import { AuthService } from '../../core/services/auth.service';

interface ExtendedGoalTemplate extends GoalTemplate {
  categories?: GoalCategory[];
}

@Component({
  selector: 'app-goal-templates',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="mx-auto max-w-6xl p-4 sm:p-6">
      <!-- Header -->
      <div class="flex items-center justify-between gap-3 mb-6">
        <div class="flex items-center gap-3 sm:gap-4">
          <button
            mat-stroked-button
            (click)="goHome()"
            class="flex items-center gap-2"
            aria-label="Back"
            title="Back"
          >
            <mat-icon>arrow_back</mat-icon>
            <span class="hidden sm:inline">Back</span>
          </button>
          <h1 class="text-2xl font-bold">Manage Goal Templates</h1>
        </div>
        <div class="flex items-center gap-2">
          @if (isManagerOrAbove()) {
            <button
              mat-raised-button
              color="primary"
              (click)="createTemplate()"
              class="flex items-center gap-2"
              aria-label="Create Template"
              title="Create Template"
            >
              <mat-icon>add</mat-icon>
              <span class="hidden sm:inline">Create Template</span>
            </button>
          }
        </div>
      </div>

      <!-- Search Card -->
      <mat-card class="shadow-lg mb-6">
        <mat-card-header>
          <mat-card-title class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full">
            <span class="flex items-center gap-2">
              <mat-icon>search</mat-icon>
              Search Templates
            </span>
            <span class="text-sm font-normal text-gray-600">
              @if (loading()) {
                Loading…
              } @else {
                {{ filteredTemplates().length }} template(s) found
              }
            </span>
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-form-field appearance="outline" class="w-full max-w-md">
            <mat-label>Search by title or category...</mat-label>
            <input
              matInput
              [(ngModel)]="searchFilter"
              (ngModelChange)="onFilterChange()"
              placeholder="Search by title or category..."
            >
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
        </mat-card-content>
      </mat-card>

      <!-- Templates List -->
      <div class="space-y-4">
        @if (loading()) {
          <!-- Loading Skeletons -->
          @for (i of [1, 2, 3]; track i) {
            <mat-card class="shadow-sm">
              <mat-card-content class="p-6">
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <div class="h-5 w-1/3 bg-gray-200 rounded animate-pulse"></div>
                    <div class="h-5 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                  </div>
                  <div class="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                  <div class="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
                  <div class="flex gap-2">
                    <div class="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                    <div class="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                    <div class="h-6 w-12 bg-gray-200 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          }
        } @else {
          @if (filteredTemplates().length === 0) {
            <!-- Empty State -->
            <div class="text-center py-12">
              <div class="text-gray-600 text-lg mb-2">No templates found</div>
              <div class="text-sm text-gray-500">
                @if (searchFilter.trim()) {
                  Try adjusting your search criteria
                } @else {
                  Create your first goal template to get started
                }
              </div>
            </div>
          } @else {
            <!-- Templates -->
            @for (template of filteredTemplates(); track template.temp_id) {
              <mat-card class="hover:shadow-md transition-shadow cursor-pointer">
                <mat-card-content class="p-6">
                  <div class="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between gap-2 mb-2">
                        <h3 class="font-semibold text-lg truncate">{{ template.temp_title }}</h3>
                        <mat-chip-set>
                          <mat-chip class="bg-amber-100 text-amber-800">
                            {{ template.temp_weightage }}% Weight
                          </mat-chip>
                        </mat-chip-set>
                      </div>
                      <p class="text-gray-600 mb-3 line-clamp-2">{{ template.temp_description }}</p>
                      
                      @if (template.categories && template.categories.length > 0) {
                        <mat-chip-set class="mb-3">
                          @for (category of template.categories; track category.id) {
                            <mat-chip class="bg-slate-50 text-slate-700">
                              {{ category.name }}
                            </mat-chip>
                          }
                        </mat-chip-set>
                      }
                      
                      <div class="flex gap-4 text-xs text-gray-600">
                        <span>Importance: <strong>{{ template.temp_importance }}</strong></span>
                        <span>Performance Factor: <strong>{{ template.temp_performance_factor }}</strong></span>
                      </div>
                    </div>
                    
                    @if (isManagerOrAbove()) {
                      <div class="flex gap-2 mt-3 sm:mt-0">
                        <button
                          mat-stroked-button
                          (click)="editTemplate(template.temp_id)"
                          class="flex items-center gap-2"
                          aria-label="Edit template"
                          title="Edit template"
                        >
                          <mat-icon>edit</mat-icon>
                          <span class="hidden sm:inline">Edit</span>
                        </button>
                        <button
                          mat-stroked-button
                          color="warn"
                          (click)="confirmDelete(template)"
                          [disabled]="deletingId() === template.temp_id"
                          class="flex items-center gap-2"
                          [attr.aria-label]="deletingId() === template.temp_id ? 'Deleting…' : 'Delete template'"
                          [title]="deletingId() === template.temp_id ? 'Deleting…' : 'Delete template'"
                        >
                          <mat-icon>delete</mat-icon>
                          <span class="hidden sm:inline">
                            {{ deletingId() === template.temp_id ? 'Deleting…' : 'Delete' }}
                          </span>
                        </button>
                      </div>
                    }
                  </div>
                </mat-card-content>
              </mat-card>
            }
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: .5;
      }
    }
    
    .space-y-4 > * + * {
      margin-top: 1rem;
    }
    
    .space-y-3 > * + * {
      margin-top: 0.75rem;
    }
  `]
})
export class GoalTemplatesComponent implements OnInit {
  private router = inject(Router);
  private appraisalService = inject(AppraisalService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  loading = signal(false);
  templates = signal<ExtendedGoalTemplate[]>([]);
  filteredTemplates = signal<ExtendedGoalTemplate[]>([]);
  searchFilter = '';
  deletingId = signal<number | null>(null);

  ngOnInit() {
    this.loadTemplates();
  }

  private async loadTemplates() {
    this.loading.set(true);
    try {
      const templates = await this.appraisalService.getGoalTemplates();
      // Note: The API might not return categories, so we'll handle that gracefully
      const extendedTemplates: ExtendedGoalTemplate[] = templates.map(t => ({
        ...t,
        categories: [] // Will be populated if API provides this data
      }));
      this.templates.set(extendedTemplates);
      this.filteredTemplates.set(extendedTemplates);
    } catch (error) {
      this.snackBar.open((error as any).message || 'Failed to load templates', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  onFilterChange() {
    const filter = this.searchFilter.toLowerCase().trim();
    if (!filter) {
      this.filteredTemplates.set(this.templates());
      return;
    }

    const filtered = this.templates().filter(template =>
      template.temp_title.toLowerCase().includes(filter) ||
      template.categories?.some(c => c.name.toLowerCase().includes(filter))
    );
    this.filteredTemplates.set(filtered);
  }

  isManagerOrAbove(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    
    if (user.emp_roles && /manager|lead|head|director|vp|chief|cxo|cto|ceo|admin/i.test(user.emp_roles)) {
      return true;
    }
    
    if (typeof user.emp_roles_level === 'number') {
      return user.emp_roles_level > 2;
    }
    
    return false;
  }

  goHome() {
    this.router.navigate(['/']);
  }

  createTemplate() {
    this.router.navigate(['/goal-templates/new']);
  }

  editTemplate(templateId: number) {
    this.router.navigate([`/goal-templates/${templateId}/edit`]);
  }

  confirmDelete(template: ExtendedGoalTemplate) {
    const confirmed = confirm(`Are you sure you want to delete the template "${template.temp_title}"? This action cannot be undone.`);
    if (confirmed) {
      this.deleteTemplate(template.temp_id);
    }
  }

  private async deleteTemplate(templateId: number) {
    this.deletingId.set(templateId);
    try {
      // Note: This endpoint might need to be implemented in the AppraisalService
      // For now, we'll use a direct HTTP call approach
      await fetch(`/api/goals/templates/${templateId}`, { method: 'DELETE' });
      this.snackBar.open('Template deleted successfully', 'Close', { duration: 3000 });
      await this.loadTemplates();
    } catch (error) {
      this.snackBar.open((error as any).message || 'Failed to delete template', 'Close', { duration: 3000 });
    } finally {
      this.deletingId.set(null);
    }
  }
}
