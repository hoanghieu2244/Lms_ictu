import { Injectable, signal, computed } from '@angular/core';
import { Course, CourseData, QuizQuestion } from '../models/course.model';
import { COURSES } from '../data/courses.data';
import { LESSONS } from '../data/lessons.data';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  private _sidebarCollapsed = signal(false);
  private _chatOpen = signal(false);

  readonly courses = signal<Course[]>(COURSES);
  readonly lessons = signal<{ [key: number]: CourseData }>(LESSONS);
  readonly sidebarCollapsed = computed(() => this._sidebarCollapsed());
  readonly chatOpen = computed(() => this._chatOpen());
  readonly user = signal({ name: 'Sinh viên', id: 'SV001', email: 'sinhvien@ictu.edu.vn' });

  toggleSidebar() {
    this._sidebarCollapsed.update(v => !v);
  }

  setSidebarCollapsed(val: boolean) {
    this._sidebarCollapsed.set(val);
  }

  setChatOpen(val: boolean) {
    this._chatOpen.set(val);
  }

  toggleChat() {
    this._chatOpen.update(v => !v);
  }
}
