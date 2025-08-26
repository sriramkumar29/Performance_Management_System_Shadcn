import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../../environments/environment';

interface GoalTemplate {
  id: number;
  name: string;
  description: string;
  created_at: string;
  goals: TemplateGoal[];
}

interface TemplateGoal {
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

interface ImportTemplateData {
  appraisalId?: number;
  remainingWeightage: number;
}

interface ImportGoalsRequest {
  template_id: number;
  goal_ids: number[];
}

@Component({
  selector: 'app-import-from-template-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatCardModule,
    MatIconModule
  ],
  template: `
    <div class="p-6 max-w-2xl">
      <h2 class="text-xl font-semibold mb-4">Import Goals from Template</h2>
      
      <form [formGroup]="templateForm" class="space-y-4">
        <!-- Template Selection -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Select Template</mat-label>
          <mat-select formControlName="template_id" (selectionChange)="onTemplateChange($event.value)">
            <mat-option value="">Choose a template</mat-option>
            <mat-option *ngFor="let template of templates()" [value]="template.id">
              {{ template.name }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Template Description -->
        <div *ngIf="selectedTemplate()" class="p-3 bg-blue-50 rounded-md border border-blue-200">
          <p class="text-sm text-blue-800">{{ selectedTemplate()?.description }}</p>
        </div>

        <!-- Goals Selection -->
        <div *ngIf="selectedTemplate()?.goals?.length" class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-medium">Select Goals to Import</h3>
            <div class="text-sm text-muted-foreground">
              Selected: {{ selectedWeightage() }}% / Available: {{ data.remainingWeightage }}%
            </div>
          </div>

          <div class="max-h-96 overflow-y-auto space-y-2">
            <mat-card *ngFor="let goal of selectedTemplate()?.goals" class="p-4">
              <div class="flex items-start gap-3">
                <mat-checkbox 
                  [checked]="isGoalSelected(goal.goal_id)"
                  [disabled]="!canSelectGoal(goal)"
                  (change)="toggleGoalSelection(goal, $event.checked)">
                </mat-checkbox>
                
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <h4 class="font-medium text-sm">{{ goal.goal_title }}</h4>
                    <span class="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {{ goal.goal_weightage }}%
                    </span>
                    <span class="text-xs px-2 py-0.5 rounded-full" 
                          [ngClass]="getImportanceChipClass(goal.goal_importance)">
                      {{ goal.goal_importance }}
                    </span>
                  </div>
                  
                  <p *ngIf="goal.goal_description" class="text-xs text-muted-foreground mb-2">
                    {{ goal.goal_description }}
                  </p>
                  
                  <div *ngIf="goal.category" class="text-xs text-muted-foreground">
                    Category: {{ goal.category.name }}
                  </div>
                </div>
              </div>
            </mat-card>
          </div>

          <!-- Weightage Warning -->
          <div *ngIf="selectedWeightage() > data.remainingWeightage" 
               class="p-3 bg-red-50 rounded-md border border-red-200">
            <div class="flex items-center gap-2 text-red-800 text-sm">
              <mat-icon class="text-base">warning</mat-icon>
              <span>Selected goals exceed available weightage ({{ data.remainingWeightage }}%)</span>
            </div>
          </div>
        </div>

        <!-- No Goals Message -->
        <div *ngIf="selectedTemplate() && !selectedTemplate()?.goals?.length" 
             class="text-center py-8 text-muted-foreground">
          <mat-icon class="text-4xl mb-2">inbox</mat-icon>
          <p>This template has no goals to import</p>
        </div>
      </form>

      <!-- Actions -->
      <div class="flex justify-end gap-3 mt-6">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" 
                (click)="onImport()" 
                [disabled]="!canImport() || loading()">
          {{ loading() ? 'Importing...' : 'Import Selected Goals' }}
        </button>
      </div>
    </div>
  `
})
export class ImportFromTemplateModalComponent implements OnInit {
  templateForm: FormGroup;
  templates = signal<GoalTemplate[]>([]);
  selectedTemplate = signal<GoalTemplate | null>(null);
  selectedGoalIds = signal<Set<number>>(new Set());
  loading = signal(false);

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<ImportFromTemplateModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ImportTemplateData
  ) {
    this.templateForm = this.fb.group({
      template_id: ['']
    });
  }

  ngOnInit() {
    this.loadTemplates();
  }

  private async loadTemplates() {
    try {
      this.loading.set(true);
      const templates = await this.http.get<GoalTemplate[]>(`${environment.apiUrl}/api/goals/templates`).toPromise();
      this.templates.set(templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      this.snackBar.open('Error loading templates', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  onTemplateChange(templateId: number) {
    const template = this.templates().find(t => t.id === templateId);
    this.selectedTemplate.set(template || null);
    this.selectedGoalIds.set(new Set()); // Clear selections when template changes
  }

  isGoalSelected(goalId: number): boolean {
    return this.selectedGoalIds().has(goalId);
  }

  canSelectGoal(goal: TemplateGoal): boolean {
    const currentSelection = this.selectedGoalIds();
    const currentWeightage = this.selectedWeightage();
    
    if (currentSelection.has(goal.goal_id)) {
      return true; // Already selected, can deselect
    }
    
    return (currentWeightage + goal.goal_weightage) <= this.data.remainingWeightage;
  }

  toggleGoalSelection(goal: TemplateGoal, selected: boolean) {
    const currentSelection = new Set(this.selectedGoalIds());
    
    if (selected) {
      if (this.canSelectGoal(goal)) {
        currentSelection.add(goal.goal_id);
      }
    } else {
      currentSelection.delete(goal.goal_id);
    }
    
    this.selectedGoalIds.set(currentSelection);
  }

  selectedWeightage(): number {
    const template = this.selectedTemplate();
    if (!template) return 0;
    
    const selectedIds = this.selectedGoalIds();
    return template.goals
      .filter(goal => selectedIds.has(goal.goal_id))
      .reduce((sum, goal) => sum + goal.goal_weightage, 0);
  }

  canImport(): boolean {
    return this.selectedGoalIds().size > 0 && 
           this.selectedWeightage() <= this.data.remainingWeightage &&
           !!this.data.appraisalId;
  }

  getImportanceChipClass(importance: string): string {
    switch (importance) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return '';
    }
  }

  async onImport() {
    if (!this.canImport() || !this.selectedTemplate()) {
      return;
    }

    try {
      this.loading.set(true);
      
      const request: ImportGoalsRequest = {
        template_id: this.selectedTemplate()!.id,
        goal_ids: Array.from(this.selectedGoalIds())
      };

      const response = await this.http.post<any>(
        `${environment.apiUrl}/api/appraisals/${this.data.appraisalId}/goals/import`,
        request
      ).toPromise();

      this.snackBar.open(`${this.selectedGoalIds().size} goals imported successfully`, 'Close', { duration: 3000 });
      this.dialogRef.close(response);
    } catch (error) {
      console.error('Error importing goals:', error);
      this.snackBar.open('Error importing goals', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
