import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppStateService } from '../../services/app-state.service';

@Component({
  selector: 'app-quiz-select',
  standalone: true,
  template: `
    <div class="quiz-select-container">
      <div class="quiz-select-header">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <div>
          <h2>Luyện tập trắc nghiệm AI</h2>
          <p>Chọn một môn học để AI tạo bài kiểm tra trắc nghiệm luyện tập</p>
        </div>
      </div>

      <div class="quiz-select-grid">
        @for (course of availableCourses(); track course.id) {
          <div class="quiz-course-card" (click)="goToQuiz(course.id)">
            <div class="quiz-course-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>
            <div class="quiz-course-info">
              <h3>{{ course.name }}</h3>
              <span class="quiz-course-code">{{ course.code }}</span>
              <span class="quiz-course-lessons">{{ getLessonCount(course.id) }} bài giảng</span>
            </div>
            <div class="quiz-course-arrow">→</div>
          </div>
        }
      </div>

      @if (availableCourses().length === 0) {
        <div class="quiz-empty">
          <p>Chưa có môn học nào có dữ liệu để tạo quiz.</p>
        </div>
      }
    </div>
  `
})
export class QuizSelectComponent {
  state = inject(AppStateService);
  private router = inject(Router);

  availableCourses = () => {
    const lessons = this.state.lessons();
    return this.state.courses().filter(c => !!(lessons as any)[c.id]);
  };

  getLessonCount(courseId: number): number {
    const lessons = this.state.lessons();
    const data = (lessons as any)[courseId];
    return data?.lessons?.filter((l: any) => l.content).length || 0;
  }

  goToQuiz(courseId: number) {
    this.router.navigate(['/dashboard/quiz', courseId]);
  }
}
