import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Router } from '@angular/router';

interface Category {
  id: number;
  name: string;
}

interface GoalTemplate {
  temp_id: number;
  temp_title: string;
  temp_description: string;
  temp_performance_factor: string;
  temp_importance: string;
  temp_weightage: number;
  categories: Category[];
}

@Component({
  selector: 'app-goal-templates-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatDialogModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
      <div class="max-w-6xl mx-auto space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between gap-3 mb-6">
          <div class="flex items-center gap-3 sm:gap-4">
            <button mat-icon-button (click)="goBack()" class="bg-white shadow-sm">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div>
              <h1 class="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Goal Templates
              </h1>
              <p class="text-muted-foreground">Manage performance goal templates</p>
            </div>
          </div>
          @if (isManagerOrAbove()) {
            <button mat-raised-button color="primary" (click)="createTemplate()" class="flex items-center gap-2">
              <mat-icon>add</mat-icon>
              <span class="hidden sm:inline">Create Template</span>
            </button>
          }
        </div>

        <!-- Search and Filter Card -->
        <div class="relative">
          <div class="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl opacity-10"></div>
          <div class="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div class="flex items-center gap-2">
                <mat-icon class="text-primary">search</mat-icon>
                <h2 class="text-lg font-semibold">Search Templates</h2>
              </div>
              <span class="text-sm text-muted-foreground">
                {{ loading() ? 'Loading...' : filteredTemplates().length + ' template(s) found' }}
              </span>
            </div>
            
            <mat-form-field class="w-full max-w-md">
              <mat-label>Search by title or category</mat-label>
              <input matInput [formControl]="searchControl" placeholder="Enter search terms...">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
          </div>
        </div>

        <!-- Templates List -->
        @if (loading()) {
          <div class="space-y-4">
            @for (i of [1,2,3]; track i) {
              <div class="animate-pulse">
                <div class="bg-white rounded-2xl p-6 shadow-lg">
                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <div class="h-5 bg-muted rounded w-1/3"></div>
                      <div class="h-5 bg-muted rounded-full w-16"></div>
                    </div>
                    <div class="h-4 bg-muted rounded w-full"></div>
                    <div class="h-4 bg-muted rounded w-5/6"></div>
                    <div class="flex gap-2">
                      <div class="h-6 bg-muted rounded-full w-16"></div>
                      <div class="h-6 bg-muted rounded-full w-20"></div>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="space-y-4">
            @if (filteredTemplates().length === 0) {
              <div class="text-center py-12">
                <div class="relative">
                  <div class="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl opacity-5"></div>
                  <div class="relative bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
                    <mat-icon class="text-6xl text-muted-foreground mb-4">template_add</mat-icon>
                    <div class="text-lg font-semibold text-muted-foreground mb-2">No templates found</div>
                    <div class="text-sm text-muted-foreground mb-4">
                      {{ searchControl.value?.trim() ? 'Try adjusting your search criteria' : 'Create your first goal template to get started' }}
                    </div>
                    @if (isManagerOrAbove() && !searchControl.value?.trim()) {
                      <button mat-raised-button color="primary" (click)="createTemplate()">
                        <mat-icon>add</mat-icon>
                        Create First Template
                      </button>
                    }
                  </div>
                </div>
              </div>
            } @else {
              @for (template of filteredTemplates(); track template.temp_id) {
                <div class="relative group">
                  <div class="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                  <div class="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                    <div class="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div class="flex-1 min-w-0 space-y-3">
                        <!-- Title and Weight -->
                        <div class="flex items-center justify-between gap-2">
                          <h3 class="font-semibold text-lg truncate text-foreground">{{ template.temp_title }}</h3>
                          <mat-chip class="bg-amber-100 text-amber-800 border-amber-200">
                            {{ template.temp_weightage }}% Weight
                          </mat-chip>
                        </div>
                        
                        <!-- Description -->
                        <p class="text-muted-foreground line-clamp-2">{{ template.temp_description }}</p>
                        
                        <!-- Categories -->
                        @if (template.categories?.length) {
                          <div class="flex flex-wrap gap-2">
                            @for (category of template.categories; track category.id) {
                              <mat-chip class="bg-slate-100 text-slate-700 border-slate-200">
                                {{ category.name }}
                              </mat-chip>
                            }
                          </div>
                        }
                        
                        <!-- Metadata -->
                        <div class="flex gap-4 text-xs text-muted-foreground">
                          <span>Importance: <strong>{{ template.temp_importance }}</strong></span>
                          <span>Performance Factor: <strong>{{ template.temp_performance_factor }}</strong></span>
                        </div>
                      </div>
                      
                      <!-- Actions -->
                      @if (isManagerOrAbove()) {
                        <div class="flex gap-2 mt-3 sm:mt-0 self-start sm:self-auto">
                          <button mat-stroked-button color="primary" (click)="editTemplate(template.temp_id)" class="flex items-center gap-2">
                            <mat-icon>edit</mat-icon>
                            <span class="hidden sm:inline">Edit</span>
                          </button>
                          <button mat-stroked-button color="warn" (click)="deleteTemplate(template)" 
                                  [disabled]="deletingId() === template.temp_id" class="flex items-center gap-2">
                            <mat-icon>delete</mat-icon>
                            <span class="hidden sm:inline">{{ deletingId() === template.temp_id ? 'Deleting...' : 'Delete' }}</span>
                          </button>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              }
            }
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './goal-templates-list.component.scss'
})
export class GoalTemplatesListComponent implements OnInit {
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  // Signals for reactive state management
  templates = signal<GoalTemplate[]>([]);
  loading = signal(false);
  deletingId = signal<number | null>(null);

  // Form controls
  searchControl = new FormControl('');

  // Computed values
  filteredTemplates = computed(() => {
    const search = this.searchControl.value?.toLowerCase().trim() || '';
    if (!search) return this.templates();
    
    return this.templates().filter(template =>
      template.temp_title.toLowerCase().includes(search) ||
      template.categories?.some(c => c.name.toLowerCase().includes(search))
    );
  });

  ngOnInit(): void {
    this.loadTemplates();
  }

  private async loadTemplates(): Promise<void> {
    this.loading.set(true);
    try {
      const templates = await this.http.get<GoalTemplate[]>(`${environment.apiUrl}/api/goals/templates`).toPromise();
      this.templates.set(templates || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
      this.snackBar.open('Failed to load templates', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  isManagerOrAbove(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    
    // Check by role name
    if (user.emp_roles && /manager|lead|head|director|vp|chief|cxo|cto|ceo|admin/i.test(user.emp_roles)) {
      return true;
    }
    
    // Check by role level (assuming level > 2 means manager or above)
    if (typeof user.emp_roles_level === 'number') {
      return user.emp_roles_level > 2;
    }
    
    return false;
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  createTemplate(): void {
    this.router.navigate(['/goal-templates/new']);
  }

  editTemplate(templateId: number): void {
    this.router.navigate(['/goal-templates', templateId, 'edit']);
  }

  async deleteTemplate(template: GoalTemplate): Promise<void> {
    // Simple confirmation - in a real app, you'd use MatDialog for confirmation
    if (!confirm(`Are you sure you want to delete the template "${template.temp_title}"? This action cannot be undone.`)) {
      return;
    }

    this.deletingId.set(template.temp_id);
    try {
      await this.http.delete(`${environment.apiUrl}/api/goals/templates/${template.temp_id}`).toPromise();
      this.snackBar.open('Template deleted successfully', 'Close', { duration: 3000 });
      await this.loadTemplates(); // Reload the list
    } catch (error: any) {
      console.error('Failed to delete template:', error);
      this.snackBar.open('Failed to delete template', 'Close', { duration: 3000 });
    } finally {
      this.deletingId.set(null);
    }
  }
}
