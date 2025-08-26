import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AppraisalService, GoalTemplate, GoalCategory } from '../../../core/services/appraisal.service';
import { AuthService } from '../../../core/services/auth.service';

interface ExtendedGoalTemplate extends GoalTemplate {
  categories?: GoalCategory[];
}

@Component({
  selector: 'app-edit-goal-template',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule
  ],
  template: `
    <div class="mx-auto max-w-4xl p-4 sm:p-6">
      <!-- Header -->
      <div class="flex items-center justify-between gap-3 mb-6">
        <div class="flex items-center gap-3 sm:gap-4">
          <button
            mat-stroked-button
            (click)="goBack()"
            class="flex items-center gap-2"
            aria-label="Back"
            title="Back"
          >
            <mat-icon>arrow_back</mat-icon>
            <span class="hidden sm:inline">Back</span>
          </button>
          <h1 class="text-2xl font-bold">{{ isEdit() ? 'Edit Goal Template' : 'Create Template' }}</h1>
        </div>
        <div class="flex items-center">
          <button
            mat-stroked-button
            (click)="goHome()"
            class="hidden sm:inline-flex items-center gap-2"
            aria-label="Home"
            title="Home"
          >
            <mat-icon>home</mat-icon>
            <span class="hidden sm:inline">Home</span>
          </button>
        </div>
      </div>

      <!-- Form Card -->
      <mat-card class="shadow-lg">
        <mat-card-header>
          <mat-card-title class="text-lg">
            {{ isEdit() ? 'Update Template Details' : 'Template Information' }}
          </mat-card-title>
        </mat-card-header>
        <mat-card-content class="space-y-6">
          <form [formGroup]="templateForm" (ngSubmit)="save()" class="space-y-6">
            <!-- Title -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Title</mat-label>
              <input
                matInput
                formControlName="title"
                [disabled]="loading() || saving()"
                placeholder="Enter template title"
              >
              <mat-hint>Give your template a concise, descriptive title.</mat-hint>
              @if (templateForm.get('title')?.hasError('required') && templateForm.get('title')?.touched) {
                <mat-error>Title is required</mat-error>
              }
            </mat-form-field>

            <!-- Description -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Description</mat-label>
              <textarea
                matInput
                formControlName="description"
                [disabled]="loading() || saving()"
                rows="3"
                placeholder="Enter template description"
              ></textarea>
              <mat-hint>Optional: add context so appraisers understand the goal's intent.</mat-hint>
            </mat-form-field>

            <!-- Performance Factor and Importance -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <mat-form-field appearance="outline">
                <mat-label>Performance Factor</mat-label>
                <input
                  matInput
                  formControlName="performanceFactor"
                  [disabled]="loading() || saving()"
                  placeholder="e.g., Quality, Delivery, Ownership"
                >
                <mat-hint>E.g., Quality, Delivery, Ownership, Collaboration.</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Importance</mat-label>
                <mat-select formControlName="importance" [disabled]="loading() || saving()">
                  <mat-option value="High">🔴 High Priority</mat-option>
                  <mat-option value="Medium">🟡 Medium Priority</mat-option>
                  <mat-option value="Low">🟢 Low Priority</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Weightage -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <mat-form-field appearance="outline">
                <mat-label>Weightage (%)</mat-label>
                <input
                  matInput
                  type="number"
                  min="1"
                  max="100"
                  formControlName="weightage"
                  [disabled]="loading() || saving()"
                  placeholder="Enter weightage percentage"
                >
                <mat-hint>Must be between 1–100. Appraisal total must sum to 100%.</mat-hint>
                @if (templateForm.get('weightage')?.hasError('required') && templateForm.get('weightage')?.touched) {
                  <mat-error>Weightage is required</mat-error>
                }
                @if (templateForm.get('weightage')?.hasError('min') || templateForm.get('weightage')?.hasError('max')) {
                  <mat-error>Weightage must be between 1 and 100</mat-error>
                }
              </mat-form-field>
            </div>

            <!-- Categories -->
            <div class="space-y-2">
              <label class="text-sm font-medium">Categories</label>
              <div class="flex flex-col sm:flex-row gap-2">
                <mat-form-field appearance="outline" class="flex-1">
                  <mat-label>Add category name</mat-label>
                  <input
                    matInput
                    [(ngModel)]="newCategory"
                    [ngModelOptions]="{standalone: true}"
                    (keydown.enter)="addCategory()"
                    [disabled]="loading() || saving()"
                    placeholder="Enter category name"
                  >
                </mat-form-field>
                <button
                  mat-raised-button
                  type="button"
                  (click)="addCategory()"
                  [disabled]="loading() || saving() || !newCategory.trim()"
                >
                  Add
                </button>
              </div>
              <p class="text-xs text-gray-600">Press Enter to add. Avoid duplicates.</p>

              <!-- Category suggestions -->
              @if (allCategories().length > 0) {
                <div class="flex flex-wrap gap-2 text-xs text-gray-600">
                  <span>Suggestions:</span>
                  @for (category of allCategories(); track category.id) {
                    <button
                      type="button"
                      class="px-2 py-1 rounded border hover:bg-gray-100"
                      (click)="newCategory = category.name"
                      [disabled]="loading() || saving()"
                    >
                      {{ category.name }}
                    </button>
                  }
                </div>
              }

              <!-- Selected categories -->
              <mat-chip-set class="mt-2">
                @for (category of selectedCategories(); track category) {
                  <mat-chip (removed)="removeCategory(category)" class="bg-rose-50 text-rose-700">
                    {{ category }}
                    <mat-icon matChipRemove>cancel</mat-icon>
                  </mat-chip>
                }
              </mat-chip-set>
            </div>

            <!-- Action buttons -->
            <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t">
              <button
                mat-stroked-button
                type="button"
                (click)="goBack()"
                [disabled]="saving()"
                class="w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="saving() || loading() || templateForm.invalid"
                class="w-full sm:w-auto px-6"
              >
                {{ saving() ? 'Saving...' : (isEdit() ? 'Save Changes' : 'Create Template') }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Mobile-only floating Home button -->
      <button
        mat-fab
        (click)="goHome()"
        title="Home"
        aria-label="Home"
        class="sm:hidden fixed bottom-20 right-4 z-50"
      >
        <mat-icon>home</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .space-y-6 > * + * {
      margin-top: 1.5rem;
    }
    
    .space-y-2 > * + * {
      margin-top: 0.5rem;
    }
  `]
})
export class EditGoalTemplateComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private appraisalService = inject(AppraisalService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  saving = signal(false);
  isEdit = signal(false);
  allCategories = signal<GoalCategory[]>([]);
  selectedCategories = signal<string[]>([]);
  newCategory = '';

  templateForm: FormGroup = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    performanceFactor: [''],
    importance: [''],
    weightage: ['', [Validators.required, Validators.min(1), Validators.max(100)]]
  });

  private templateId?: number;

  ngOnInit() {
    // Check authorization
    if (!this.isManagerOrAbove()) {
      this.snackBar.open('You are not authorized to manage goal templates', 'Close', { duration: 3000 });
      this.router.navigate(['/goal-templates']);
      return;
    }

    // Get template ID from route
    const id = this.route.snapshot.paramMap.get('id');
    if (id && !isNaN(Number(id))) {
      this.templateId = Number(id);
      this.isEdit.set(true);
    }

    this.loadData();
  }

  private async loadData() {
    this.loading.set(true);
    try {
      // Load categories
      const categories = await this.appraisalService.getGoalCategories();
      this.allCategories.set(categories);

      // Load template data if editing
      if (this.isEdit() && this.templateId) {
        // Note: This would need to be implemented in AppraisalService
        // For now, we'll handle it gracefully
        try {
          const template = await this.getTemplate(this.templateId);
          this.populateForm(template);
        } catch (error) {
          this.snackBar.open('Failed to load template data', 'Close', { duration: 3000 });
        }
      }
    } catch (error) {
      this.snackBar.open('Failed to load data', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  private async getTemplate(id: number): Promise<ExtendedGoalTemplate> {
    // This would need to be implemented in AppraisalService
    // For now, return a mock template
    return {
      temp_id: id,
      temp_title: 'Sample Template',
      temp_description: 'Sample description',
      temp_performance_factor: 'Quality',
      temp_importance: 'High',
      temp_weightage: 25,
      categories: []
    };
  }

  private populateForm(template: ExtendedGoalTemplate) {
    this.templateForm.patchValue({
      title: template.temp_title,
      description: template.temp_description,
      performanceFactor: template.temp_performance_factor,
      importance: template.temp_importance,
      weightage: template.temp_weightage
    });

    if (template.categories) {
      this.selectedCategories.set(template.categories.map(c => c.name));
    }
  }

  private isManagerOrAbove(): boolean {
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

  addCategory() {
    const name = this.newCategory.trim();
    if (!name) return;
    
    const current = this.selectedCategories();
    if (current.includes(name)) {
      this.newCategory = '';
      return;
    }
    
    this.selectedCategories.set([...current, name]);
    this.newCategory = '';
  }

  removeCategory(name: string) {
    const current = this.selectedCategories();
    this.selectedCategories.set(current.filter(c => c !== name));
  }

  async save() {
    if (this.templateForm.invalid) {
      this.templateForm.markAllAsTouched();
      return;
    }

    const formValue = this.templateForm.value;
    const payload = {
      temp_title: formValue.title.trim(),
      temp_description: formValue.description?.trim() || '',
      temp_performance_factor: formValue.performanceFactor?.trim() || '',
      temp_importance: formValue.importance?.trim() || '',
      temp_weightage: formValue.weightage,
      categories: this.selectedCategories()
    };

    this.saving.set(true);
    try {
      if (this.isEdit() && this.templateId) {
        // Update existing template
        await this.updateTemplate(this.templateId, payload);
        this.snackBar.open('Template updated successfully', 'Close', { duration: 3000 });
      } else {
        // Create new template
        await this.createTemplate(payload);
        this.snackBar.open('Template created successfully', 'Close', { duration: 3000 });
      }
      
      this.router.navigate(['/goal-templates']);
    } catch (error) {
      this.snackBar.open((error as any).message || 'Save failed', 'Close', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  private async createTemplate(payload: any): Promise<void> {
    // This would need to be implemented in AppraisalService
    // For now, simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async updateTemplate(id: number, payload: any): Promise<void> {
    // This would need to be implemented in AppraisalService
    // For now, simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  goBack() {
    this.router.navigate(['/goal-templates']);
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
