import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

interface Appraisal {
  appraisal_id: number;
  appraisal_setting_id?: number | null;
  appraisee_id: number;
  appraiser_id: number;
  reviewer_id: number;
  appraisal_type_id: number;
  appraisal_type_range_id?: number | null;
  start_date: string;
  end_date: string;
  status: string;
  appraiser_overall_comments?: string | null;
  appraiser_overall_rating?: number | null;
  reviewer_overall_comments?: string | null;
  reviewer_overall_rating?: number | null;
  created_at?: string;
  updated_at?: string;
}

interface AppraisalGoal {
  id: number;
  goal?: { goal_weightage?: number };
  self_rating?: number | null;
  appraiser_rating?: number | null;
}

interface AppraisalWithGoals extends Appraisal {
  appraisal_goals: AppraisalGoal[];
}

interface AppraisalType {
  id: number;
  name: string;
  has_range?: boolean;
}

@Component({
  selector: 'app-my-appraisals',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatExpansionModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="p-6 space-y-6 text-foreground">
      <!-- Overview Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <mat-card class="transition-all duration-200 hover:shadow-md">
          <mat-card-header class="pb-2">
            <mat-card-title class="text-sm sm:text-base font-medium flex items-center gap-2">
              <mat-icon class="text-primary">calendar_today</mat-icon>
              Appraisal Type
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="text-2xl font-bold text-foreground">
              {{ selectedAppraisal() ? getTypeName(selectedAppraisal()!.appraisal_type_id) : '—' }}
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="transition-all duration-200 hover:shadow-md">
          <mat-card-header class="pb-2">
            <mat-card-title class="text-sm sm:text-base font-medium flex items-center gap-2">
              <mat-icon class="text-primary">schedule</mat-icon>
              Due Date
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="text-2xl font-bold text-foreground">
              {{ selectedAppraisal() ? formatDate(selectedAppraisal()!.end_date) : '—' }}
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="transition-all duration-200 hover:shadow-md">
          <mat-card-header class="pb-2">
            <mat-card-title class="text-sm sm:text-base font-medium flex items-center gap-2">
              <mat-icon class="text-primary">trending_up</mat-icon>
              Overall Progress
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (completionPercentage() !== null) {
              <div class="space-y-2">
                <div class="text-2xl font-bold text-foreground">{{ completionPercentage() }}%</div>
                <mat-progress-bar [value]="completionPercentage()!" mode="determinate" class="h-2"></mat-progress-bar>
              </div>
            } @else {
              <div class="text-2xl font-bold text-muted-foreground">—</div>
            }
          </mat-card-content>
        </mat-card>
      </div>

      <!-- My Appraisals Section -->
      <mat-card class="transition-all duration-200 hover:shadow-md">
        <mat-card-header>
          <div class="flex items-center justify-between gap-2 w-full">
            <mat-card-title class="text-base sm:text-lg font-semibold flex items-center gap-2">
              <mat-icon class="text-primary">check_circle</mat-icon>
              My Appraisals
            </mat-card-title>
            <div class="flex items-center gap-2">
              <button mat-icon-button (click)="toggleFilters()" [attr.aria-expanded]="showFilters()">
                <mat-icon>filter_list</mat-icon>
              </button>
              @if (filteredAppraisals().length > 0) {
                <div class="flex items-center gap-1">
                  <button mat-icon-button [disabled]="currentPage() <= 1" (click)="previousPage()">
                    <mat-icon>chevron_left</mat-icon>
                  </button>
                  <span class="text-xs px-2">{{ currentPage() }} / {{ totalPages() }}</span>
                  <button mat-icon-button [disabled]="currentPage() >= totalPages()" (click)="nextPage()">
                    <mat-icon>chevron_right</mat-icon>
                  </button>
                </div>
              }
            </div>
          </div>

          @if (showFilters()) {
            <mat-expansion-panel expanded class="mt-4">
              <mat-expansion-panel-header>
                <mat-panel-title>Filters</mat-panel-title>
              </mat-expansion-panel-header>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                <mat-form-field>
                  <mat-label>Search</mat-label>
                  <input matInput [formControl]="searchControl" placeholder="Search appraisal type">
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Type</mat-label>
                  <mat-select [formControl]="typeFilterControl">
                    <mat-option value="all">All types</mat-option>
                    @for (type of appraisalTypes(); track type.id) {
                      <mat-option [value]="type.id.toString()">{{ type.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Status</mat-label>
                  <mat-select [formControl]="statusFilterControl">
                    <mat-option value="All">All</mat-option>
                    <mat-option value="Active">Active</mat-option>
                    <mat-option value="Completed">Completed</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </mat-expansion-panel>
          }
        </mat-card-header>

        <mat-card-content>
          @if (loading()) {
            <div class="space-y-4">
              @for (i of [1,2,3]; track i) {
                <div class="animate-pulse bg-muted rounded-lg h-20"></div>
              }
            </div>
          } @else if (error()) {
            <div class="text-sm text-red-600 mb-4 p-3 bg-red-50 rounded-md border border-red-200">
              {{ error() }}
            </div>
          } @else {
            <!-- Status Filter Chips -->
            <div class="flex items-center gap-2 mb-4">
              <mat-chip-set class="flex flex-wrap gap-2">
                <mat-chip-option [selected]="statusFilterControl.value === 'Active'" (click)="statusFilterControl.setValue('Active')" class="cursor-pointer">
                  Active
                </mat-chip-option>
                <mat-chip-option [selected]="statusFilterControl.value === 'Completed'" (click)="statusFilterControl.setValue('Completed')" class="cursor-pointer">
                  Completed
                </mat-chip-option>
                <mat-chip-option [selected]="statusFilterControl.value === 'All'" (click)="statusFilterControl.setValue('All')" class="cursor-pointer">
                  All
                </mat-chip-option>
              </mat-chip-set>
            </div>

            <!-- Appraisals List -->
            <div class="space-y-3">
              @if (pagedAppraisals().length === 0) {
                <div class="text-center py-8 text-muted-foreground">
                  <mat-icon class="text-6xl mb-4">check_circle</mat-icon>
                  <p>No appraisals found</p>
                </div>
              } @else {
                @for (appraisal of pagedAppraisals(); track appraisal.appraisal_id) {
                  <div class="rounded-lg border border-gray-200 bg-white p-3 sm:p-4 text-sm transition-all duration-200 hover:shadow-sm">
                    <div class="flex items-center justify-between">
                      <div class="space-y-1">
                        <div class="font-medium text-foreground">
                          {{ getTypeName(appraisal.appraisal_type_id) }}
                        </div>
                        <div class="text-xs text-muted-foreground flex items-center gap-1">
                          <mat-icon class="text-xs">calendar_today</mat-icon>
                          {{ formatDate(appraisal.start_date) }} – {{ formatDate(appraisal.end_date) }}
                        </div>
                      </div>
                      <div class="flex items-center gap-3">
                        @if (appraisal.status === 'Complete') {
                          <mat-chip class="bg-green-100 text-green-800">Completed</mat-chip>
                        } @else {
                          <mat-chip [class]="getStatusChipClass(appraisal.status)">
                            {{ getDisplayStatus(appraisal.status) }}
                          </mat-chip>
                        }
                        
                        @if (appraisal.status === 'Submitted' || appraisal.status === 'Appraisee Self Assessment') {
                          <button mat-raised-button color="primary" (click)="startSelfAssessment(appraisal)">
                            <span class="hidden sm:inline">
                              {{ appraisal.status === 'Submitted' ? 'Take Self Assessment' : 'Continue Self Assessment' }}
                            </span>
                            <mat-icon class="sm:ml-2">arrow_forward</mat-icon>
                          </button>
                        }
                        
                        @if (appraisal.status === 'Complete') {
                          <button mat-stroked-button color="primary" (click)="viewAppraisal(appraisal)">
                            <span class="hidden sm:inline">View</span>
                            <mat-icon class="sm:ml-2">arrow_forward</mat-icon>
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                }
              }
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styleUrl: './my-appraisals.component.scss'
})
export class MyAppraisalsComponent implements OnInit {
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  // Signals for reactive state management
  appraisals = signal<Appraisal[]>([]);
  appraisalTypes = signal<AppraisalType[]>([]);
  appraisalDetails = signal<Record<number, AppraisalWithGoals>>({});
  loading = signal(false);
  error = signal<string | null>(null);
  showFilters = signal(false);
  currentPage = signal(1);

  // Form controls
  searchControl = new FormControl('');
  typeFilterControl = new FormControl('all');
  statusFilterControl = new FormControl('All');

  private readonly ITEMS_PER_PAGE = 5;

  // Computed values
  filteredAppraisals = computed(() => {
    const search = this.searchControl.value?.toLowerCase() || '';
    const typeFilter = this.typeFilterControl.value || 'all';
    const statusFilter = this.statusFilterControl.value || 'All';

    return this.appraisals().filter(appraisal => {
      const matchesSearch = search === '' || 
        this.getTypeName(appraisal.appraisal_type_id).toLowerCase().includes(search);
      
      const matchesType = typeFilter === 'all' || 
        appraisal.appraisal_type_id.toString() === typeFilter;
      
      const matchesStatus = statusFilter === 'All' || 
        (statusFilter === 'Active' && ['Submitted', 'Appraisee Self Assessment'].includes(appraisal.status)) ||
        (statusFilter === 'Completed' && appraisal.status === 'Complete');

      return matchesSearch && matchesType && matchesStatus;
    }).sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());
  });

  totalPages = computed(() => 
    Math.max(1, Math.ceil(this.filteredAppraisals().length / this.ITEMS_PER_PAGE))
  );

  pagedAppraisals = computed(() => {
    const start = (this.currentPage() - 1) * this.ITEMS_PER_PAGE;
    const end = start + this.ITEMS_PER_PAGE;
    return this.filteredAppraisals().slice(start, end);
  });

  selectedAppraisal = computed(() => {
    const activeStatuses = ['Submitted', 'Appraisee Self Assessment'];
    const now = new Date();
    
    // Find upcoming active appraisals
    const upcomingActive = this.appraisals().filter(a => 
      activeStatuses.includes(a.status) && new Date(a.end_date) >= now
    );
    
    if (upcomingActive.length > 0) {
      return upcomingActive.sort((a, b) => 
        new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
      )[0];
    }
    
    // Fallback to most recent completed
    const completed = this.appraisals().filter(a => a.status === 'Complete');
    if (completed.length > 0) {
      return completed.sort((a, b) => 
        new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
      )[0];
    }
    
    return null;
  });

  completionPercentage = computed(() => {
    const selected = this.selectedAppraisal();
    if (!selected) return null;
    
    const details = this.appraisalDetails()[selected.appraisal_id];
    if (!details) return null;
    
    const goals = details.appraisal_goals || [];
    if (goals.length === 0) return 0;
    
    const totalWeight = goals.reduce((acc, g) => acc + (g.goal?.goal_weightage ?? 0), 0);
    if (totalWeight <= 0) return 0;
    
    const useAppraiser = ['Appraiser Evaluation', 'Reviewer Evaluation', 'Complete'].includes(selected.status);
    const completedWeight = goals.reduce((acc, g) => {
      const hasRating = useAppraiser ? g.appraiser_rating != null : 
        selected.status === 'Appraisee Self Assessment' ? g.self_rating != null : false;
      return acc + (hasRating ? g.goal?.goal_weightage ?? 0 : 0);
    }, 0);
    
    return Math.round((completedWeight / totalWeight) * 100);
  });

  ngOnInit(): void {
    this.loadAppraisalTypes();
    this.loadAppraisals();
    
    // Reset page when filters change
    this.searchControl.valueChanges.subscribe(() => this.currentPage.set(1));
    this.typeFilterControl.valueChanges.subscribe(() => this.currentPage.set(1));
    this.statusFilterControl.valueChanges.subscribe(() => this.currentPage.set(1));
  }

  private async loadAppraisalTypes(): Promise<void> {
    try {
      const types = await this.http.get<AppraisalType[]>(`${environment.apiUrl}/api/appraisal-types`).toPromise();
      this.appraisalTypes.set(types || []);
    } catch (error) {
      console.error('Failed to load appraisal types:', error);
    }
  }

  private async loadAppraisals(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      const appraisals = await this.http.get<Appraisal[]>(
        `${environment.apiUrl}/api/appraisals?appraisee_id=${user.emp_id}`
      ).toPromise();
      
      this.appraisals.set(appraisals || []);
      
      // Load details for selected appraisal
      const selected = this.selectedAppraisal();
      if (selected) {
        this.loadAppraisalDetails(selected.appraisal_id);
      }
    } catch (error: any) {
      this.error.set('Failed to load appraisals');
      console.error('Failed to load appraisals:', error);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadAppraisalDetails(appraisalId: number): Promise<void> {
    try {
      const details = await this.http.get<AppraisalWithGoals>(
        `${environment.apiUrl}/api/appraisals/${appraisalId}`
      ).toPromise();
      
      if (details) {
        this.appraisalDetails.update(current => ({
          ...current,
          [appraisalId]: details
        }));
      }
    } catch (error) {
      console.error('Failed to load appraisal details:', error);
    }
  }

  getTypeName(typeId: number): string {
    const type = this.appraisalTypes().find(t => t.id === typeId);
    return type?.name || `Type #${typeId}`;
  }

  formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  }

  getDisplayStatus(status: string): string {
    return status === 'Submitted' ? 'Waiting Acknowledgement' : status;
  }

  getStatusChipClass(status: string): string {
    if (status === 'Submitted') {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-blue-100 text-blue-800';
  }

  toggleFilters(): void {
    this.showFilters.update(current => !current);
  }

  previousPage(): void {
    this.currentPage.update(current => Math.max(1, current - 1));
  }

  nextPage(): void {
    this.currentPage.update(current => Math.min(this.totalPages(), current + 1));
  }

  async startSelfAssessment(appraisal: Appraisal): Promise<void> {
    try {
      // If status is Submitted, move to Self Assessment first
      if (appraisal.status === 'Submitted') {
        await this.http.put(
          `${environment.apiUrl}/api/appraisals/${appraisal.appraisal_id}/status`,
          { status: 'Appraisee Self Assessment' }
        ).toPromise();
      }
      
      this.router.navigate(['/appraisals', appraisal.appraisal_id, 'self-assessment']);
    } catch (error: any) {
      this.snackBar.open('Failed to start self assessment', 'Close', { duration: 3000 });
      console.error('Failed to start self assessment:', error);
    }
  }

  viewAppraisal(appraisal: Appraisal): void {
    this.router.navigate(['/appraisals', appraisal.appraisal_id, 'view']);
  }
}
