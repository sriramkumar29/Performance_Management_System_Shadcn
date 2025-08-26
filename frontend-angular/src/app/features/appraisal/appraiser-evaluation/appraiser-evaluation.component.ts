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
  selector: 'app-appraiser-evaluation',
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
      <div class="mx-auto max-w-5xl space-y-6">
        
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
                    Appraiser Evaluation
                  </h1>
                  <div class="flex items-center gap-2 text-sm text-muted-foreground">
                    <mat-icon class="h-4 w-4">calendar_today</mat-icon>
                    {{ formatDate(appraisal()!.start_date) }} – {{ formatDate(appraisal()!.end_date) }}
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="px-3 py-1 text-sm font-medium bg-teal-50 text-teal-700 border border-teal-200 rounded-md">
                    {{ appraisal()!.status }}
                  </span>
                  <div class="text-right">
                    <div class="text-sm font-medium text-foreground">
                      {{ isOverallPage() ? 'Overall Evaluation' : 'Goal ' + (currentIndex() + 1) + ' of ' + totalGoals() }}
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
          @if (!isOverallPage() && currentGoal()) {
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
                        <span class="text-xs bg-pink-100 text-pink-700 border border-pink-200 px-2 py-1 rounded">
                          {{ currentGoal()!.goal.category!.name }}
                        </span>
                      }
                    </div>
                  </div>
                </div>
              </mat-card-header>

              <mat-card-content class="space-y-6">
                <!-- Self Assessment (read-only) -->
                <div class="rounded-lg border border-border/50 bg-background p-4 space-y-4">
                  <div class="flex items-center gap-2 mb-3">
                    <mat-icon class="h-4 w-4 text-primary">person</mat-icon>
                    <h3 class="text-sm font-medium text-foreground">Employee Self Assessment</h3>
                  </div>
                  
                  <div class="space-y-3">
                    <div class="flex items-center gap-2">
                      <mat-icon class="h-4 w-4 text-primary">star</mat-icon>
                      <label class="text-sm font-medium text-foreground">Self Rating</label>
                      @if (currentGoal()!.self_rating) {
                        <span class="ml-auto px-2 py-1 text-xs border rounded">
                          {{ currentGoal()!.self_rating }}/5
                        </span>
                      }
                    </div>
                    <div class="px-3">
                      <mat-slider 
                        min="1" 
                        max="5" 
                        step="1" 
                        discrete
                        disabled
                        class="w-full opacity-60">
                        <input matSliderThumb [value]="currentGoal()!.self_rating || 1">
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

                  <div class="space-y-3">
                    <div class="flex items-center gap-2">
                      <mat-icon class="h-4 w-4 text-primary">chat_bubble_outline</mat-icon>
                      <label class="text-sm font-medium text-foreground">Self Comments</label>
                    </div>
                    <mat-form-field appearance="outline" class="w-full">
                      <textarea 
                        matInput 
                        rows="3"
                        [value]="currentGoal()!.self_comment || 'No comments provided'"
                        readonly
                        class="resize-none opacity-60 bg-background/50">
                      </textarea>
                    </mat-form-field>
                  </div>
                </div>

                <!-- Appraiser Evaluation (writable) -->
                <div class="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
                  <div class="flex items-center gap-2 mb-3">
                    <mat-icon class="h-4 w-4 text-primary">verified_user</mat-icon>
                    <h3 class="text-sm font-medium text-foreground">Your Evaluation</h3>
                  </div>

                  <form [formGroup]="evaluationForm" class="space-y-3">
                    <div class="space-y-3">
                      <div class="flex items-center gap-2">
                        <mat-icon class="h-4 w-4 text-primary">star</mat-icon>
                        <label class="text-sm font-medium text-foreground">Your Rating (1-5)</label>
                        @if (evaluationForm.get('rating')?.value) {
                          <span class="ml-auto bg-lime-50 text-lime-700 border border-lime-200 px-2 py-1 rounded text-xs">
                            {{ evaluationForm.get('rating')?.value }}/5
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

                    <div class="space-y-3">
                      <div class="flex items-center gap-2">
                        <mat-icon class="h-4 w-4 text-primary">chat_bubble_outline</mat-icon>
                        <label class="text-sm font-medium text-foreground">Your Comments</label>
                      </div>
                      <mat-form-field appearance="outline" class="w-full">
                        <textarea 
                          matInput 
                          formControlName="comment"
                          rows="4"
                          placeholder="Provide your detailed evaluation, feedback, and recommendations..."
                          class="resize-none">
                        </textarea>
                      </mat-form-field>
                      <div class="text-xs text-muted-foreground">
                        {{ evaluationForm.get('comment')?.value?.length || 0 }} characters
                      </div>
                    </div>
                  </form>
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
                      <!-- Overall page indicator -->
                      <div
                        class="w-2 h-2 rounded-full"
                        [class]="isOverallPage() ? 'bg-primary' : currentIndex() >= totalGoals() ? 'bg-primary/60' : 'bg-border'">
                      </div>
                    </div>
                  </div>

                  <button
                    mat-raised-button
                    color="primary"
                    (click)="nextGoal()"
                    [disabled]="loading() || !isCurrentValid()"
                    class="w-full sm:w-auto">
                    {{ currentIndex() === totalGoals() - 1 ? 'Overall Evaluation' : 'Next Goal' }}
                    <mat-icon>chevron_right</mat-icon>
                  </button>
                </div>
              </mat-card-content>
            </mat-card>
          }

          <!-- Overall Evaluation Card -->
          @if (isOverallPage()) {
            <mat-card class="shadow-medium border-0">
              <mat-card-header class="pb-4">
                <div class="flex items-start gap-3 w-full">
                  <div class="p-2 rounded-lg bg-primary/10">
                    <mat-icon class="h-5 w-5 text-primary">bar_chart</mat-icon>
                  </div>
                  <div class="flex-1 space-y-2">
                    <h2 class="text-xl font-semibold text-foreground leading-tight">
                      Overall Performance Evaluation
                    </h2>
                    <p class="text-sm text-muted-foreground">
                      Provide your overall assessment based on all individual goal evaluations
                    </p>
                  </div>
                </div>
              </mat-card-header>

              <mat-card-content class="space-y-6">
                <form [formGroup]="overallForm" class="space-y-6">
                  <!-- Overall Rating -->
                  <div class="space-y-3">
                    <div class="flex items-center gap-2">
                      <mat-icon class="h-4 w-4 text-primary">star</mat-icon>
                      <label class="text-sm font-medium text-foreground">
                        Overall Rating (1-5)
                      </label>
                      @if (overallForm.get('rating')?.value) {
                        <span class="ml-auto px-2 py-1 text-xs border rounded">
                          {{ overallForm.get('rating')?.value }}/5
                        </span>
                      }
                    </div>
                    <div class="px-3">
                      <mat-slider 
                        min="1" 
                        max="5" 
                        step="1" 
                        discrete
                        class="w-full">
                        <input matSliderThumb formControlName="rating">
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

                  <!-- Overall Comments -->
                  <div class="space-y-3">
                    <div class="flex items-center gap-2">
                      <mat-icon class="h-4 w-4 text-primary">chat_bubble_outline</mat-icon>
                      <label class="text-sm font-medium text-foreground">
                        Overall Comments
                      </label>
                    </div>
                    <mat-form-field appearance="outline" class="w-full">
                      <textarea 
                        matInput 
                        formControlName="comment"
                        rows="6"
                        placeholder="Summarize overall performance, highlight key strengths, areas for improvement, and recommendations for development..."
                        class="resize-none">
                      </textarea>
                    </mat-form-field>
                    <div class="text-xs text-muted-foreground">
                      {{ overallForm.get('comment')?.value?.length || 0 }} characters
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
                        <!-- Overall page indicator -->
                        <div
                          class="w-2 h-2 rounded-full"
                          [class]="isOverallPage() ? 'bg-primary' : currentIndex() >= totalGoals() ? 'bg-primary/60' : 'bg-border'">
                        </div>
                      </div>
                    </div>

                    <button
                      mat-raised-button
                      color="primary"
                      (click)="submitEvaluation()"
                      [disabled]="loading() || !isOverallValid()"
                      class="w-full sm:w-auto shadow-lg">
                      <mat-icon>send</mat-icon>
                      Submit to Reviewer
                    </button>
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
export class AppraiserEvaluationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private appraisalService = inject(AppraisalService);
  private authService = inject(AuthService);

  loading = signal(false);
  appraisal = signal<AppraisalWithGoals | null>(null);
  currentIndex = signal(0);
  
  evaluationForm = this.fb.group({
    rating: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
    comment: ['', [Validators.required, Validators.minLength(1)]]
  });

  overallForm = this.fb.group({
    rating: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
    comment: ['', [Validators.required, Validators.minLength(1)]]
  });

  goals = computed(() => this.appraisal()?.appraisal_goals || []);
  totalGoals = computed(() => this.goals().length);
  currentGoal = computed(() => this.goals()[this.currentIndex()]);
  isOverallPage = computed(() => this.currentIndex() === this.totalGoals());
  progressPercentage = computed(() => 
    this.totalGoals() > 0 ? Math.round(((this.currentIndex() + 1) / (this.totalGoals() + 1)) * 100) : 0
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
      const appraisal = await this.appraisalService.getAppraisal(parseInt(id)) as AppraisalWithGoals;
      
      // Guard: only allow in Appraiser Evaluation stage
      if (appraisal.status !== 'Appraiser Evaluation') {
        this.router.navigate(['/']);
        return;
      }

      this.appraisal.set(appraisal);
      
      // Initialize form data from existing appraiser inputs
      for (const ag of appraisal.appraisal_goals || []) {
        this.formData[ag.goal.goal_id] = {
          rating: ag.appraiser_rating ?? null,
          comment: ag.appraiser_comment ?? ''
        };
      }
      
      // Initialize overall form
      this.overallForm.patchValue({
        rating: appraisal.appraiser_overall_rating || 1,
        comment: appraisal.appraiser_overall_comments || ''
      });
      
      this.updateFormForCurrentGoal();
    } catch (error) {
      this.snackBar.open((error as any).message || 'Failed to load appraisal', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  private updateFormForCurrentGoal() {
    const current = this.currentGoal();
    if (current) {
      const data = this.formData[current.goal.goal_id] || { rating: 1, comment: '' };
      this.evaluationForm.patchValue({
        rating: data.rating || 1,
        comment: data.comment || ''
      });
    }
  }

  private saveCurrentForm() {
    if (this.isOverallPage()) {
      return; // Overall form is handled separately
    }
    
    const current = this.currentGoal();
    if (current) {
      const formValue = this.evaluationForm.value;
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
    return this.currentIndex() < this.totalGoals();
  }

  isCurrentValid(): boolean {
    const formValue = this.evaluationForm.value;
    return !!(formValue.rating && formValue.comment && formValue.comment.trim().length > 0);
  }

  isOverallValid(): boolean {
    const formValue = this.overallForm.value;
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
    if (!this.isOverallPage() && !this.isCurrentValid()) {
      this.snackBar.open('Rating (1-5) and comment are required', 'Close', { duration: 3000 });
      return;
    }
    
    if (this.canNext()) {
      this.saveCurrentForm();
      this.currentIndex.set(this.currentIndex() + 1);
      if (!this.isOverallPage()) {
        this.updateFormForCurrentGoal();
      }
    }
  }

  async submitEvaluation() {
    if (!this.appraisal()) return;

    // Save current form data
    this.saveCurrentForm();

    // Validate all goals are filled
    for (const ag of this.goals()) {
      const data = this.formData[ag.goal.goal_id];
      if (!data || !data.rating || !data.comment || !data.comment.trim()) {
        const missingIndex = this.goals().findIndex(g => g.goal.goal_id === ag.goal.goal_id);
        if (missingIndex >= 0) {
          this.currentIndex.set(missingIndex);
          this.updateFormForCurrentGoal();
        }
        this.snackBar.open('Please provide rating and comment for all goals', 'Close', { duration: 3000 });
        return;
      }
    }

    // Validate overall evaluation
    if (!this.isOverallValid()) {
      this.currentIndex.set(this.totalGoals());
      this.snackBar.open('Overall rating and comment are required', 'Close', { duration: 3000 });
      return;
    }

    this.loading.set(true);
    try {
      const overallValue = this.overallForm.value;
      const payload: any = {
        goals: {},
        appraiser_overall_comments: overallValue.comment,
        appraiser_overall_rating: overallValue.rating,
      };
      
      for (const ag of this.goals()) {
        const data = this.formData[ag.goal.goal_id];
        payload.goals[ag.goal.goal_id] = {
          appraiser_rating: data.rating,
          appraiser_comment: data.comment,
        };
      }

      await this.appraisalService.submitAppraiserEvaluation(this.appraisal()!.appraisal_id, payload);
      await this.appraisalService.updateAppraisalStatus(this.appraisal()!.appraisal_id, 'Reviewer Evaluation');
      
      this.snackBar.open('Evaluation submitted to reviewer successfully', 'Close', { duration: 3000 });
      this.router.navigate(['/']);
    } catch (error) {
      this.snackBar.open((error as any).message || 'Failed to submit appraiser evaluation', 'Close', { duration: 3000 });
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
