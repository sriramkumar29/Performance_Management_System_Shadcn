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
  selector: 'app-reviewer-evaluation',
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
    <div class="min-h-screen bg-background p-6">
      <div class="max-w-4xl mx-auto space-y-6">
        
        @if (loading()) {
          <mat-card class="shadow-medium border-0 p-8">
            <div class="flex items-center justify-center h-32">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </mat-card>
        } @else if (appraisal()) {
          <!-- Header Card -->
          <mat-card class="shadow-medium border-0 p-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="p-3 rounded-xl bg-primary text-primary-foreground">
                  <mat-icon class="h-6 w-6">visibility</mat-icon>
                </div>
                <div>
                  <h1 class="text-2xl font-bold text-foreground">Reviewer Evaluation</h1>
                  <div class="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <mat-icon class="h-4 w-4">calendar_today</mat-icon>
                    {{ formatDate(appraisal()!.start_date) }} – {{ formatDate(appraisal()!.end_date) }}
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <span class="px-3 py-1 bg-violet-100 text-violet-800 border border-violet-200 rounded text-sm">
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

            <!-- Progress Bar -->
            <div class="mt-6">
              <mat-progress-bar [value]="progressPercentage()" class="h-2"></mat-progress-bar>
            </div>
          </mat-card>

          <!-- Goal Review Card -->
          @if (!isOverallPage() && currentGoal()) {
            <mat-card class="shadow-medium border-0 p-6">
              <div class="space-y-6">
                <!-- Goal Header -->
                <div class="flex items-start gap-4">
                  <div class="p-2 rounded-lg bg-primary/10">
                    <mat-icon class="h-5 w-5 text-primary">track_changes</mat-icon>
                  </div>
                  <div class="flex-1">
                    <h2 class="text-xl font-semibold text-foreground mb-2">
                      {{ currentGoal()!.goal.goal_title }}
                    </h2>
                    @if (currentGoal()!.goal.goal_description) {
                      <p class="text-sm text-muted-foreground whitespace-pre-wrap mb-3">
                        {{ currentGoal()!.goal.goal_description }}
                      </p>
                    }
                    <div class="flex items-center gap-4 text-xs text-muted-foreground">
                      <span class="flex items-center gap-1">
                        <mat-icon class="h-3 w-3">star</mat-icon>
                        Weightage: {{ currentGoal()!.goal.goal_weightage }}%
                      </span>
                      @if (currentGoal()!.goal.category) {
                        <span class="bg-cyan-50 text-cyan-700 border border-cyan-200 px-2 py-1 rounded text-xs">
                          {{ currentGoal()!.goal.category!.name }}
                        </span>
                      }
                    </div>
                  </div>
                </div>

                <div class="grid gap-6">
                  <!-- Self Assessment (read-only) -->
                  <div class="rounded-xl border border-border p-4 bg-muted/40">
                    <div class="flex items-center gap-2 mb-4">
                      <mat-icon class="h-4 w-4 text-primary">person</mat-icon>
                      <span class="text-sm font-medium text-foreground">Employee Self Assessment</span>
                    </div>
                    <div class="space-y-4">
                      <div>
                        <label class="text-xs font-medium text-foreground mb-2 block">
                          Self Rating: {{ currentGoal()!.self_rating || 'Not rated' }}
                        </label>
                        <mat-slider 
                          min="1" 
                          max="5" 
                          step="1" 
                          discrete
                          disabled
                          class="opacity-70">
                          <input matSliderThumb [value]="currentGoal()!.self_rating || 1">
                        </mat-slider>
                      </div>
                      <div>
                        <label class="text-xs font-medium text-foreground mb-2 block">
                          Self Comments
                        </label>
                        <mat-form-field appearance="outline" class="w-full">
                          <textarea 
                            matInput 
                            rows="3"
                            [value]="currentGoal()!.self_comment || 'No comments provided'"
                            readonly
                            class="bg-card/50 border-border">
                          </textarea>
                        </mat-form-field>
                      </div>
                    </div>
                  </div>

                  <!-- Appraiser Evaluation (read-only) -->
                  <div class="rounded-xl border border-border p-4 bg-muted/40">
                    <div class="flex items-center gap-2 mb-4">
                      <mat-icon class="h-4 w-4 text-primary">verified_user</mat-icon>
                      <span class="text-sm font-medium text-foreground">Appraiser Evaluation</span>
                    </div>
                    <div class="space-y-4">
                      <div>
                        <label class="text-xs font-medium text-foreground mb-2 block">
                          Appraiser Rating: {{ currentGoal()!.appraiser_rating || 'Not rated' }}
                        </label>
                        <mat-slider 
                          min="1" 
                          max="5" 
                          step="1" 
                          discrete
                          disabled
                          class="opacity-70">
                          <input matSliderThumb [value]="currentGoal()!.appraiser_rating || 1">
                        </mat-slider>
                      </div>
                      <div>
                        <label class="text-xs font-medium text-foreground mb-2 block">
                          Appraiser Comments
                        </label>
                        <mat-form-field appearance="outline" class="w-full">
                          <textarea 
                            matInput 
                            rows="4"
                            [value]="currentGoal()!.appraiser_comment || 'No comments provided'"
                            readonly
                            class="bg-card/50 border-border">
                          </textarea>
                        </mat-form-field>
                      </div>
                    </div>
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
                    Previous
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
                    class="w-full sm:w-auto">
                    {{ currentIndex() === totalGoals() - 1 ? 'Overall Review' : 'Next Goal' }}
                    <mat-icon>chevron_right</mat-icon>
                  </button>
                </div>
              </div>
            </mat-card>
          }

          <!-- Overall Evaluation Card -->
          @if (isOverallPage()) {
            <mat-card class="shadow-medium border-0 p-6">
              <div class="space-y-6">
                <div class="flex items-center gap-3">
                  <div class="p-3 rounded-xl bg-primary text-primary-foreground">
                    <mat-icon class="h-6 w-6">star</mat-icon>
                  </div>
                  <div>
                    <h2 class="text-2xl font-bold text-foreground">Overall Evaluation</h2>
                    <p class="text-sm text-muted-foreground mt-1">Final review and completion</p>
                  </div>
                </div>

                <!-- Appraiser Overall - read only -->
                <div class="rounded-xl border border-border p-5 bg-muted/40">
                  <div class="flex items-center gap-2 mb-4">
                    <mat-icon class="h-5 w-5 text-primary">verified_user</mat-icon>
                    <span class="text-lg font-semibold text-foreground">Appraiser Overall Assessment</span>
                  </div>
                  <div class="space-y-4">
                    <div>
                      <label class="text-sm font-medium text-foreground mb-3 block">
                        Overall Rating: {{ appraisal()!.appraiser_overall_rating || 'Not provided' }}
                      </label>
                      <mat-slider 
                        min="1" 
                        max="5" 
                        step="1" 
                        discrete
                        disabled
                        class="opacity-70">
                        <input matSliderThumb [value]="appraisal()!.appraiser_overall_rating || 1">
                      </mat-slider>
                    </div>
                    <div>
                      <label class="text-sm font-medium text-foreground mb-3 block">
                        Overall Comments
                      </label>
                      <mat-form-field appearance="outline" class="w-full">
                        <textarea 
                          matInput 
                          rows="4"
                          [value]="appraisal()!.appraiser_overall_comments || 'No comments provided'"
                          readonly
                          class="bg-card/50 border-border">
                        </textarea>
                      </mat-form-field>
                    </div>
                  </div>
                </div>

                <!-- Reviewer Overall - inputs -->
                <form [formGroup]="reviewerForm" class="rounded-xl border border-border p-5 bg-muted/40 space-y-4">
                  <div class="flex items-center gap-2">
                    <mat-icon class="h-5 w-5 text-primary">visibility</mat-icon>
                    <span class="text-lg font-semibold text-foreground">Reviewer Overall Assessment</span>
                  </div>

                  <!-- Overall Rating -->
                  <div class="space-y-3">
                    <div class="flex items-center gap-2">
                      <mat-icon class="h-4 w-4 text-primary">star</mat-icon>
                      <label class="text-sm font-medium text-foreground">Overall Rating (1-5)</label>
                      @if (reviewerForm.get('rating')?.value) {
                        <span class="ml-auto px-2 py-1 text-xs border rounded">
                          {{ reviewerForm.get('rating')?.value }}/5
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
                  <div>
                    <label class="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <mat-icon class="h-4 w-4">chat_bubble_outline</mat-icon>
                      Overall Comments
                    </label>
                    <mat-form-field appearance="outline" class="w-full">
                      <textarea 
                        matInput 
                        formControlName="comment"
                        rows="6"
                        placeholder="Provide your comprehensive review of the employee's performance, highlighting key strengths, areas for improvement, and overall assessment..."
                        class="resize-none">
                      </textarea>
                    </mat-form-field>
                    <div class="text-xs text-muted-foreground mt-2">
                      {{ reviewerForm.get('comment')?.value?.length || 0 }} characters
                    </div>
                  </div>
                </form>

                <!-- Navigation -->
                <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border/50">
                  <button 
                    mat-stroked-button
                    (click)="previousGoal()" 
                    [disabled]="!canPrevious()"
                    class="w-full sm:w-auto">
                    <mat-icon>chevron_left</mat-icon>
                    Previous
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
                    (click)="submitReview()"
                    [disabled]="loading() || !isReviewerValid()"
                    class="w-full sm:w-auto shadow-lg px-6 py-2">
                    <mat-icon>check_circle</mat-icon>
                    {{ loading() ? 'Submitting...' : 'Submit & Complete' }}
                  </button>
                </div>
              </div>
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
    
    .animate-spin {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `]
})
export class ReviewerEvaluationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private appraisalService = inject(AppraisalService);
  private authService = inject(AuthService);

  loading = signal(false);
  appraisal = signal<AppraisalWithGoals | null>(null);
  currentIndex = signal(0);
  
  reviewerForm = this.fb.group({
    rating: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
    comment: ['', [Validators.required, Validators.minLength(1)]]
  });

  goals = computed(() => this.appraisal()?.appraisal_goals || []);
  totalGoals = computed(() => this.goals().length);
  currentGoal = computed(() => this.goals()[this.currentIndex()]);
  isOverallPage = computed(() => this.currentIndex() === this.totalGoals());
  progressPercentage = computed(() => 
    this.totalGoals() > 0 ? Math.round(((this.currentIndex() + 1) / (this.totalGoals() + 1)) * 100) : 0
  );

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
      
      // Guard: only allow in Reviewer Evaluation stage
      if (appraisal.status !== 'Reviewer Evaluation') {
        this.snackBar.open(`This appraisal is in '${appraisal.status}' stage`, 'Close', { duration: 3000 });
        this.router.navigate(['/']);
        return;
      }

      this.appraisal.set(appraisal);
      
      // Initialize reviewer form
      this.reviewerForm.patchValue({
        rating: appraisal.reviewer_overall_rating || 3,
        comment: appraisal.reviewer_overall_comments || ''
      });
      
    } catch (error) {
      this.snackBar.open((error as Error).message || 'Failed to load appraisal', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  canPrevious(): boolean {
    return this.currentIndex() > 0;
  }

  canNext(): boolean {
    return this.currentIndex() < this.totalGoals();
  }

  isReviewerValid(): boolean {
    const formValue = this.reviewerForm.value;
    return !!(formValue.rating && formValue.comment && formValue.comment.trim().length > 0);
  }

  previousGoal() {
    if (this.canPrevious()) {
      this.currentIndex.set(this.currentIndex() - 1);
    }
  }

  nextGoal() {
    if (this.canNext()) {
      this.currentIndex.set(this.currentIndex() + 1);
    }
  }

  async submitReview() {
    if (!this.appraisal()) return;

    if (!this.isReviewerValid()) {
      this.currentIndex.set(this.totalGoals());
      this.snackBar.open('Please provide overall rating and comment', 'Close', { duration: 3000 });
      return;
    }

    this.loading.set(true);
    try {
      const formValue = this.reviewerForm.value;
      const payload = {
        reviewer_overall_comments: formValue.comment || '',
        reviewer_overall_rating: formValue.rating || 3,
      };

      await this.appraisalService.submitReviewerEvaluation(this.appraisal()!.appraisal_id, payload);
      await this.appraisalService.updateAppraisalStatus(this.appraisal()!.appraisal_id, 'Complete');
      
      this.snackBar.open('Appraisal marked as Complete', 'Close', { duration: 3000 });
      this.router.navigate(['/']);
    } catch (error) {
      this.snackBar.open((error as Error).message || 'Failed to submit reviewer evaluation', 'Close', { duration: 3000 });
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
