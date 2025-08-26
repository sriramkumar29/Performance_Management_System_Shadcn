import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
  selector: 'app-appraisal-view',
  standalone: true,
  imports: [
    CommonModule,
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
                <div class="flex items-center gap-3">
                  <div class="p-2 rounded-lg bg-primary/10">
                    <mat-icon class="h-5 w-5 text-primary">visibility</mat-icon>
                  </div>
                  <div class="space-y-1">
                    <h1 class="text-2xl lg:text-3xl font-bold text-foreground">Appraisal View</h1>
                    <div class="flex items-center gap-2 text-sm text-muted-foreground">
                      <mat-icon class="h-4 w-4">calendar_today</mat-icon>
                      {{ formatDate(appraisal()!.start_date) }} – {{ formatDate(appraisal()!.end_date) }}
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="px-3 py-1 text-sm font-medium bg-muted text-foreground border border-border rounded-md">
                    {{ displayStatus(appraisal()!.status) }}
                  </span>
                  <div class="text-right">
                    <div class="text-sm font-medium text-foreground">
                      {{ isOverallPage() ? 'Overall Summary' : 'Goal ' + Math.min(currentIndex() + 1, totalGoals()) + ' of ' + totalGoals() }}
                    </div>
                    <div class="text-xs text-muted-foreground">{{ progressPercentage() }}% Complete</div>
                  </div>
                </div>
              </div>
              <mat-progress-bar 
                [value]="progressPercentage()" 
                class="h-2 mt-4">
              </mat-progress-bar>
            </mat-card-header>
          </mat-card>

          <!-- Goal View Card -->
          @if (!isOverallPage() && currentGoal()) {
            <mat-card class="shadow-medium border-0">
              <mat-card-header class="pb-4">
                <div class="flex items-start gap-3 w-full">
                  <div class="p-2 rounded-lg bg-primary/10">
                    <mat-icon class="h-5 w-5 text-primary">track_changes</mat-icon>
                  </div>
                  <div class="flex-1 space-y-2">
                    <h2 class="text-xl font-semibold text-foreground leading-tight">{{ currentGoal()!.goal.goal_title }}</h2>
                    @if (currentGoal()!.goal.goal_description) {
                      <p class="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{{ currentGoal()!.goal.goal_description }}</p>
                    }
                    <div class="flex flex-wrap items-center gap-3 text-xs">
                      <div class="flex items-center gap-1 text-muted-foreground">
                        <mat-icon class="h-3 w-3">fitness_center</mat-icon>
                        <span>Weightage: {{ currentGoal()!.goal.goal_weightage }}%</span>
                      </div>
                      @if (currentGoal()!.goal.category) {
                        <span class="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                          {{ currentGoal()!.goal.category!.name }}
                        </span>
                      }
                    </div>
                  </div>
                </div>
              </mat-card-header>

              <mat-card-content class="space-y-6">
                <!-- Self Assessment (read-only) -->
                <div class="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
                  <div class="flex items-center gap-2">
                    <mat-icon class="h-4 w-4 text-primary">person</mat-icon>
                    <h3 class="text-sm font-medium text-foreground">Employee Self Assessment</h3>
                  </div>
                  <div class="space-y-3">
                    <div class="flex items-center gap-2">
                      <mat-icon class="h-4 w-4 text-primary">star</mat-icon>
                      <label class="text-sm font-medium text-foreground">Self Rating</label>
                      @if (currentGoal()!.self_rating) {
                        <span class="ml-auto px-2 py-1 text-xs border rounded">{{ currentGoal()!.self_rating }}/5</span>
                      }
                    </div>
                    <mat-slider 
                      min="1" 
                      max="5" 
                      step="1" 
                      discrete
                      disabled
                      class="opacity-70">
                      <input matSliderThumb [value]="currentGoal()!.self_rating || 1">
                    </mat-slider>
                    <div>
                      <label class="text-sm font-medium text-foreground flex items-center gap-2">
                        <mat-icon class="h-4 w-4 text-primary">chat_bubble_outline</mat-icon> 
                        Self Comments
                      </label>
                      <mat-form-field appearance="outline" class="w-full">
                        <textarea 
                          matInput 
                          rows="3"
                          [value]="currentGoal()!.self_comment || 'No comments provided'"
                          readonly
                          class="bg-card/50 border-border resize-none">
                        </textarea>
                      </mat-form-field>
                    </div>
                  </div>
                </div>

                <!-- Appraiser Evaluation (read-only, visible only when Complete) -->
                @if (showOverall()) {
                  <div class="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
                    <div class="flex items-center gap-2">
                      <mat-icon class="h-4 w-4 text-primary">verified_user</mat-icon>
                      <h3 class="text-sm font-medium text-foreground">Appraiser Evaluation</h3>
                    </div>
                    <div class="space-y-3">
                      <div class="flex items-center gap-2">
                        <mat-icon class="h-4 w-4 text-primary">star</mat-icon>
                        <label class="text-sm font-medium text-foreground">Appraiser Rating</label>
                        @if (currentGoal()!.appraiser_rating) {
                          <span class="ml-auto px-2 py-1 text-xs border rounded">{{ currentGoal()!.appraiser_rating }}/5</span>
                        }
                      </div>
                      <mat-slider 
                        min="1" 
                        max="5" 
                        step="1" 
                        discrete
                        disabled
                        class="opacity-70">
                        <input matSliderThumb [value]="currentGoal()!.appraiser_rating || 1">
                      </mat-slider>
                      <div>
                        <label class="text-sm font-medium text-foreground flex items-center gap-2">
                          <mat-icon class="h-4 w-4 text-primary">chat_bubble_outline</mat-icon> 
                          Appraiser Comments
                        </label>
                        <mat-form-field appearance="outline" class="w-full">
                          <textarea 
                            matInput 
                            rows="4"
                            [value]="currentGoal()!.appraiser_comment || 'No comments provided'"
                            readonly
                            class="bg-card/50 border-border resize-none">
                          </textarea>
                        </mat-form-field>
                      </div>
                    </div>
                  </div>
                }

                <!-- Navigation -->
                <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50">
                  <button 
                    mat-stroked-button
                    (click)="previousGoal()" 
                    [disabled]="loading() || currentIndex() === 0"
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
                      @if (showOverall()) {
                        <div
                          class="w-2 h-2 rounded-full"
                          [class]="isOverallPage() ? 'bg-primary' : currentIndex() >= totalGoals() ? 'bg-primary/60' : 'bg-border'">
                        </div>
                      }
                    </div>
                  </div>

                  <button
                    mat-raised-button
                    color="primary"
                    (click)="nextGoal()"
                    [disabled]="loading() || currentIndex() === maxIndex()"
                    class="w-full sm:w-auto">
                    {{ showOverall() && currentIndex() === totalGoals() - 1 ? 'Overall Summary' : 'Next Goal' }}
                    <mat-icon>chevron_right</mat-icon>
                  </button>
                </div>
              </mat-card-content>
            </mat-card>
          }

          <!-- Overall Summary Card -->
          @if (isOverallPage()) {
            <mat-card class="shadow-medium border-0">
              <mat-card-header class="pb-4">
                <div class="flex items-start gap-3 w-full">
                  <div class="p-2 rounded-lg bg-primary/10">
                    <mat-icon class="h-5 w-5 text-primary">bar_chart</mat-icon>
                  </div>
                  <div class="flex-1 space-y-1">
                    <h2 class="text-xl font-semibold text-foreground leading-tight">Overall Evaluation</h2>
                    <p class="text-sm text-muted-foreground">Summary of appraiser and reviewer assessments</p>
                  </div>
                </div>
              </mat-card-header>

              <mat-card-content class="space-y-6">
                <div class="grid gap-6 sm:grid-cols-2">
                  <!-- Appraiser Overall - read only -->
                  <div class="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
                    <div class="flex items-center gap-2">
                      <mat-icon class="h-4 w-4 text-primary">verified_user</mat-icon>
                      <h3 class="text-sm font-medium text-foreground">Appraiser Overall Assessment</h3>
                    </div>
                    <div class="space-y-3">
                      <div class="flex items-center gap-2">
                        <mat-icon class="h-4 w-4 text-primary">star</mat-icon>
                        <label class="text-sm font-medium text-foreground">Overall Rating</label>
                        @if (appraisal()!.appraiser_overall_rating) {
                          <span class="ml-auto px-2 py-1 text-xs border rounded">{{ appraisal()!.appraiser_overall_rating }}/5</span>
                        }
                      </div>
                      <mat-slider 
                        min="1" 
                        max="5" 
                        step="1" 
                        discrete
                          disabled
                        class="opacity-70">
                        <input matSliderThumb [value]="appraisal()!.appraiser_overall_rating || 1">
                      </mat-slider>
                      <div>
                        <label class="text-sm font-medium text-foreground flex items-center gap-2">
                          <mat-icon class="h-4 w-4 text-primary">chat_bubble_outline</mat-icon> 
                          Overall Comments
                        </label>
                        <mat-form-field appearance="outline" class="w-full">
                          <textarea 
                            matInput 
                            rows="4"
                            [value]="appraisal()!.appraiser_overall_comments || 'No comments provided'"
                            readonly
                            class="bg-card/50 border-border resize-none">
                          </textarea>
                        </mat-form-field>
                      </div>
                    </div>
                  </div>

                  <!-- Reviewer Overall - read only -->
                  <div class="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
                    <div class="flex items-center gap-2">
                      <mat-icon class="h-4 w-4 text-primary">visibility</mat-icon>
                      <h3 class="text-sm font-medium text-foreground">Reviewer Overall Assessment</h3>
                    </div>
                    <div class="space-y-3">
                      <div class="flex items-center gap-2">
                        <mat-icon class="h-4 w-4 text-primary">star</mat-icon>
                        <label class="text-sm font-medium text-foreground">Overall Rating</label>
                        @if (appraisal()!.reviewer_overall_rating) {
                          <span class="ml-auto px-2 py-1 text-xs border rounded">{{ appraisal()!.reviewer_overall_rating }}/5</span>
                        }
                      </div>
                      <mat-slider 
                        min="1" 
                        max="5" 
                        step="1" 
                        discrete
                        disabled
                        class="opacity-70">
                        <input matSliderThumb [value]="appraisal()!.reviewer_overall_rating || 1">
                      </mat-slider>
                      <div>
                        <label class="text-sm font-medium text-foreground flex items-center gap-2">
                          <mat-icon class="h-4 w-4 text-primary">chat_bubble_outline</mat-icon> 
                          Overall Comments
                        </label>
                        <mat-form-field appearance="outline" class="w-full">
                          <textarea 
                            matInput 
                            rows="5"
                            [value]="appraisal()!.reviewer_overall_comments || 'No comments provided'"
                            readonly
                            class="bg-card/50 border-border resize-none">
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
                    [disabled]="loading()"
                    class="w-full sm:w-auto">
                    <mat-icon>chevron_left</mat-icon>
                    Previous Goal
                  </button>
                  <button
                    mat-raised-button
                    color="primary"
                    (click)="goHome()"
                    class="w-full sm:w-auto">
                    <mat-icon>home</mat-icon>
                    <span class="hidden sm:inline">Go Home</span>
                  </button>
                </div>
              </mat-card-content>
            </mat-card>
          }
        }
      </div>
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
export class AppraisalViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private appraisalService = inject(AppraisalService);
  private authService = inject(AuthService);

  Math = Math; // Make Math available in template

  loading = signal(false);
  appraisal = signal<AppraisalWithGoals | null>(null);
  currentIndex = signal(0);

  goals = computed(() => this.appraisal()?.appraisal_goals || []);
  totalGoals = computed(() => this.goals().length);
  showOverall = computed(() => this.appraisal()?.status === 'Complete');
  maxIndex = computed(() => this.showOverall() ? this.totalGoals() : Math.max(0, this.totalGoals() - 1));
  isOverallPage = computed(() => this.showOverall() && this.currentIndex() === this.totalGoals());
  currentGoal = computed(() => this.goals()[this.currentIndex()]);
  progressPercentage = computed(() => 
    this.totalGoals() > 0 ? Math.round((Math.min(this.currentIndex(), this.totalGoals()) / this.totalGoals()) * 100) : 100
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
      this.appraisal.set(appraisal);
      
      // Role/Status-based access guard
      const user = this.authService.getCurrentUser();
      if (!user) {
        this.router.navigate(['/'], { replaceUrl: true });
        return;
      }

      const status = appraisal.status;
      const isAppraisee = user.emp_id === appraisal.appraisee_id;
      const isAppraiser = user.emp_id === appraisal.appraiser_id;
      const isReviewer = user.emp_id === appraisal.reviewer_id;

      let allowed = false;
      if (isAppraisee) {
        // Appraisee can view only during Submitted (Waiting Acknowledgement), Self Assessment, or Complete
        allowed = status === 'Submitted' || status === 'Appraisee Self Assessment' || status === 'Complete';
      } else if (isAppraiser) {
        // Appraiser should NOT view during Appraiser/Reviewer Evaluation; allow Complete only
        allowed = status === 'Complete';
      } else if (isReviewer) {
        // Reviewer: allow Complete only (evaluation happens in its own page)
        allowed = status === 'Complete';
      }

      if (!allowed) {
        this.router.navigate(['/'], { replaceUrl: true });
      }
    } catch (error) {
      this.snackBar.open((error as any).message || 'Failed to load appraisal', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  displayStatus(status: string): string {
    return status === 'Submitted' ? 'Waiting Acknowledgement' : status;
  }

  previousGoal() {
    if (this.currentIndex() > 0) {
      this.currentIndex.set(this.currentIndex() - 1);
    }
  }

  nextGoal() {
    if (this.currentIndex() < this.maxIndex()) {
      this.currentIndex.set(this.currentIndex() + 1);
    }
  }

  goHome() {
    this.router.navigate(['/']);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}
