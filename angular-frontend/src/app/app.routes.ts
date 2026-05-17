import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';

export const routes: Routes = [
  {
    path: 'dashboard',
    component: LayoutComponent,
    children: [
      { path: 'bulletin-board', loadComponent: () => import('./pages/bulletin-board/bulletin-board.component').then(m => m.BulletinBoardComponent) },
      { path: 'schedule', loadComponent: () => import('./pages/schedule/schedule.component').then(m => m.ScheduleComponent) },
      { path: 'classes', loadComponent: () => import('./pages/classes/classes.component').then(m => m.ClassesComponent) },
      { path: 'classes/learning/:courseId', loadComponent: () => import('./pages/course-learning/course-learning.component').then(m => m.CourseLearningComponent) },
      { path: 'results', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'quiz', loadComponent: () => import('./pages/quiz-select/quiz-select.component').then(m => m.QuizSelectComponent) },
      { path: 'quiz/:courseId', loadComponent: () => import('./pages/quiz/quiz.component').then(m => m.QuizComponent) },
      { path: 'upload', loadComponent: () => import('./pages/upload/upload.component').then(m => m.UploadComponent) },
      { path: '', redirectTo: 'bulletin-board', pathMatch: 'full' },
    ]
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' },
];
