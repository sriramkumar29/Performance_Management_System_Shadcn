import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
  appraisee_id: number;
  appraiser_id: number;
  reviewer_id: number;
  appraisal_type_id: number;
  appraisal_type_range_id?: number | null;
  start_date: string;
  end_date: string;
  status: string;
}

interface Employee {
  emp_id: number;
  emp_name: string;
  emp_roles?: string;
  emp_reporting_manager_id?: number | null;
}

interface AppraisalType {
  id: number;
  name: string;
}

@Component({
  selector: 'app-team-appraisals',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
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
            <mat-card-title class="text-sm font-medium flex items-center gap-2">
              <mat-icon class="text-primary">group</mat-icon>
              Team Members
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="text-xl sm:text-2xl font-bold text-foreground">
              {{ directReportsCount() }}
            </div>
            <p class="text-xs text-muted-foreground">
              Employees reporting to you
            </p>
          </mat-card-content>
        </mat-card>

        <mat-card class="transition-all duration-200 hover:shadow-md">
          <mat-card-header class="pb-2">
            <mat-card-title class="text-sm font-medium flex items-center gap-2">
              <mat-icon class="text-primary">edit</mat-icon>
              Drafts
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="text-xl sm:text-2xl font-bold text-foreground">
              {{ drafts().length }}
            </div>
            <p class="text-xs text-muted-foreground">Editable appraisals</p>
          </mat-card-content>
        </mat-card>

        <mat-card class="transition-all duration-200 hover:shadow-md">
          <mat-card-header class="pb-2">
            <mat-card-title class="text-sm font-medium flex items-center gap-2">
              <mat-icon class="text-primary">trending_up</mat-icon>
              Active
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="text-xl sm:text-2xl font-bold text-foreground">
              {{ activeAppraisals().length }}
            </div>
            <p class="text-xs text-muted-foreground">In progress</p>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Sections Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Draft Appraisals -->
        <mat-card class="transition-all duration-200 hover:shadow-md lg:col-span-1">
          <mat-card-header>
            <div class="flex items-center justify-between gap-2 w-full">
              <mat-card-title class="text-base sm:text-lg font-semibold flex items-center gap-2">
                <mat-icon class="text-primary">edit</mat-icon>
                Drafts
              </mat-card-title>
              @if (drafts().length > 0) {
                <div class="flex items-center gap-1">
                  <button mat-icon-button [disabled]="draftsPage() <= 1" (click)="previousDraftsPage()">
                    <mat-icon>chevron_left</mat-icon>
                  </button>
                  <span class="text-xs px-2">{{ draftsPage() }} / {{ draftsTotalPages() }}</span>
                  <button mat-icon-button [disabled]="draftsPage() >= draftsTotalPages()" (click)="nextDraftsPage()">
                    <mat-icon>chevron_right</mat-icon>
                  </button>
                </div>
              }
            </div>
          </mat-card-header>
          <mat-card-content>
            @if (loading()) {
              <div class="space-y-4">
                @for (i of [1,2,3]; track i) {
                  <div class="animate-pulse bg-muted rounded-lg h-16"></div>
                }
              </div>
            } @else {
              <div class="space-y-3">
                @if (drafts().length === 0) {
                  <div class="text-center py-8 text-muted-foreground">
                    <mat-icon class="text-6xl mb-4">edit</mat-icon>
                    <p>No drafts</p>
                  </div>
                } @else {
                  @for (appraisal of pagedDrafts(); track appraisal.appraisal_id) {
                    <div class="rounded-lg border border-gray-200 bg-white p-3 sm:p-4 text-sm transition-all duration-200 hover:shadow-sm">
                      <div class="flex items-start justify-between gap-3">
                        <div class="flex items-center gap-3 min-w-0">
                          <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <mat-icon class="text-primary text-sm">person</mat-icon>
                          </div>
                          <div class="space-y-1 min-w-0">
                            <div class="font-medium text-foreground truncate">
                              {{ getEmployeeName(appraisal.appraisee_id) }} • {{ getTypeName(appraisal.appraisal_type_id) }}
                            </div>
                            <div class="text-sm text-muted-foreground flex items-center gap-1">
                              <mat-icon class="text-xs">calendar_today</mat-icon>
                              {{ formatDate(appraisal.start_date) }} – {{ formatDate(appraisal.end_date) }}
                            </div>
                            <mat-chip class="bg-orange-100 text-orange-800">Draft</mat-chip>
                          </div>
                        </div>
                        <button mat-stroked-button color="primary" (click)="editDraft(appraisal.appraisal_id)">
                          <mat-icon>edit</mat-icon>
                          <span class="hidden sm:inline sm:ml-2">Edit</span>
                        </button>
                      </div>
                    </div>
                  }
                }
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Team Appraisals -->
        <mat-card class="transition-all duration-200 hover:shadow-md lg:col-span-2">
          <mat-card-header>
            <div class="flex items-center justify-between gap-2 w-full">
              <mat-card-title class="text-base sm:text-lg font-semibold flex items-center gap-2">
                <mat-icon class="text-primary">trending_up</mat-icon>
                Team Appraisals
              </mat-card-title>
              <div class="flex items-center gap-2">
                <button mat-icon-button (click)="toggleFilters()" [attr.aria-expanded]="showFilters()">
                  <mat-icon>filter_list</mat-icon>
                </button>
                @if (filteredTeamAppraisals().length > 0) {
                  <div class="flex items-center gap-1">
                    <button mat-icon-button [disabled]="teamPage() <= 1" (click)="previousTeamPage()">
                      <mat-icon>chevron_left</mat-icon>
                    </button>
                    <span class="text-xs px-2">{{ teamPage() }} / {{ teamTotalPages() }}</span>
                    <button mat-icon-button [disabled]="teamPage() >= teamTotalPages()" (click)="nextTeamPage()">
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
                    <mat-label>Search Employee</mat-label>
                    <input matInput [formControl]="searchNameControl" placeholder="Search employee name">
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

            @if (loading()) {
              <div class="space-y-4">
                @for (i of [1,2,3]; track i) {
                  <div class="animate-pulse bg-muted rounded-lg h-16"></div>
                }
              </div>
            } @else {
              <div class="space-y-3">
                @if (pagedTeamAppraisals().length === 0) {
                  <div class="text-center py-8 text-muted-foreground">
                    <mat-icon class="text-6xl mb-4">trending_up</mat-icon>
                    <p>No team appraisals found</p>
                  </div>
                } @else {
                  @for (appraisal of pagedTeamAppraisals(); track appraisal.appraisal_id) {
                    <div class="rounded-lg border border-gray-200 bg-white p-3 sm:p-4 text-sm transition-all duration-200 hover:shadow-sm">
                      <div class="flex items-start justify-between gap-3">
                        <div class="flex items-center gap-3 min-w-0">
                          <div class="w-8 h-8 rounded-full flex items-center justify-center" 
                               [class]="appraisal.status === 'Complete' ? 'bg-muted text-foreground' : 'bg-primary/10 text-primary'">
                            <mat-icon class="text-sm">person</mat-icon>
                          </div>
                          <div class="space-y-1 min-w-0">
                            <div class="font-medium text-foreground truncate">
                              {{ getEmployeeName(appraisal.appraisee_id) }} • {{ getTypeName(appraisal.appraisal_type_id) }}
                            </div>
                            <div class="text-sm text-muted-foreground flex items-center gap-1">
                              <mat-icon class="text-xs">calendar_today</mat-icon>
                              {{ formatDate(appraisal.start_date) }} – {{ formatDate(appraisal.end_date) }}
                            </div>
                            @if (appraisal.status === 'Complete') {
                              <mat-chip class="bg-green-100 text-green-800">Completed</mat-chip>
                            } @else {
                              <mat-chip class="bg-blue-100 text-blue-800">
                                {{ getDisplayStatus(appraisal.status) }}
                              </mat-chip>
                            }
                          </div>
                        </div>
                        <div class="flex items-center gap-3">
                          @if (appraisal.status === 'Appraiser Evaluation') {
                            <button mat-raised-button color="primary" (click)="evaluateAppraisal(appraisal.appraisal_id)">
                              <mat-icon>arrow_forward</mat-icon>
                              <span class="hidden sm:inline sm:ml-2">Evaluate</span>
                            </button>
                          }
                          @if (appraisal.status === 'Reviewer Evaluation' && appraisal.reviewer_id === currentUser?.emp_id) {
                            <button mat-raised-button color="primary" (click)="reviewAppraisal(appraisal.appraisal_id)">
                              <mat-icon>arrow_forward</mat-icon>
                              <span class="hidden sm:inline sm:ml-2">Review</span>
                            </button>
                          }
                          @if (appraisal.status === 'Complete') {
                            <button mat-stroked-button color="primary" (click)="viewAppraisal(appraisal.appraisal_id)">
                              <mat-icon>arrow_forward</mat-icon>
                              <span class="hidden sm:inline sm:ml-2">View</span>
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
    </div>
  `,
  styleUrl: './team-appraisals.component.scss'
})
export class TeamAppraisalsComponent implements OnInit {
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  // Signals for reactive state management
  appraisals = signal<Appraisal[]>([]);
  employees = signal<Employee[]>([]);
  appraisalTypes = signal<AppraisalType[]>([]);
  loading = signal(false);
  showFilters = signal(false);
  draftsPage = signal(1);
  teamPage = signal(1);

  // Form controls
  searchNameControl = new FormControl('');
  typeFilterControl = new FormControl('all');
  statusFilterControl = new FormControl('Active');

  private readonly ITEMS_PER_PAGE = 5;

  // Get current user
  currentUser = this.authService.getCurrentUser();

  // Computed values
  directReportsCount = computed(() => 
    this.employees().filter(e => 
      e.emp_reporting_manager_id === this.currentUser?.emp_id
    ).length
  );

  drafts = computed(() => 
    this.appraisals().filter(a => 
      a.status === 'Draft' && a.appraiser_id === this.currentUser?.emp_id
    )
  );

  activeAppraisals = computed(() => {
    const appraiserActiveStatuses = ['Submitted', 'Appraisee Self Assessment', 'Appraiser Evaluation'];
    const activeAsAppraiser = this.appraisals().filter(a => 
      a.appraiser_id === this.currentUser?.emp_id && 
      appraiserActiveStatuses.includes(a.status)
    );
    const activeAsReviewer = this.appraisals().filter(a => 
      a.reviewer_id === this.currentUser?.emp_id && 
      a.status === 'Reviewer Evaluation'
    );
    return [...activeAsAppraiser, ...activeAsReviewer];
  });

  completedAppraisals = computed(() => 
    this.appraisals().filter(a => 
      a.status === 'Complete' && 
      (a.appraiser_id === this.currentUser?.emp_id || a.reviewer_id === this.currentUser?.emp_id)
    )
  );

  combinedTeamAppraisals = computed(() => 
    [...this.activeAppraisals(), ...this.completedAppraisals()]
      .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())
  );

  filteredTeamAppraisals = computed(() => {
    const statusFilter = this.statusFilterControl.value || 'Active';
    const searchName = this.searchNameControl.value?.toLowerCase() || '';
    const typeFilter = this.typeFilterControl.value || 'all';

    let baseList: Appraisal[];
    switch (statusFilter) {
      case 'Active':
        baseList = this.activeAppraisals();
        break;
      case 'Completed':
        baseList = this.completedAppraisals();
        break;
      default:
        baseList = this.combinedTeamAppraisals();
    }

    return baseList.filter(a => {
      const matchesName = searchName === '' || 
        this.getEmployeeName(a.appraisee_id).toLowerCase().includes(searchName);
      const matchesType = typeFilter === 'all' || 
        a.appraisal_type_id.toString() === typeFilter;
      return matchesName && matchesType;
    });
  });

  // Pagination
  draftsTotalPages = computed(() => 
    Math.max(1, Math.ceil(this.drafts().length / this.ITEMS_PER_PAGE))
  );

  teamTotalPages = computed(() => 
    Math.max(1, Math.ceil(this.filteredTeamAppraisals().length / this.ITEMS_PER_PAGE))
  );

  pagedDrafts = computed(() => {
    const start = (this.draftsPage() - 1) * this.ITEMS_PER_PAGE;
    const end = start + this.ITEMS_PER_PAGE;
    return this.drafts().slice(start, end);
  });

  pagedTeamAppraisals = computed(() => {
    const start = (this.teamPage() - 1) * this.ITEMS_PER_PAGE;
    const end = start + this.ITEMS_PER_PAGE;
    return this.filteredTeamAppraisals().slice(start, end);
  });

  ngOnInit(): void {
    this.loadData();
    
    // Reset pages when filters change
    this.searchNameControl.valueChanges.subscribe(() => this.teamPage.set(1));
    this.typeFilterControl.valueChanges.subscribe(() => this.teamPage.set(1));
    this.statusFilterControl.valueChanges.subscribe(() => this.teamPage.set(1));
  }

  private async loadData(): Promise<void> {
    if (!this.currentUser?.emp_id) return;

    this.loading.set(true);

    try {
      const [appraiserAppraisals, reviewerActiveAppraisals, reviewerCompletedAppraisals, employees, types] = await Promise.all([
        this.http.get<Appraisal[]>(`${environment.apiUrl}/api/appraisals?appraiser_id=${this.currentUser.emp_id}`).toPromise(),
        this.http.get<Appraisal[]>(`${environment.apiUrl}/api/appraisals?reviewer_id=${this.currentUser.emp_id}&status=Reviewer Evaluation`).toPromise(),
        this.http.get<Appraisal[]>(`${environment.apiUrl}/api/appraisals?reviewer_id=${this.currentUser.emp_id}&status=Complete`).toPromise(),
        this.http.get<Employee[]>(`${environment.apiUrl}/api/employees`).toPromise(),
        this.http.get<AppraisalType[]>(`${environment.apiUrl}/api/appraisal-types`).toPromise()
      ]);

      // Combine and deduplicate appraisals
      const allAppraisals = [
        ...(appraiserAppraisals || []),
        ...(reviewerActiveAppraisals || []),
        ...(reviewerCompletedAppraisals || [])
      ];
      
      const uniqueAppraisals = Array.from(
        new Map(allAppraisals.map(a => [a.appraisal_id, a])).values()
      );

      this.appraisals.set(uniqueAppraisals);
      this.employees.set(employees || []);
      this.appraisalTypes.set(types || []);
    } catch (error) {
      console.error('Failed to load team appraisals data:', error);
      this.snackBar.open('Failed to load data', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  getEmployeeName(empId: number): string {
    const employee = this.employees().find(e => e.emp_id === empId);
    return employee?.emp_name || `Emp #${empId}`;
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

  toggleFilters(): void {
    this.showFilters.update(current => !current);
  }

  // Pagination methods
  previousDraftsPage(): void {
    this.draftsPage.update(current => Math.max(1, current - 1));
  }

  nextDraftsPage(): void {
    this.draftsPage.update(current => Math.min(this.draftsTotalPages(), current + 1));
  }

  previousTeamPage(): void {
    this.teamPage.update(current => Math.max(1, current - 1));
  }

  nextTeamPage(): void {
    this.teamPage.update(current => Math.min(this.teamTotalPages(), current + 1));
  }

  // Navigation methods
  editDraft(appraisalId: number): void {
    this.router.navigate(['/appraisals/create'], { queryParams: { id: appraisalId } });
  }

  evaluateAppraisal(appraisalId: number): void {
    this.router.navigate(['/appraisals', appraisalId, 'appraiser-evaluation']);
  }

  reviewAppraisal(appraisalId: number): void {
    this.router.navigate(['/appraisals', appraisalId, 'reviewer-evaluation']);
  }

  viewAppraisal(appraisalId: number): void {
    this.router.navigate(['/appraisals', appraisalId, 'view']);
  }
}
