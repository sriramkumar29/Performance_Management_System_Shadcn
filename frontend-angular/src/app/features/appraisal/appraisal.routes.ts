import { Routes } from '@angular/router';
import { RoleGuard } from '../../core/guards/role.guard';
import { Permission, Role } from '../../core/services/permissions.service';

export const appraisalRoutes: Routes = [
  {
    path: 'my-appraisals',
    loadComponent: () => import('./my-appraisals/my-appraisals.component').then(m => m.MyAppraisalsComponent),
    canActivate: [RoleGuard],
    data: { permissions: [Permission.VIEW_OWN_APPRAISAL] }
  },
  {
    path: 'team-appraisals',
    loadComponent: () => import('./team-appraisals/team-appraisals.component').then(m => m.TeamAppraisalsComponent),
    canActivate: [RoleGuard],
    data: { permissions: [Permission.VIEW_TEAM_APPRAISALS] }
  },
  {
    path: 'create',
    loadComponent: () => import('./create-appraisal/create-appraisal.component').then(m => m.CreateAppraisalComponent),
    canActivate: [RoleGuard],
    data: { permissions: [Permission.CREATE_APPRAISAL] }
  },
  {
    path: ':id/view',
    loadComponent: () => import('./appraisal-view/appraisal-view.component').then(m => m.AppraisalViewComponent),
    canActivate: [RoleGuard],
    data: { permissions: [Permission.VIEW_OWN_APPRAISAL, Permission.VIEW_TEAM_APPRAISALS] }
  },
  {
    path: ':id/self-assessment',
    loadComponent: () => import('./self-assessment/self-assessment.component').then(m => m.SelfAssessmentComponent),
    canActivate: [RoleGuard],
    data: { permissions: [Permission.COMPLETE_SELF_ASSESSMENT] }
  },
  {
    path: ':id/appraiser-evaluation',
    loadComponent: () => import('./appraiser-evaluation/appraiser-evaluation.component').then(m => m.AppraiserEvaluationComponent),
    canActivate: [RoleGuard],
    data: { permissions: [Permission.CONDUCT_APPRAISER_EVALUATION] }
  },
  {
    path: ':id/reviewer-evaluation',
    loadComponent: () => import('./reviewer-evaluation/reviewer-evaluation.component').then(m => m.ReviewerEvaluationComponent),
    canActivate: [RoleGuard],
    data: { permissions: [Permission.CONDUCT_REVIEWER_EVALUATION] }
  },
  { path: '', redirectTo: 'my-appraisals', pathMatch: 'full' }
];
