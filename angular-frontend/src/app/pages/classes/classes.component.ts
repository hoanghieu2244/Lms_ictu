import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppStateService } from '../../services/app-state.service';

@Component({
  selector: 'app-classes',
  standalone: true,
  template: `
    <div class="classes-page">
      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="filter-group">
          <label>Năm học</label>
          <select class="filter-select">
            <option>2025-2026</option>
            <option>2024-2025</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Học kỳ</label>
          <select class="filter-select">
            <option>Học kỳ 1</option>
            <option>Học kỳ 2</option>
          </select>
        </div>
      </div>

      <!-- Course List -->
      <div class="course-list">
        @for (course of state.courses(); track course.id) {
          <div class="course-row" (click)="goToCourse(course.id)">
            <div class="course-progress-circle">
              <svg width="60" height="60" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="24" fill="none" stroke="#e8e8e8" stroke-width="4"/>
                <circle cx="30" cy="30" r="24" fill="none"
                  [attr.stroke]="getProgressColor(course.progress || 100)"
                  stroke-width="4"
                  [attr.stroke-dasharray]="circumference"
                  [attr.stroke-dashoffset]="getDashOffset(course.progress || 100)"
                  stroke-linecap="round"
                  transform="rotate(-90 30 30)"/>
              </svg>
              <span class="progress-label" [style.color]="getProgressColor(course.progress || 100)">{{ course.progress || 100 }}%</span>
            </div>
            <div class="course-details">
              <a class="course-title-link">{{ course.name }}-1-25 ({{ course.code }})</a>
              <div class="course-meta-row">
                <span>- Học kỳ: {{ course.semester || '2025_2026_1' }}</span>
                <span class="meta-separator">-</span>
                <span>Giảng viên: <strong>{{ course.teacher }}</strong></span>
              </div>
            </div>
            <div class="course-phone">{{ course.phone }}</div>
            <div class="course-stats">
              <div class="stat-cell">
                <span class="stat-value">{{ course.credits || 3 }}</span>
                <span class="stat-label">Tín chỉ</span>
              </div>
              <div class="stat-cell">
                <span class="stat-value highlight">{{ course.weeks }}</span>
                <span class="stat-label">Tuần</span>
              </div>
              <div class="stat-cell">
                <span class="stat-value">{{ course.absences }}</span>
                <span class="stat-label">Buổi vắng</span>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class ClassesComponent {
  state = inject(AppStateService);
  private router = inject(Router);

  private r = 24;
  circumference = 2 * Math.PI * this.r;

  getDashOffset(percent: number) {
    return this.circumference - (percent / 100) * this.circumference;
  }

  getProgressColor(percent: number): string {
    if (percent >= 100) return '#00a65a';
    if (percent >= 80) return '#3c8dbc';
    if (percent >= 50) return '#f39c12';
    return '#dd4b39';
  }

  goToCourse(id: number) {
    this.router.navigate(['/dashboard/classes/learning', id]);
  }
}
