import { Routes } from '@angular/router';

export const goalTemplatesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./goal-templates.component').then(m => m.GoalTemplatesComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./create-goal-template/create-goal-template.component').then(m => m.CreateGoalTemplateComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./edit-goal-template/edit-goal-template.component').then(m => m.EditGoalTemplateComponent)
  }
];
