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
  temp_id: number;
  temp_title: string;
  temp_description: string;
  temp_performance_factor: string;
  temp_importance: 'High' | 'Medium' | 'Low';
  temp_weightage: number;
  categories: {
    id: number;
    name: string;
  }[];
}

interface ImportTemplateData {
  appraisalId?: number;
  remainingWeightage: number;
}

interface CreateGoalFromTemplateRequest {
  goal_title: string;
  goal_description: string;
  goal_performance_factor: string;
  goal_weightage: number;
  goal_importance: 'High' | 'Medium' | 'Low';
  category_id?: number;
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
            <mat-option *ngFor="let template of templates()" [value]="template.temp_id">
              {{ template.temp_title }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Category Selection (shown after template selection) -->
        <mat-form-field appearance="outline" class="w-full" *ngIf="selectedTemplate() && hasCategories()">
          <mat-label>Select Category</mat-label>
          <mat-select formControlName="category_id" (selectionChange)="onCategoryChange($event.value)">
            <mat-option value="">No Category</mat-option>
            <mat-option *ngFor="let category of getTemplateCategories()" [value]="category.id">
              {{ category.name }}
            </mat-option>
          </mat-select>
          <mat-hint>Choose a category for this goal (optional)</mat-hint>
        </mat-form-field>

        <!-- Template Description -->
        <div *ngIf="selectedTemplate()" class="p-3 bg-blue-50 rounded-md border border-blue-200">
          <p class="text-sm text-blue-800">{{ selectedTemplate()?.temp_description }}</p>
        </div>

        <!-- Template Preview -->
        <div *ngIf="selectedTemplate()" class="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h4 class="font-medium text-gray-900 mb-3">Template Preview</h4>
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-700">{{ selectedTemplate()!.temp_title }}</span>
              <span class="text-sm text-gray-500">{{ selectedTemplate()!.temp_weightage }}%</span>
            </div>
            <p class="text-sm text-gray-600">{{ selectedTemplate()!.temp_description }}</p>
            <div class="flex items-center gap-2">
              <span class="text-xs px-2 py-1 rounded-full" 
                    [class]="getImportanceChipClass(selectedTemplate()!.temp_importance)">
                {{ selectedTemplate()!.temp_importance }}
              </span>
              <span class="text-xs text-gray-500">
                Categories: {{ getCategoriesText() }}
              </span>
            </div>
            
            <!-- Selected Category Display -->
            <div *ngIf="selectedCategoryId()" class="mt-2">
              <span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                Category: {{ getSelectedCategoryName() }}
              </span>
            </div>
            
            <!-- Template Selection Checkbox -->
            <div class="mt-3 pt-3 border-t border-gray-200">
              <label class="flex items-center">
                <input 
                  type="checkbox" 
                  [checked]="isTemplateSelected()" 
                  [disabled]="!canSelectTemplate()"
                  (change)="toggleTemplateSelection($any($event.target).checked)"
                  class="mr-2">
                <span class="text-sm text-gray-700">
                  Import this template as a goal 
                  <span *ngIf="!canSelectTemplate()" class="text-red-500">
                    (Exceeds remaining weightage: {{ data.remainingWeightage }}%)
                  </span>
                </span>
              </label>
            </div>
          </div>
        </div>
      </form>

      <!-- Actions -->
      <div class="flex justify-end gap-3 mt-6">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" 
                (click)="onImport()" 
                [disabled]="!canImport() || loading()">
          {{ loading() ? 'Importing...' : 'Import Template as Goal' }}
        </button>
      </div>
    </div>
  `
})
export class ImportFromTemplateModalComponent implements OnInit {
  templateForm: FormGroup;
  templates = signal<GoalTemplate[]>([]);
  selectedTemplate = signal<GoalTemplate | null>(null);
  selectedCategoryId = signal<number | null>(null);
  templateSelected = signal<boolean>(false);
  loading = signal(false);

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<ImportFromTemplateModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ImportTemplateData
  ) {
    this.templateForm = this.fb.group({
      template_id: [''],
      category_id: ['']
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
    const template = this.templates().find(t => t.temp_id === templateId);
    this.selectedTemplate.set(template || null);
    this.selectedCategoryId.set(null); // Clear category selection when template changes
    this.templateSelected.set(false); // Clear selection when template changes
    
    // Reset category form control
    this.templateForm.patchValue({ category_id: '' });
  }

  hasCategories(): boolean {
    const template = this.selectedTemplate();
    return !!(template?.categories?.length && template.categories.length > 0);
  }

  getTemplateCategories(): {id: number, name: string}[] {
    const template = this.selectedTemplate();
    return template?.categories || [];
  }

  onCategoryChange(categoryId: number | null) {
    this.selectedCategoryId.set(categoryId);
  }

  getSelectedCategoryName(): string {
    const template = this.selectedTemplate();
    const categoryId = this.selectedCategoryId();
    if (!template || !categoryId) return '';
    
    const category = template.categories?.find(c => c.id === categoryId);
    return category?.name || '';
  }

  isTemplateSelected(): boolean {
    return this.templateSelected();
  }

  canSelectTemplate(): boolean {
    const template = this.selectedTemplate();
    if (!template) return false;
    
    return template.temp_weightage <= this.data.remainingWeightage;
  }

  toggleTemplateSelection(selected: boolean) {
    if (selected && this.canSelectTemplate()) {
      this.templateSelected.set(true);
    } else {
      this.templateSelected.set(false);
    }
  }

  canImport(): boolean {
    return this.templateSelected() && 
           this.canSelectTemplate() &&
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

  getCategoriesText(): string {
    const template = this.selectedTemplate();
    if (!template?.categories?.length) {
      return 'None';
    }
    return template.categories.map(c => c.name).join(', ');
  }

  async onImport() {
    if (!this.canImport() || !this.selectedTemplate()) {
      return;
    }

    try {
      this.loading.set(true);
      
      const template = this.selectedTemplate()!;
      const request: CreateGoalFromTemplateRequest = {
        goal_title: template.temp_title,
        goal_description: template.temp_description,
        goal_performance_factor: template.temp_performance_factor,
        goal_weightage: template.temp_weightage,
        goal_importance: template.temp_importance,
        category_id: this.selectedCategoryId() || undefined
      };

      // First create a goal from the template
      const goalResponse = await this.http.post<any>(
        `${environment.apiUrl}/api/goals`,
        request
      ).toPromise();

      // Then add the goal to the appraisal
      const response = await this.http.post<any>(
        `${environment.apiUrl}/api/appraisals/${this.data.appraisalId}/goals/${goalResponse.goal_id}`,
        {}
      ).toPromise();

      this.snackBar.open('Goal imported from template successfully', 'Close', { duration: 3000 });
      this.dialogRef.close(response);
    } catch (error) {
      console.error('Error importing goal from template:', error);
      this.snackBar.open('Error importing goal from template', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
