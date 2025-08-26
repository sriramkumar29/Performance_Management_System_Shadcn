import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'appraisals',
    loadChildren: () => import('./features/appraisal/appraisal.routes').then(m => m.appraisalRoutes),
    canActivate: [AuthGuard]
  },
  {
    path: 'goal-templates',
    loadChildren: () => import('./features/goal-templates/goal-templates.routes').then(m => m.goalTemplatesRoutes),
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '/dashboard' }
];
