import { Routes } from '@angular/router';

export const appraisalRoutes: Routes = [
  {
    path: 'my-appraisals',
    loadComponent: () => import('./my-appraisals/my-appraisals.component').then(m => m.MyAppraisalsComponent)
  },
  {
    path: 'team-appraisals',
    loadComponent: () => import('./team-appraisals/team-appraisals.component').then(m => m.TeamAppraisalsComponent)
  },
  {
    path: 'create',
    loadComponent: () => import('./create-appraisal/create-appraisal.component').then(m => m.CreateAppraisalComponent)
  },
  {
    path: ':id/view',
    loadComponent: () => import('./appraisal-view/appraisal-view.component').then(m => m.AppraisalViewComponent)
  },
  {
    path: ':id/self-assessment',
    loadComponent: () => import('./self-assessment/self-assessment.component').then(m => m.SelfAssessmentComponent)
  },
  {
    path: ':id/appraiser-evaluation',
    loadComponent: () => import('./appraiser-evaluation/appraiser-evaluation.component').then(m => m.AppraiserEvaluationComponent)
  },
  {
    path: ':id/reviewer-evaluation',
    loadComponent: () => import('./reviewer-evaluation/reviewer-evaluation.component').then(m => m.ReviewerEvaluationComponent)
  },
  { path: '', redirectTo: 'my-appraisals', pathMatch: 'full' }
];
