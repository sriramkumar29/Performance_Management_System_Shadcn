import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../../environments/environment';

interface GoalCategory {
  id: number;
  name: string;
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

interface EditGoalData {
  goalData: GoalRecord;
  remainingWeightage: number;
}

interface UpdateGoalRequest {
  goal_title: string;
  goal_description: string;
  goal_weightage: number;
  goal_importance: 'High' | 'Medium' | 'Low';
  goal_category_id?: number;
}

@Component({
  selector: 'app-edit-goal-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  template: `
    <div class="p-6">
      <h2 class="text-xl font-semibold mb-4">Edit Goal</h2>
      
      <form [formGroup]="goalForm" class="space-y-4">
        <!-- Goal Title -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Goal Title</mat-label>
          <input matInput formControlName="goal_title" placeholder="Enter goal title">
          <mat-error *ngIf="goalForm.get('goal_title')?.hasError('required')">
            Goal title is required
          </mat-error>
        </mat-form-field>

        <!-- Goal Description -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Goal Description</mat-label>
          <textarea matInput formControlName="goal_description" rows="3" placeholder="Enter goal description"></textarea>
        </mat-form-field>

        <!-- Goal Weightage -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Weightage (%)</mat-label>
          <input matInput type="number" formControlName="goal_weightage" 
                 [max]="maxWeightage" min="1" placeholder="Enter weightage">
          <mat-hint>Available: {{ data.remainingWeightage }}% (+ current {{ data.goalData.goal.goal_weightage }}%)</mat-hint>
          <mat-error *ngIf="goalForm.get('goal_weightage')?.hasError('required')">
            Weightage is required
          </mat-error>
          <mat-error *ngIf="goalForm.get('goal_weightage')?.hasError('min')">
            Weightage must be at least 1%
          </mat-error>
          <mat-error *ngIf="goalForm.get('goal_weightage')?.hasError('max')">
            Weightage cannot exceed {{ maxWeightage }}%
          </mat-error>
        </mat-form-field>

        <!-- Goal Importance -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Importance</mat-label>
          <mat-select formControlName="goal_importance">
            <mat-option value="High">High</mat-option>
            <mat-option value="Medium">Medium</mat-option>
            <mat-option value="Low">Low</mat-option>
          </mat-select>
          <mat-error *ngIf="goalForm.get('goal_importance')?.hasError('required')">
            Importance is required
          </mat-error>
        </mat-form-field>

        <!-- Goal Category -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Category (Optional)</mat-label>
          <mat-select formControlName="goal_category_id">
            <mat-option value="">No Category</mat-option>
            <mat-option *ngFor="let category of categories()" [value]="category.id">
              {{ category.name }}
            </mat-option>
          </mat-select>
        </mat-form-field>
      </form>

      <!-- Actions -->
      <div class="flex justify-end gap-3 mt-6">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" 
                (click)="onSave()" 
                [disabled]="!goalForm.valid || loading()">
          {{ loading() ? 'Updating...' : 'Update Goal' }}
        </button>
      </div>
    </div>
  `
})
export class EditGoalModalComponent implements OnInit {
  goalForm: FormGroup;
  categories = signal<GoalCategory[]>([]);
  loading = signal(false);
  maxWeightage: number;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<EditGoalModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditGoalData
  ) {
    this.maxWeightage = data.remainingWeightage + data.goalData.goal.goal_weightage;
    
    this.goalForm = this.fb.group({
      goal_title: [data.goalData.goal.goal_title, Validators.required],
      goal_description: [data.goalData.goal.goal_description],
      goal_weightage: [data.goalData.goal.goal_weightage, [Validators.required, Validators.min(1), Validators.max(this.maxWeightage)]],
      goal_importance: [data.goalData.goal.goal_importance, Validators.required],
      goal_category_id: [data.goalData.goal.category?.id || '']
    });
  }

  ngOnInit() {
    this.loadCategories();
  }

  private async loadCategories() {
    try {
      const categories = await this.http.get<GoalCategory[]>(`${environment.apiUrl}/goal-categories`).toPromise();
      this.categories.set(categories || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  async onSave() {
    if (!this.goalForm.valid) {
      return;
    }

    try {
      this.loading.set(true);
      const formValue = this.goalForm.value;
      
      const request: UpdateGoalRequest = {
        goal_title: formValue.goal_title,
        goal_description: formValue.goal_description,
        goal_weightage: Number(formValue.goal_weightage),
        goal_importance: formValue.goal_importance,
        goal_category_id: formValue.goal_category_id || undefined
      };

      const response = await this.http.put<any>(
        `${environment.apiUrl}/goals/${this.data.goalData.goal.goal_id}`,
        request
      ).toPromise();

      this.snackBar.open('Goal updated successfully', 'Close', { duration: 3000 });
      this.dialogRef.close(response);
    } catch (error) {
      console.error('Error updating goal:', error);
      this.snackBar.open('Error updating goal', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
