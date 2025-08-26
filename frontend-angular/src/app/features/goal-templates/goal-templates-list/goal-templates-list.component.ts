import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-goal-templates-list',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="animate-fade-in">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-foreground mb-2">Goal Templates</h1>
        <p class="text-muted-foreground">Manage performance goal templates</p>
      </div>

      <mat-card class="p-8 text-center">
        <mat-icon class="text-6xl text-muted-foreground mb-4">template_add</mat-icon>
        <h3 class="text-lg font-semibold text-foreground mb-2">Component Under Development</h3>
        <p class="text-muted-foreground mb-4">This component will be migrated from the React version</p>
        <button mat-raised-button color="primary" disabled>
          Coming Soon
        </button>
      </mat-card>
    </div>
  `,
  styleUrl: './goal-templates-list.component.scss'
})
export class GoalTemplatesListComponent {}
