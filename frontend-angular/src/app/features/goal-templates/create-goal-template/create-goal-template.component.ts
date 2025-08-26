import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { EditGoalTemplateComponent } from '../edit-goal-template/edit-goal-template.component';

@Component({
  selector: 'app-create-goal-template',
  standalone: true,
  imports: [CommonModule, EditGoalTemplateComponent],
  template: `
    <app-edit-goal-template></app-edit-goal-template>
  `
})
export class CreateGoalTemplateComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  ngOnInit() {
    // Check authorization - only managers and above can create templates
    if (!this.isManagerOrAbove()) {
      this.snackBar.open('You are not authorized to create goal templates', 'Close', { duration: 3000 });
      this.router.navigate(['/goal-templates']);
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
}
