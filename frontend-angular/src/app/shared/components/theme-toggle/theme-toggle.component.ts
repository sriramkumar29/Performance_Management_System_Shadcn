import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Observable } from 'rxjs';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <button 
      mat-icon-button 
      (click)="toggleTheme()"
      [attr.aria-label]="(darkMode$ | async) ? 'Switch to light mode' : 'Switch to dark mode'"
      class="transition-transform hover:scale-110"
    >
      <mat-icon>{{ (darkMode$ | async) ? 'light_mode' : 'dark_mode' }}</mat-icon>
    </button>
  `,
  styleUrl: './theme-toggle.component.scss'
})
export class ThemeToggleComponent {
  darkMode$: Observable<boolean>;

  constructor(private themeService: ThemeService) {
    this.darkMode$ = this.themeService.darkMode$;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
