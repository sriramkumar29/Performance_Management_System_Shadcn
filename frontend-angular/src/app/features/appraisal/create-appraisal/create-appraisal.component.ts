import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatBadgeModule } from '@angular/material/badge';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { AddGoalModalComponent } from './add-goal-modal/add-goal-modal.component';
import { EditGoalModalComponent } from './edit-goal-modal/edit-goal-modal.component';
import { ImportFromTemplateModalComponent } from './import-from-template-modal/import-from-template-modal.component';

interface Employee {
  emp_id: number;
  emp_name: string;
  emp_email: string;
  emp_department: string;
  emp_roles: string;
  emp_roles_level: number;
  emp_reporting_manager: number | null;
  emp_status: string;
}

interface AppraisalType {
  id: number;
  name: string;
  description: string;
  has_range: boolean;
  frequency_months: number;
  created_at: string;
  updated_at: string;
}

interface AppraisalTypeRange {
  id: number;
  appraisal_type_id: number;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

interface Goal {
  goal_id: number;
  goal_title: string;
  goal_description: string;
  goal_weightage: number;
  goal_importance: 'High' | 'Medium' | 'Low';
  category?: {
    id: number;
    name: string;
  };
}

interface GoalRecord {
  goal: Goal;
}

interface CreateAppraisalRequest {
  appraisee_id: number;
  reviewer_id: number;
  appraisal_type_id: number;
  appraisal_type_range_id?: number;
  period_start_date: string;
  period_end_date: string;
}

@Component({
  selector: 'app-create-appraisal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatChipsModule,
    MatBadgeModule
  ],
  template: `
    <div class="animate-fade-in space-y-6">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          {{ createdAppraisalId() ? 'Edit Appraisal' : 'Create Appraisal' }}
        </h1>
        <p class="text-muted-foreground text-sm sm:text-base">
          {{ createdAppraisalId() ? 'Modify appraisal details and goals' : 'Create a new performance appraisal for your team member' }}
        </p>
      </div>

      <!-- Basic Information Card -->
      <mat-card class="overflow-hidden">
        <mat-card-header>
          <mat-card-title class="text-base sm:text-lg">Basic Information</mat-card-title>
          <mat-card-subtitle class="text-sm sm:text-base">
            Select employee, reviewer, appraisal type and period.
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="p-6">
          <form [formGroup]="appraisalForm" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Employee Selection -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Employee</mat-label>
                <mat-select formControlName="appraisee_id" [disabled]="isLocked()">
                  <mat-option value="">Select employee</mat-option>
                  <mat-option *ngFor="let employee of employees()" [value]="employee.emp_id">
                    {{ employee.emp_name }} ({{ employee.emp_email }})
                  </mat-option>
                </mat-select>
                <mat-hint>The employee being appraised</mat-hint>
              </mat-form-field>

              <!-- Reviewer Selection -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Reviewer</mat-label>
                <mat-select formControlName="reviewer_id" [disabled]="isLocked()">
                  <mat-option value="">Select reviewer</mat-option>
                  <mat-option *ngFor="let reviewer of reviewers()" [value]="reviewer.emp_id">
                    {{ reviewer.emp_name }} ({{ reviewer.emp_email }})
                  </mat-option>
                </mat-select>
                <mat-hint>Manager or higher level employee for final review</mat-hint>
              </mat-form-field>

              <!-- Appraisal Type -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Appraisal Type</mat-label>
                <mat-select formControlName="appraisal_type_id" [disabled]="isLocked()" (selectionChange)="onAppraisalTypeChange($event.value)">
                  <mat-option value="">Select appraisal type</mat-option>
                  <mat-option *ngFor="let type of appraisalTypes()" [value]="type.id">
                    {{ type.name }}
                  </mat-option>
                </mat-select>
                <mat-hint>Type determines the evaluation framework</mat-hint>
              </mat-form-field>

              <!-- Range Selection (conditional) -->
              <mat-form-field appearance="outline" class="w-full" *ngIf="selectedAppraisalType()?.has_range">
                <mat-label>Range</mat-label>
                <mat-select formControlName="appraisal_type_range_id" [disabled]="isLocked()" (selectionChange)="onRangeChange($event.value)">
                  <mat-option value="">Select range</mat-option>
                  <mat-option *ngFor="let range of ranges()" [value]="range.id">
                    {{ range.name }}
                  </mat-option>
                </mat-select>
                <mat-hint>Range sets the exact start and end dates</mat-hint>
              </mat-form-field>

              <!-- Period Dates -->
              <div class="md:col-span-2">
                <div class="grid grid-cols-2 gap-3">
                  <mat-form-field appearance="outline">
                    <mat-label>Start Date</mat-label>
                    <input matInput type="date" formControlName="period_start_date" [disabled]="isLocked()">
                    <mat-hint>Appraisal period start</mat-hint>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>End Date</mat-label>
                    <input matInput type="date" formControlName="period_end_date" [disabled]="isLocked()">
                    <mat-hint>Appraisal period end</mat-hint>
                  </mat-form-field>
                </div>
                <p class="text-xs text-muted-foreground mt-2">
                  Automatically calculated from appraisal type and range. Click on dates to manually adjust if needed.
                </p>
              </div>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Goals Section -->
      <mat-card>
        <mat-card-header>
          <div class="flex items-center justify-between w-full">
            <div>
              <mat-card-title class="text-base sm:text-lg">Goals</mat-card-title>
              <mat-card-subtitle class="text-sm sm:text-base">
                Add goals, set importance and weightage. Total must be 100%.
              </mat-card-subtitle>
            </div>
            <div class="hidden sm:flex gap-2">
              <button mat-raised-button color="primary" (click)="openAddGoalModal()" [disabled]="!canAddGoals()">
                <mat-icon>add</mat-icon>
                Add Goal
              </button>
              <button mat-stroked-button (click)="openImportFromTemplateModal()" [disabled]="!canAddGoals()">
                <mat-icon>folder_open</mat-icon>
                Import from Templates
              </button>
            </div>
          </div>
        </mat-card-header>
        <mat-card-content>
          <div *ngIf="goals().length > 0; else noGoals">
            <!-- Progress Bar -->
            <div class="mb-3 flex items-center justify-between">
              <div class="flex items-center gap-2 text-sm">
                <span class="text-muted-foreground">Total weightage</span>
                <span class="font-medium">{{ totalWeightage() }}%</span>
              </div>
            </div>
            <mat-progress-bar mode="determinate" [value]="totalWeightage()" class="mb-4"></mat-progress-bar>
            
            <!-- Goals Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <mat-card *ngFor="let record of goals()" class="group relative overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
                <mat-card-header class="h-full p-4 pr-4 flex flex-col">
                  <!-- Weightage badge -->
                  <div class="absolute top-2 right-2 rounded-full bg-primary/10 text-primary text-xs font-medium px-2 py-0.5">
                    {{ record.goal.goal_weightage }}%
                  </div>

                  <!-- Header with icon and text -->
                  <div class="flex items-start gap-2">
                    <div class="p-2 rounded-md bg-primary/10 text-primary">
                      <mat-icon class="text-base">track_changes</mat-icon>
                    </div>
                    <div class="min-w-0 space-y-0.5">
                      <mat-card-title class="text-sm font-semibold truncate" [title]="record.goal.goal_title">
                        {{ record.goal.goal_title }}
                      </mat-card-title>
                      <mat-card-subtitle *ngIf="record.goal.goal_description" 
                        class="text-xs text-muted-foreground line-clamp-5 leading-snug" 
                        [title]="record.goal.goal_description">
                        {{ record.goal.goal_description }}
                      </mat-card-subtitle>
                    </div>
                  </div>

                  <!-- Spacer to push meta to bottom -->
                  <div class="flex-1"></div>

                  <!-- Meta row at bottom -->
                  <div class="pt-2 mt-auto flex flex-wrap items-center gap-2 text-xs">
                    <mat-chip-set *ngIf="record.goal.category?.name">
                      <mat-chip>{{ record.goal.category?.name }}</mat-chip>
                    </mat-chip-set>
                    <mat-chip-set>
                      <mat-chip [ngClass]="getImportanceChipClass(record.goal.goal_importance)">
                        {{ record.goal.goal_importance }}
                      </mat-chip>
                    </mat-chip-set>
                  </div>

                  <!-- Action buttons bottom-right -->
                  <div class="absolute bottom-2 right-2 flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button mat-icon-button [disabled]="isLocked()" (click)="editGoal(record)">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" [disabled]="isLocked()" (click)="removeGoal(record.goal.goal_id)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </mat-card-header>
              </mat-card>
            </div>
          </div>

          <!-- No Goals State -->
          <ng-template #noGoals>
            <div class="py-10 text-muted-foreground border border-dashed border-border rounded-lg">
              <div class="flex flex-col items-center">
                <div class="text-center">No goals added yet.</div>
                <div class="mt-4 space-y-1 text-sm">
                  <div class="flex items-center gap-2">
                    <mat-icon [class]="appraiseeSelected() ? 'text-green-600' : 'text-orange-600'" class="text-base">
                      {{ appraiseeSelected() ? 'check_circle' : 'warning' }}
                    </mat-icon>
                    <span>Employee selected</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <mat-icon [class]="reviewerSelected() ? 'text-green-600' : 'text-orange-600'" class="text-base">
                      {{ reviewerSelected() ? 'check_circle' : 'warning' }}
                    </mat-icon>
                    <span>Reviewer selected</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <mat-icon [class]="typeAndPeriodSelected() ? 'text-green-600' : 'text-orange-600'" class="text-base">
                      {{ typeAndPeriodSelected() ? 'check_circle' : 'warning' }}
                    </mat-icon>
                    <span>Appraisal type and period set</span>
                  </div>
                </div>
              </div>
              <div class="mt-4 flex items-center gap-2 flex-wrap justify-center">
                <button mat-raised-button color="primary" (click)="openAddGoalModal()" [disabled]="!canAddGoals()">
                  <mat-icon>add</mat-icon>
                  <span class="hidden sm:inline ml-2">Add Goal</span>
                </button>
                <button mat-stroked-button (click)="openImportFromTemplateModal()" [disabled]="!canAddGoals()">
                  <mat-icon>folder_open</mat-icon>
                  <span class="hidden sm:inline ml-2">Import from Templates</span>
                </button>
              </div>
            </div>
          </ng-template>
        </mat-card-content>
      </mat-card>

      <!-- Footer Actions -->
      <div class="mt-6 grid grid-cols-2 gap-3 items-center sm:flex sm:flex-row sm:items-center sm:justify-between">
        <div class="flex gap-3">
          <button mat-button (click)="handleCancel()" [disabled]="loading()">
            <mat-icon>close</mat-icon>
            <span class="hidden sm:inline ml-2">Cancel</span>
          </button>
          <button *ngIf="!createdAppraisalId()" mat-raised-button (click)="handleSubmit()" [disabled]="!canSaveDraft() || loading()">
            <mat-icon>save</mat-icon>
            <span class="hidden sm:inline ml-2">{{ loading() ? 'Saving...' : 'Save as Draft' }}</span>
          </button>
          <button *ngIf="createdAppraisalId() && createdAppraisalStatus() === 'Draft'" mat-raised-button (click)="handleSubmit()" [disabled]="!canSaveDraft() || loading()">
            <mat-icon>save</mat-icon>
            <span class="hidden sm:inline ml-2">{{ loading() ? 'Saving...' : 'Save Changes' }}</span>
          </button>
        </div>
        <div class="justify-self-end sm:self-auto">
          <button mat-raised-button color="primary" (click)="handleFinish()" [disabled]="!canSubmitForAck() || loading()">
            <mat-icon>send</mat-icon>
            <span class="hidden sm:inline ml-2">Submit for Acknowledgement</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './create-appraisal.component.scss'
})
export class CreateAppraisalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private authService = inject(AuthService);

  // Signals for reactive state
  employees = signal<Employee[]>([]);
  reviewers = signal<Employee[]>([]);
  appraisalTypes = signal<AppraisalType[]>([]);
  ranges = signal<AppraisalTypeRange[]>([]);
  goals = signal<GoalRecord[]>([]);
  loading = signal(false);
  createdAppraisalId = signal<number | null>(null);
  createdAppraisalStatus = signal<string | null>(null);

  // Form
  appraisalForm: FormGroup;

  // Computed values
  selectedAppraisalType = computed(() => {
    const typeId = this.appraisalForm?.get('appraisal_type_id')?.value;
    return this.appraisalTypes().find(t => t.id === typeId) || null;
  });

  totalWeightage = computed(() => {
    return this.goals().reduce((sum, record) => sum + record.goal.goal_weightage, 0);
  });

  appraiseeSelected = computed(() => {
    return !!this.appraisalForm?.get('appraisee_id')?.value;
  });

  reviewerSelected = computed(() => {
    return !!this.appraisalForm?.get('reviewer_id')?.value;
  });

  typeAndPeriodSelected = computed(() => {
    const form = this.appraisalForm;
    return !!(form?.get('appraisal_type_id')?.value && 
             form?.get('period_start_date')?.value && 
             form?.get('period_end_date')?.value);
  });

  canAddGoals = computed(() => {
    return this.appraiseeSelected() && this.reviewerSelected() && this.typeAndPeriodSelected();
  });

  canSaveDraft = computed(() => {
    return this.canAddGoals(); // Allow saving without goals initially
  });

  canSubmitForAck = computed(() => {
    return this.canSaveDraft() && this.totalWeightage() === 100;
  });

  isLocked = computed((): boolean => {
    const status = this.createdAppraisalStatus();
    return Boolean(status && status !== 'Draft');
  });

  constructor() {
    this.appraisalForm = this.fb.group({
      appraisee_id: ['', Validators.required],
      reviewer_id: ['', Validators.required],
      appraisal_type_id: ['', Validators.required],
      appraisal_type_range_id: [''],
      period_start_date: ['', Validators.required],
      period_end_date: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadInitialData();
    this.checkForExistingAppraisal();
  }

  private async loadInitialData() {
    try {
      this.loading.set(true);
      const [employeesRes, appraisalTypesRes] = await Promise.all([
        this.http.get<Employee[]>(`${environment.apiUrl}/employees`).toPromise(),
        this.http.get<AppraisalType[]>(`${environment.apiUrl}/appraisal-types`).toPromise()
      ]);

      this.employees.set(employeesRes || []);
      this.appraisalTypes.set(appraisalTypesRes || []);
      
      // Filter reviewers (managers and above)
      const reviewerList = (employeesRes || []).filter(emp => 
        emp.emp_roles_level >= 2 // Manager level or above
      );
      this.reviewers.set(reviewerList);
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.snackBar.open('Error loading data', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  private checkForExistingAppraisal() {
    const appraisalId = this.route.snapshot.queryParamMap.get('id');
    if (appraisalId) {
      this.loadExistingAppraisal(Number(appraisalId));
    }
  }

  private async loadExistingAppraisal(id: number) {
    try {
      this.loading.set(true);
      const appraisal = await this.http.get<any>(`${environment.apiUrl}/appraisals/${id}`).toPromise();
      
      if (appraisal) {
        this.createdAppraisalId.set(appraisal.appraisal_id);
        this.createdAppraisalStatus.set(appraisal.status);
        
        // Populate form
        this.appraisalForm.patchValue({
          appraisee_id: appraisal.appraisee_id,
          reviewer_id: appraisal.reviewer_id,
          appraisal_type_id: appraisal.appraisal_type_id,
          appraisal_type_range_id: appraisal.appraisal_type_range_id,
          period_start_date: appraisal.period_start_date,
          period_end_date: appraisal.period_end_date
        });
        
        // Load goals
        await this.loadGoals(id);
      }
    } catch (error) {
      console.error('Error loading existing appraisal:', error);
      this.snackBar.open('Error loading appraisal', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  private async loadGoals(appraisalId: number) {
    try {
      const goals = await this.http.get<GoalRecord[]>(`${environment.apiUrl}/appraisals/${appraisalId}/goals`).toPromise();
      this.goals.set(goals || []);
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  }

  onAppraisalTypeChange(typeId: number) {
    if (typeId) {
      this.loadRangesForType(typeId);
      this.calculatePeriodFromType(typeId);
    } else {
      this.ranges.set([]);
      this.appraisalForm.patchValue({
        appraisal_type_range_id: '',
        period_start_date: '',
        period_end_date: ''
      });
    }
  }

  onRangeChange(rangeId: number) {
    if (rangeId) {
      const range = this.ranges().find(r => r.id === rangeId);
      if (range) {
        this.appraisalForm.patchValue({
          period_start_date: range.start_date,
          period_end_date: range.end_date
        });
      }
    }
  }

  private async loadRangesForType(typeId: number) {
    try {
      const ranges = await this.http.get<AppraisalTypeRange[]>(`${environment.apiUrl}/appraisal-types/${typeId}/ranges`).toPromise();
      this.ranges.set(ranges || []);
    } catch (error) {
      console.error('Error loading ranges:', error);
    }
  }

  private calculatePeriodFromType(typeId: number) {
    const type = this.appraisalTypes().find(t => t.id === typeId);
    if (type && !type.has_range) {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + type.frequency_months);
      endDate.setDate(endDate.getDate() - 1);

      this.appraisalForm.patchValue({
        period_start_date: startDate.toISOString().split('T')[0],
        period_end_date: endDate.toISOString().split('T')[0]
      });
    }
  }

  getImportanceChipClass(importance: string): string {
    switch (importance) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return '';
    }
  }

  async openAddGoalModal() {
    if (!this.canAddGoals()) {
      return;
    }

    // Auto-save appraisal if not already saved
    if (!this.createdAppraisalId()) {
      await this.handleSubmit();
      if (!this.createdAppraisalId()) {
        return; // Save failed
      }
    }

    const dialogRef = this.dialog.open(AddGoalModalComponent, {
      width: '500px',
      data: {
        appraisalId: this.createdAppraisalId(),
        remainingWeightage: Math.max(0, 100 - this.totalWeightage())
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadGoals(this.createdAppraisalId()!);
      }
    });
  }

  async openImportFromTemplateModal() {
    if (!this.canAddGoals()) {
      return;
    }

    // Auto-save appraisal if not already saved
    if (!this.createdAppraisalId()) {
      await this.handleSubmit();
      if (!this.createdAppraisalId()) {
        return; // Save failed
      }
    }

    const dialogRef = this.dialog.open(ImportFromTemplateModalComponent, {
      width: '700px',
      maxHeight: '80vh',
      data: {
        appraisalId: this.createdAppraisalId(),
        remainingWeightage: Math.max(0, 100 - this.totalWeightage())
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadGoals(this.createdAppraisalId()!);
      }
    });
  }

  editGoal(record: GoalRecord) {
    const dialogRef = this.dialog.open(EditGoalModalComponent, {
      width: '500px',
      data: {
        goalData: record,
        remainingWeightage: Math.max(0, 100 - (this.totalWeightage() - record.goal.goal_weightage))
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadGoals(this.createdAppraisalId()!);
      }
    });
  }

  async removeGoal(goalId: number) {
    if (!confirm('Are you sure you want to remove this goal?')) {
      return;
    }

    try {
      await this.http.delete(`${environment.apiUrl}/goals/${goalId}`).toPromise();
      this.snackBar.open('Goal removed successfully', 'Close', { duration: 3000 });
      
      // Reload goals
      if (this.createdAppraisalId()) {
        await this.loadGoals(this.createdAppraisalId()!);
      }
    } catch (error) {
      console.error('Error removing goal:', error);
      this.snackBar.open('Error removing goal', 'Close', { duration: 3000 });
    }
  }

  async handleSubmit() {
    if (!this.appraisalForm.valid || !this.canSaveDraft()) {
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    try {
      this.loading.set(true);
      const formValue = this.appraisalForm.value;
      
      const request: CreateAppraisalRequest = {
        appraisee_id: formValue.appraisee_id,
        reviewer_id: formValue.reviewer_id,
        appraisal_type_id: formValue.appraisal_type_id,
        appraisal_type_range_id: formValue.appraisal_type_range_id || undefined,
        period_start_date: formValue.period_start_date,
        period_end_date: formValue.period_end_date
      };

      let response;
      if (this.createdAppraisalId()) {
        // Update existing appraisal
        response = await this.http.put<any>(`${environment.apiUrl}/appraisals/${this.createdAppraisalId()}`, request).toPromise();
      } else {
        // Create new appraisal
        response = await this.http.post<any>(`${environment.apiUrl}/appraisals`, request).toPromise();
        if (response?.appraisal_id) {
          this.createdAppraisalId.set(response.appraisal_id);
          this.createdAppraisalStatus.set('Draft');
        }
      }

      this.snackBar.open('Appraisal saved successfully', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error saving appraisal:', error);
      this.snackBar.open('Error saving appraisal', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  async handleFinish() {
    if (!this.canSubmitForAck()) {
      this.snackBar.open('Please ensure all fields are filled and total weightage is 100%', 'Close', { duration: 3000 });
      return;
    }

    try {
      this.loading.set(true);
      
      // First save the appraisal if not already saved
      if (!this.createdAppraisalId()) {
        await this.handleSubmit();
      }

      // Then submit for acknowledgement
      if (this.createdAppraisalId()) {
        await this.http.put<any>(`${environment.apiUrl}/appraisals/${this.createdAppraisalId()}/status`, {
          status: 'Submitted'
        }).toPromise();

        this.createdAppraisalStatus.set('Submitted');
        this.snackBar.open('Appraisal submitted for acknowledgement', 'Close', { duration: 3000 });
        
        // Navigate back to team appraisals
        this.router.navigate(['/appraisals/team-appraisals']);
      }
    } catch (error) {
      console.error('Error submitting appraisal:', error);
      this.snackBar.open('Error submitting appraisal', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  handleCancel() {
    this.router.navigate(['/appraisals/team-appraisals']);
  }
}
