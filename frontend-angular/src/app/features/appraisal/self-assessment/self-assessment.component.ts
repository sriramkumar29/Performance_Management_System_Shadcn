import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSliderModule } from '@angular/material/slider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AppraisalService, AppraisalWithGoals, AppraisalGoal, Goal, GoalCategory } from '@core/services/appraisal.service';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-self-assessment',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
    MatSliderModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  template: `
    <div class="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div class="mx-auto max-w-4xl space-y-6">
        
        @if (loading()) {
          <div class="animate-pulse space-y-6">
            <div class="h-8 bg-muted rounded-lg w-1/3"></div>
            <div class="h-32 bg-muted rounded-xl"></div>
            <div class="h-96 bg-muted rounded-xl"></div>
          </div>
        } @else if (appraisal()) {
          <!-- Header Card -->
          <mat-card class="shadow-medium border-0">
            <mat-card-header class="pb-4">
              <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 w-full">
                <div class="space-y-2">
                  <h1 class="text-2xl lg:text-3xl font-bold text-foreground">
                    Self Assessment
                  </h1>
                  <div class="flex items-center gap-2 text-sm text-muted-foreground">
                    <mat-icon class="h-4 w-4">calendar_today</mat-icon>
                    {{ formatDate(appraisal()!.start_date) }} – {{ formatDate(appraisal()!.end_date) }}
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="px-3 py-1 text-sm font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded-md">
                    {{ appraisal()!.status }}
                  </span>
                  <div class="text-right">
                    <div class="text-sm font-medium text-foreground">
                      Goal {{ currentIndex() + 1 }} of {{ totalGoals() }}
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {{ progressPercentage() }}% Complete
                    </div>
                  </div>
                  <button 
                    mat-raised-button 
                    color="primary"
                    (click)="goHome()"
                    class="hidden sm:inline-flex"
                    title="Home">
                    <mat-icon>home</mat-icon>
                    <span class="hidden sm:inline ml-2">Home</span>
                  </button>
                </div>
              </div>
              <mat-progress-bar 
                [value]="progressPercentage()" 
                class="h-2 mt-4">
              </mat-progress-bar>
            </mat-card-header>
          </mat-card>

          <!-- Goal Assessment Card -->
          @if (currentGoal()) {
            <mat-card class="shadow-medium border-0">
              <mat-card-header class="pb-4">
                <div class="flex items-start gap-3 w-full">
                  <div class="p-2 rounded-lg bg-primary/10">
                    <mat-icon class="h-5 w-5 text-primary">track_changes</mat-icon>
                  </div>
                  <div class="flex-1 space-y-2">
                    <h2 class="text-xl font-semibold text-foreground leading-tight">
                      {{ currentGoal()!.goal.goal_title }}
                    </h2>
                    @if (currentGoal()!.goal.goal_description) {
                      <p class="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {{ currentGoal()!.goal.goal_description }}
                      </p>
                    }
                    <div class="flex flex-wrap items-center gap-3 text-xs">
                      <div class="flex items-center gap-1 text-muted-foreground">
                        <mat-icon class="h-3 w-3">fitness_center</mat-icon>
                        <span>Weightage: {{ currentGoal()!.goal.goal_weightage }}%</span>
                      </div>
                      @if (currentGoal()!.goal.category) {
                        <span class="text-xs bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-1 rounded">
                          {{ currentGoal()!.goal.category!.name }}
                        </span>
                      }
                    </div>
                  </div>
                </div>
              </mat-card-header>

              <mat-card-content class="space-y-6">
                <form [formGroup]="assessmentForm" class="space-y-6">
                  <!-- Rating Section -->
                  <div class="space-y-3">
                    <div class="flex items-center gap-2">
                      <mat-icon class="h-4 w-4 text-primary">star</mat-icon>
                      <label class="text-sm font-medium text-foreground">
                        Your Rating (1-5)
                      </label>
                      @if (assessmentForm.get('rating')?.value) {
                        <span class="ml-auto bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded text-xs">
                          {{ assessmentForm.get('rating')?.value }}/5
                        </span>
                      }
                    </div>
                    <div class="px-3">
                      <mat-slider 
                        min="1" 
                        max="5" 
                        step="1" 
                        discrete
                        formControlName="rating"
                        class="w-full">
                        <input matSliderThumb>
                      </mat-slider>
                      <div class="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Poor</span>
                        <span>Below Average</span>
                        <span>Average</span>
                        <span>Good</span>
                        <span>Excellent</span>
                      </div>
                    </div>
                  </div>

                  <!-- Comments Section -->
                  <div class="space-y-3">
                    <div class="flex items-center gap-2">
                      <mat-icon class="h-4 w-4 text-primary">chat_bubble_outline</mat-icon>
                      <label class="text-sm font-medium text-foreground">
                        Your Comments
                      </label>
                    </div>
                    <mat-form-field appearance="outline" class="w-full">
                      <textarea 
                        matInput 
                        formControlName="comment"
                        rows="5"
                        placeholder="Share specific examples, achievements, challenges, and outcomes that demonstrate your performance for this goal..."
                        class="resize-none">
                      </textarea>
                    </mat-form-field>
                    <div class="text-xs text-muted-foreground">
                      {{ assessmentForm.get('comment')?.value?.length || 0 }} characters
                    </div>
                  </div>

                  <!-- Navigation -->
                  <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50">
                    <button 
                      mat-stroked-button
                      (click)="previousGoal()" 
                      [disabled]="!canPrevious()"
                      class="w-full sm:w-auto">
                      <mat-icon>chevron_left</mat-icon>
                      Previous Goal
                    </button>
                    
                    <div class="flex items-center gap-2 text-xs text-muted-foreground">
                      <div class="flex gap-1">
                        @for (goal of goals(); track goal.id; let i = $index) {
                          <div
                            class="w-2 h-2 rounded-full"
                            [class]="i === currentIndex() ? 'bg-primary' : i < currentIndex() ? 'bg-primary/60' : 'bg-border'">
                          </div>
                        }
                      </div>
                    </div>

                    @if (canNext()) {
                      <button
                        mat-raised-button
                        color="primary"
                        (click)="nextGoal()"
                        [disabled]="loading() || !isCurrentValid()"
                        class="w-full sm:w-auto">
                        Next Goal
                        <mat-icon>chevron_right</mat-icon>
                      </button>
                    } @else {
                      <button
                        mat-raised-button
                        color="primary"
                        (click)="submitAssessment()"
                        [disabled]="loading() || !isCurrentValid()"
                        class="w-full sm:w-auto shadow-lg">
                        <mat-icon>send</mat-icon>
                        Submit Assessment
                      </button>
                    }
                  </div>
                </form>
              </mat-card-content>
            </mat-card>
          }
        }
      </div>

      <!-- Mobile-only floating Home button -->
      <button 
        mat-fab
        color="primary"
        (click)="goHome()"
        title="Home"
        class="sm:hidden fixed bottom-20 right-4 z-50">
        <mat-icon>home</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .shadow-medium {
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    }
    
    mat-card {
      border-radius: 12px;
    }
    
    mat-progress-bar {
      height: 8px;
      border-radius: 4px;
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
  `]
})
export class SelfAssessmentComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private appraisalService = inject(AppraisalService);
  private authService = inject(AuthService);

  loading = signal(false);
  appraisal = signal<AppraisalWithGoals | null>(null);
  currentIndex = signal(0);
  
  assessmentForm = this.fb.group({
    rating: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
    comment: ['', [Validators.required, Validators.minLength(1)]]
  });

  goals = computed(() => this.appraisal()?.appraisal_goals || []);
  totalGoals = computed(() => this.goals().length);
  currentGoal = computed(() => this.goals()[this.currentIndex()]);
  progressPercentage = computed(() => 
    this.totalGoals() > 0 ? Math.round(((this.currentIndex() + 1) / this.totalGoals()) * 100) : 0
  );

  private formData: Record<number, { rating: number | null; comment: string }> = {};

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadAppraisal(id);
    }
  }

  private async loadAppraisal(id: string) {
    this.loading.set(true);
    try {
      const appraisal: AppraisalWithGoals = await this.appraisalService.getAppraisal(parseInt(id));
      
      // Guard: only allow in Appraisee Self Assessment stage
      if (appraisal.status !== 'Appraisee Self Assessment') {
        this.snackBar.open(`This appraisal is in '${appraisal.status}' stage`, 'Close', { duration: 3000 });
        this.router.navigate(['/']);
        return;
      }

      this.appraisal.set(appraisal);
      
      // Initialize form data from existing self inputs
      for (const ag of appraisal.appraisal_goals || []) {
        this.formData[ag.goal.goal_id] = {
          rating: ag.self_rating ?? null,
          comment: ag.self_comment ?? ''
        };
      }
      
      this.updateFormForCurrentGoal();
    } catch (error) {
      this.snackBar.open((error as Error).message || 'Failed to load appraisal', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  private updateFormForCurrentGoal() {
    const current = this.currentGoal();
    if (current) {
      const data = this.formData[current.goal.goal_id] || { rating: 1, comment: '' };
      this.assessmentForm.patchValue({
        rating: data.rating || 1,
        comment: data.comment || ''
      });
    }
  }

  private saveCurrentForm() {
    const current = this.currentGoal();
    if (current) {
      const formValue = this.assessmentForm.value;
      this.formData[current.goal.goal_id] = {
        rating: formValue.rating || null,
        comment: formValue.comment || ''
      };
    }
  }

  canPrevious(): boolean {
    return this.currentIndex() > 0;
  }

  canNext(): boolean {
    return this.currentIndex() < this.totalGoals() - 1;
  }

  isCurrentValid(): boolean {
    const formValue = this.assessmentForm.value;
    return !!(formValue.rating && formValue.comment && formValue.comment.trim().length > 0);
  }

  previousGoal() {
    if (this.canPrevious()) {
      this.saveCurrentForm();
      this.currentIndex.set(this.currentIndex() - 1);
      this.updateFormForCurrentGoal();
    }
  }

  nextGoal() {
    if (!this.isCurrentValid()) {
      this.snackBar.open('Rating (1-5) and comment are required', 'Close', { duration: 3000 });
      return;
    }
    
    if (this.canNext()) {
      this.saveCurrentForm();
      this.currentIndex.set(this.currentIndex() + 1);
      this.updateFormForCurrentGoal();
    }
  }

  async submitAssessment() {
    if (!this.appraisal()) return;

    // Save current form data
    this.saveCurrentForm();

    // Validate all goals are filled
    for (const ag of this.goals()) {
      const data = this.formData[ag.goal.goal_id];
      if (!data || !data.rating || !data.comment || !data.comment.trim()) {
        const missingIndex = this.goals().findIndex((g: AppraisalGoal) => g.goal.goal_id === ag.goal.goal_id);
        if (missingIndex >= 0) {
          this.currentIndex.set(missingIndex);
          this.updateFormForCurrentGoal();
        }
        this.snackBar.open('Please provide rating and comment for all goals', 'Close', { duration: 3000 });
        return;
      }
    }

    this.loading.set(true);
    try {
      const payload: any = { goals: {} };
      for (const ag of this.goals()) {
        const data = this.formData[ag.goal.goal_id];
        payload.goals[ag.goal.goal_id] = {
          self_rating: data.rating,
          self_comment: data.comment,
        };
      }

      await this.appraisalService.submitSelfAssessment(this.appraisal()!.appraisal_id, payload);
      await this.appraisalService.updateAppraisalStatus(this.appraisal()!.appraisal_id, 'Appraiser Evaluation');
      
      this.snackBar.open('Self assessment submitted successfully', 'Close', { duration: 3000 });
      this.router.navigate(['/']);
    } catch (error) {
      this.snackBar.open((error as Error).message || 'Failed to submit self assessment', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  goHome() {
    this.router.navigate(['/']);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}
