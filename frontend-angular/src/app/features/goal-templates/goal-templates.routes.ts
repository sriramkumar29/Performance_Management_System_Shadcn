import { Routes } from '@angular/router';
import { RoleGuard } from '../../core/guards/role.guard';
import { Permission, Role } from '../../core/services/permissions.service';

export const goalTemplatesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./goal-templates.component').then(m => m.GoalTemplatesComponent),
    canActivate: [RoleGuard],
    data: { permissions: [Permission.VIEW_GOAL_TEMPLATES] }
  },
  {
    path: 'new',
    loadComponent: () => import('./create-goal-template/create-goal-template.component').then(m => m.CreateGoalTemplateComponent),
    canActivate: [RoleGuard],
    data: { permissions: [Permission.CREATE_GOAL_TEMPLATE] }
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./edit-goal-template/edit-goal-template.component').then(m => m.EditGoalTemplateComponent),
    canActivate: [RoleGuard],
    data: { permissions: [Permission.EDIT_GOAL_TEMPLATE] }
  }
];
