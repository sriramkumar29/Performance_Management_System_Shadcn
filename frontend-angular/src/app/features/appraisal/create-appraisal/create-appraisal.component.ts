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
    <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
      <div class="max-w-7xl mx-auto space-y-8">
        <!-- Enhanced Header with Progress Indicator -->
        <div class="relative">
          <div class="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl opacity-10"></div>
          <div class="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg border border-white/20">
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <mat-icon class="text-white">{{ createdAppraisalId() ? 'edit' : 'add_circle' }}</mat-icon>
                  </div>
                  <h1 class="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {{ createdAppraisalId() ? 'Edit Appraisal' : 'Create Appraisal' }}
                  </h1>
                </div>
                <p class="text-slate-600 text-sm sm:text-base">
                  {{ createdAppraisalId() ? 'Modify appraisal details and goals' : 'Create a new performance appraisal for your team member' }}
                </p>
              </div>
              
              <!-- Status Badge -->
              <div class="hidden sm:block">
                <div class="px-4 py-2 rounded-full text-sm font-medium" 
                     [ngClass]="{
                       'bg-amber-100 text-amber-800 border border-amber-200': createdAppraisalStatus() === 'Draft',
                       'bg-blue-100 text-blue-800 border border-blue-200': createdAppraisalStatus() === 'Submitted',
                       'bg-green-100 text-green-800 border border-green-200': createdAppraisalStatus() === 'Complete'
                     }">
                  <mat-icon class="text-xs mr-1">{{ getStatusIcon() }}</mat-icon>
                  {{ createdAppraisalStatus() || 'New' }}
                </div>
              </div>
            </div>
            
            <!-- Progress Bar -->
            <div class="mt-6">
              <div class="flex justify-between text-xs text-slate-600 mb-2">
                <span>Progress</span>
                <span>{{ getCompletionPercentage() }}%</span>
              </div>
              <div class="w-full bg-slate-200 rounded-full h-2">
                <div class="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                     [style.width.%]="getCompletionPercentage()"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Enhanced Basic Information Card -->
        <div class="relative">
          <div class="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl opacity-5"></div>
          <mat-card class="relative overflow-hidden border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <mat-card-header class="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                  <mat-icon class="text-white text-sm">person</mat-icon>
                </div>
                <div>
                  <mat-card-title class="text-lg font-semibold text-slate-800">Basic Information</mat-card-title>
                  <mat-card-subtitle class="text-sm text-slate-600">
                    Select employee, reviewer, appraisal type and period.
                  </mat-card-subtitle>
                </div>
              </div>
            </mat-card-header>
            <mat-card-content class="p-8">
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
        </div>

        <!-- Enhanced Goals Section -->
        <div class="relative">
          <div class="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl opacity-5"></div>
          <mat-card class="relative overflow-hidden border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <mat-card-header class="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
              <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <mat-icon class="text-white text-sm">track_changes</mat-icon>
                  </div>
                  <div>
                    <mat-card-title class="text-lg font-semibold text-slate-800">Goals</mat-card-title>
                    <mat-card-subtitle class="text-sm text-slate-600">
                      Add goals, set importance and weightage. Total must be 100%.
                    </mat-card-subtitle>
                  </div>
                </div>
                <div class="flex flex-col sm:flex-row gap-3 justify-center">
                  <button mat-raised-button color="primary" (click)="openAddGoalModal()" [disabled]="!canAddGoals()"
                          class="px-6 py-2 shadow-lg hover:shadow-xl transition-shadow">
                    <mat-icon>add</mat-icon>
                    Add Goal
                  </button>
                  <button mat-stroked-button (click)="openImportFromTemplateModal()" [disabled]="!canAddGoals()"
                          class="px-6 py-2 hover:shadow-lg transition-shadow">
                    <mat-icon>folder_open</mat-icon>
                    Import from Templates
                  </button>
                </div>
              </div>
            </mat-card-header>
            <mat-card-content class="p-8">
              <div *ngIf="goals().length > 0; else noGoals">
                <!-- Enhanced Progress Bar -->
                <div class="mb-6 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                      <mat-icon class="text-slate-600 text-sm">analytics</mat-icon>
                      <span class="text-sm font-medium text-slate-700">Total Weightage</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-lg font-bold" [ngClass]="{
                        'text-green-600': totalWeightage() === 100,
                        'text-amber-600': totalWeightage() > 0 && totalWeightage() < 100,
                        'text-red-600': totalWeightage() > 100,
                        'text-slate-400': totalWeightage() === 0
                      }">{{ totalWeightage() }}%</span>
                      <mat-icon class="text-sm" [ngClass]="{
                        'text-green-600': totalWeightage() === 100,
                        'text-amber-600': totalWeightage() > 0 && totalWeightage() < 100,
                        'text-red-600': totalWeightage() > 100,
                        'text-slate-400': totalWeightage() === 0
                      }">{{ getWeightageIcon() }}</mat-icon>
                    </div>
                  </div>
                  <div class="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div class="h-3 rounded-full transition-all duration-700 ease-out" 
                         [ngClass]="{
                           'bg-gradient-to-r from-green-500 to-emerald-500': totalWeightage() === 100,
                           'bg-gradient-to-r from-amber-500 to-orange-500': totalWeightage() > 0 && totalWeightage() < 100,
                           'bg-gradient-to-r from-red-500 to-pink-500': totalWeightage() > 100,
                           'bg-gradient-to-r from-slate-300 to-slate-400': totalWeightage() === 0
                         }"
                         [style.width.%]="Math.min(totalWeightage(), 100)"></div>
                  </div>
                  <p class="text-xs text-slate-600 mt-2" *ngIf="totalWeightage() !== 100">
                    {{ totalWeightage() < 100 ? 'Add more goals to reach 100%' : 'Reduce weightage to 100%' }}
                  </p>
                </div>
            
                <!-- Enhanced Goals Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div *ngFor="let record of goals()" class="group relative">
                    <div class="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <mat-card class="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white/90 backdrop-blur-sm">
                      <mat-card-header class="p-6 flex flex-col h-full">
                        <!-- Enhanced Weightage badge -->
                        <div class="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold shadow-sm" 
                             [ngClass]="{
                               'bg-gradient-to-r from-green-500 to-emerald-500 text-white': record.goal.goal_importance === 'High',
                               'bg-gradient-to-r from-amber-500 to-orange-500 text-white': record.goal.goal_importance === 'Medium',
                               'bg-gradient-to-r from-blue-500 to-cyan-500 text-white': record.goal.goal_importance === 'Low'
                             }">
                          {{ record.goal.goal_weightage }}%
                        </div>

                        <!-- Enhanced Header with icon and text -->
                        <div class="flex items-start gap-3 mb-4">
                          <div class="p-3 rounded-xl shadow-sm" [ngClass]="{
                            'bg-gradient-to-br from-green-100 to-emerald-100 text-green-700': record.goal.goal_importance === 'High',
                            'bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700': record.goal.goal_importance === 'Medium',
                            'bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-700': record.goal.goal_importance === 'Low'
                          }">
                            <mat-icon class="text-lg">{{ getGoalIcon(record.goal.goal_importance) }}</mat-icon>
                          </div>
                          <div class="min-w-0 flex-1">
                            <mat-card-title class="text-base font-bold text-slate-800 mb-2 line-clamp-2" [title]="record.goal.goal_title">
                              {{ record.goal.goal_title }}
                            </mat-card-title>
                            <mat-card-subtitle *ngIf="record.goal.goal_description" 
                              class="text-sm text-slate-600 line-clamp-3 leading-relaxed" 
                              [title]="record.goal.goal_description">
                              {{ record.goal.goal_description }}
                            </mat-card-subtitle>
                          </div>
                        </div>

                        <!-- Spacer to push meta to bottom -->
                        <div class="flex-1"></div>

                        <!-- Enhanced Meta row at bottom -->
                        <div class="mt-auto space-y-3">
                          <div class="flex flex-wrap gap-2">
                            <div *ngIf="record.goal.category?.name" 
                                 class="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                              <mat-icon class="text-xs mr-1">category</mat-icon>
                              {{ record.goal.category?.name }}
                            </div>
                            <div class="px-3 py-1 rounded-full text-xs font-bold" 
                                 [ngClass]="{
                                   'bg-gradient-to-r from-red-100 to-pink-100 text-red-700': record.goal.goal_importance === 'High',
                                   'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700': record.goal.goal_importance === 'Medium',
                                   'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700': record.goal.goal_importance === 'Low'
                                 }">
                              {{ record.goal.goal_importance }} Priority
                            </div>
                          </div>
                        </div>

                        <!-- Enhanced Action buttons -->
                        <div class="absolute top-3 left-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <button mat-mini-fab color="primary" [disabled]="isLocked()" (click)="editGoal(record)"
                                  class="!w-8 !h-8 shadow-lg hover:shadow-xl transition-shadow">
                            <mat-icon class="text-sm">edit</mat-icon>
                          </button>
                          <button mat-mini-fab color="warn" [disabled]="isLocked()" (click)="removeGoal(record.goal.goal_id)"
                                  class="!w-8 !h-8 shadow-lg hover:shadow-xl transition-shadow">
                            <mat-icon class="text-sm">delete</mat-icon>
                          </button>
                        </div>
                      </mat-card-header>
                    </mat-card>
                  </div>
                </div>
              </div>

              <!-- Enhanced No Goals State -->
              <ng-template #noGoals>
                <div class="py-16 text-center">
                  <div class="relative">
                    <div class="absolute inset-0 bg-gradient-to-r from-slate-100 to-slate-200 rounded-2xl opacity-50"></div>
                    <div class="relative p-8 border-2 border-dashed border-slate-300 rounded-2xl bg-white/80 backdrop-blur-sm">
                      <div class="w-16 h-16 bg-gradient-to-r from-slate-400 to-slate-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <mat-icon class="text-white text-2xl">track_changes</mat-icon>
                      </div>
                      <h3 class="text-lg font-semibold text-slate-800 mb-2">No goals added yet</h3>
                      <p class="text-slate-600 mb-6">Add goals to start building the appraisal</p>
                      <!-- Enhanced Checklist -->
                      <div class="space-y-3 mb-6">
                        <div class="flex items-center justify-center gap-3 p-3 rounded-lg" [ngClass]="{
                          'bg-green-50 border border-green-200': appraiseeSelected(),
                          'bg-amber-50 border border-amber-200': !appraiseeSelected()
                        }">
                          <mat-icon [class]="appraiseeSelected() ? 'text-green-600' : 'text-amber-600'" class="text-lg">
                            {{ appraiseeSelected() ? 'check_circle' : 'warning' }}
                          </mat-icon>
                          <span class="font-medium" [class]="appraiseeSelected() ? 'text-green-800' : 'text-amber-800'">Employee selected</span>
                        </div>
                        <div class="flex items-center justify-center gap-3 p-3 rounded-lg" [ngClass]="{
                          'bg-green-50 border border-green-200': reviewerSelected(),
                          'bg-amber-50 border border-amber-200': !reviewerSelected()
                        }">
                          <mat-icon [class]="reviewerSelected() ? 'text-green-600' : 'text-amber-600'" class="text-lg">
                            {{ reviewerSelected() ? 'check_circle' : 'warning' }}
                          </mat-icon>
                          <span class="font-medium" [class]="reviewerSelected() ? 'text-green-800' : 'text-amber-800'">Reviewer selected</span>
                        </div>
                        <div class="flex items-center justify-center gap-3 p-3 rounded-lg" [ngClass]="{
                          'bg-green-50 border border-green-200': typeAndPeriodSelected(),
                          'bg-amber-50 border border-amber-200': !typeAndPeriodSelected()
                        }">
                          <mat-icon [class]="typeAndPeriodSelected() ? 'text-green-600' : 'text-amber-600'" class="text-lg">
                            {{ typeAndPeriodSelected() ? 'check_circle' : 'warning' }}
                          </mat-icon>
                          <span class="font-medium" [class]="typeAndPeriodSelected() ? 'text-green-800' : 'text-amber-800'">Appraisal type and period set</span>
                        </div>
                      </div>
                      
                      <!-- Enhanced Action Buttons -->
                      <div class="flex flex-col sm:flex-row gap-3 justify-center">
                        <button mat-raised-button color="primary" (click)="openAddGoalModal()" [disabled]="!canAddGoals()"
                                class="px-6 py-2 shadow-lg hover:shadow-xl transition-shadow">
                          <mat-icon>add</mat-icon>
                          Add Goal
                        </button>
                        <button mat-stroked-button (click)="openImportFromTemplateModal()" [disabled]="!canAddGoals()"
                                class="px-6 py-2 hover:shadow-lg transition-shadow">
                          <mat-icon>folder_open</mat-icon>
                          Import from Templates
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </ng-template>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Enhanced Action Buttons -->
        <div class="relative">
          <div class="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl opacity-5"></div>
          <div class="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
              <button mat-raised-button color="primary" [disabled]="!canSubmitForAck()" (click)="handleFinish()"
                      class="px-8 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <mat-icon class="mr-2">{{ createdAppraisalId() ? 'update' : 'send' }}</mat-icon>
                {{ createdAppraisalId() ? 'Update Appraisal' : 'Submit for Acknowledgement' }}
              </button>
              <button mat-stroked-button routerLink="/appraisals"
                      class="px-8 py-3 text-base font-medium hover:shadow-lg transition-all duration-300">
                <mat-icon class="mr-2">arrow_back</mat-icon>
                Back to Appraisals
              </button>
            </div>
          </div>
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
        this.http.get<Employee[]>(`${environment.apiUrl}/api/employees`).toPromise(),
        this.http.get<AppraisalType[]>(`${environment.apiUrl}/api/appraisal-types`).toPromise()
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
      const appraisal = await this.http.get<any>(`${environment.apiUrl}/api/appraisals/${id}`).toPromise();
      
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
      const goals = await this.http.get<GoalRecord[]>(`${environment.apiUrl}/api/appraisals/${appraisalId}/goals`).toPromise();
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
      const ranges = await this.http.get<AppraisalTypeRange[]>(`${environment.apiUrl}/api/appraisal-types/ranges?appraisal_type_id=${typeId}`).toPromise();
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
      case 'Low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  async removeGoal(goalId: number) {
    if (this.isLocked()) {
      return;
    }

    if (!confirm('Are you sure you want to remove this goal?')) {
      return;
    }

    try {
      await this.http.delete(`${environment.apiUrl}/api/goals/${goalId}`).toPromise();
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

  getStatusIcon(): string {
    const status = this.createdAppraisalStatus();
    switch (status) {
      case 'Draft': return 'edit';
      case 'Submitted': return 'send';
      case 'Complete': return 'check_circle';
      default: return 'fiber_new';
    }
  }

  getCompletionPercentage(): number {
    let percentage = 0;
    
    // Basic info completion (40%)
    if (this.appraiseeSelected()) percentage += 15;
    if (this.reviewerSelected()) percentage += 15;
    if (this.typeAndPeriodSelected()) percentage += 10;
    
    // Goals completion (60%)
    const goalCount = this.goals().length;
    if (goalCount > 0) percentage += 30;
    if (this.totalWeightage() === 100) percentage += 30;
    
    return Math.min(percentage, 100);
  }

  getWeightageIcon(): string {
    const total = this.totalWeightage();
    if (total === 100) return 'check_circle';
    if (total > 100) return 'error';
    if (total > 0) return 'warning';
    return 'radio_button_unchecked';
  }

  getGoalIcon(importance: string): string {
    switch (importance) {
      case 'High': return 'priority_high';
      case 'Medium': return 'remove';
      case 'Low': return 'keyboard_arrow_down';
      default: return 'track_changes';
    }
  }

  // Expose Math for template
  Math = Math;

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
        response = await this.http.put<any>(`${environment.apiUrl}/api/appraisals/${this.createdAppraisalId()}`, request).toPromise();
      } else {
        // Create new appraisal
        response = await this.http.post<any>(`${environment.apiUrl}/api/appraisals`, request).toPromise();
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
        await this.http.put<any>(`${environment.apiUrl}/api/appraisals/${this.createdAppraisalId()}/status`, {
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
