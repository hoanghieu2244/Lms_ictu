import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppStateService } from '../../services/app-state.service';
import { ApiService } from '../../services/api.service';
import { QuizQuestion, QuizHistoryEntry } from '../../models/course.model';

@Component({
  selector: 'app-quiz',
  standalone: true,
  template: `
    <!-- LOADING -->
    @if (loading()) {
      <div class="quiz-page-wrapper">
        <div class="quiz-loading-screen">
          <div class="quiz-loading-icon">
            <span style="font-size:28px;color:var(--agent-primary)">AI</span>
            <div class="quiz-loading-ring"></div>
          </div>
          <h3>Quiz Generator Agent đang chuẩn bị đề...</h3>
          <p>AI đang phân tích bài giảng <strong>{{ courseName }}</strong> và tạo đề kiểm tra</p>
          <div class="quiz-loading-dots"><span></span><span></span><span></span></div>
        </div>
      </div>
    }

    <!-- ERROR -->
    @else if (error()) {
      <div class="quiz-page-wrapper">
        <div class="quiz-error-screen">
          <div class="quiz-error-icon" style="font-size:28px;color:var(--warning)">!</div>
          <h3>Không thể tạo bài kiểm tra</h3>
          <p>{{ error() }}</p>
          <div class="quiz-error-actions">
            <button class="quiz-btn quiz-btn-primary" (click)="fetchQuiz()">Thử lại</button>
            <button class="quiz-btn quiz-btn-outline" (click)="router.navigate(['/dashboard/quiz'])">← Chọn môn khác</button>
          </div>
        </div>
      </div>
    }

    <!-- HISTORY VIEW -->
    @else if (showHistoryView()) {
      <div class="quiz-page-wrapper">
        <div class="quiz-history-container" style="width:100%;max-width:800px;margin:0 auto">
          <div class="quiz-history-header">
            <div class="quiz-history-header-left">
              <button class="quiz-back-btn" (click)="showHistoryView.set(false)" style="margin-right:1rem">←</button>
              <div><h2>Lịch sử môn: {{ courseName }}</h2><p>Theo dõi tiến trình học tập</p></div>
            </div>
          </div>
          <div class="quiz-history-stats">
            <div class="quiz-history-stat-card"><div class="stat-icon" style="background:#6366f115;color:#6366f1"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div><div class="stat-info"><span class="stat-value">{{ history().length }}</span><span class="stat-label">Lần làm</span></div></div>
            <div class="quiz-history-stat-card"><div class="stat-icon" style="background:#10b98115;color:#10b981"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div><div class="stat-info"><span class="stat-value">{{ avgScore() }}%</span><span class="stat-label">Trung bình</span></div></div>
            <div class="quiz-history-stat-card"><div class="stat-icon" style="background:#f59e0b15;color:#f59e0b"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div><div class="stat-info"><span class="stat-value">{{ bestScore() }}%</span><span class="stat-label">Cao nhất</span></div></div>
          </div>
          @if (historyLoading()) {
            <div class="quiz-history-loading"><div class="quiz-loading-dots"><span></span><span></span><span></span></div></div>
          } @else if (history().length === 0) {
            <div class="quiz-history-empty"><h3>Chưa có bài thi nào</h3><button class="quiz-btn quiz-btn-primary" (click)="showHistoryView.set(false); fetchQuiz(true)">Tạo đề mới ngay</button></div>
          } @else {
            <div class="quiz-history-timeline">
              @for (entry of history(); track $index) {
                <div class="quiz-history-card">
                  <div class="history-card-left"><div class="history-score-ring" [style.border-color]="getGradeColor(entry.percent)"><span [style.color]="getGradeColor(entry.percent)">{{ entry.percent }}%</span></div></div>
                  <div class="history-card-body">
                    <div class="history-card-top"><h4>{{ entry.courseName }}</h4><span class="history-grade-badge" [style.color]="getGradeColor(entry.percent)">{{ getGradeLabel(entry.percent) }}</span></div>
                    <div class="history-card-meta"><span>✓ {{ entry.score }} đúng</span><span>✗ {{ entry.total - entry.score }} sai</span><span class="history-date">{{ formatDate(entry.date) }}</span></div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    }

    <!-- RESULTS -->
    @else if (showResults()) {
      <div class="quiz-page-wrapper">
        <div class="quiz-results-card">
          <div class="quiz-results-header">
            <div class="quiz-results-emoji">{{ getResultEmoji() }}</div>
            <h2>{{ getResultText() }}</h2>
            <p class="quiz-results-course">{{ courseName }}</p>
          </div>
          <div class="quiz-results-score-ring">
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" stroke-width="8"/>
              <circle cx="60" cy="60" r="52" fill="none" [attr.stroke]="getGradeColor(getPercent())" stroke-width="8"
                [attr.stroke-dasharray]="(getPercent()/100)*327 + ' 327'"
                stroke-linecap="round" style="transform:rotate(-90deg);transform-origin:50% 50%;transition:stroke-dasharray 1s ease"/>
            </svg>
            <div class="quiz-results-score-text">
              <span class="quiz-results-percent" [style.color]="getGradeColor(getPercent())">{{ getPercent() }}%</span>
              <span class="quiz-results-fraction">{{ getScore() }}/{{ quizData().length }}</span>
            </div>
          </div>
          <div class="quiz-results-stats">
            <div class="quiz-stat-item"><span style="color:#10b981">✓</span><span>{{ getScore() }} đúng</span></div>
            <div class="quiz-stat-item"><span style="color:#ef4444">✗</span><span>{{ quizData().length - getScore() }} sai</span></div>
            <div class="quiz-stat-item"><span style="color:#6366f1">⏱</span><span>{{ formatTime(timeTaken()) }}</span></div>
          </div>
          <div class="quiz-results-answers">
            <h4>Chi tiết từng câu</h4>
            <div class="quiz-results-grid">
              @for (qq of quizData(); track $index; let idx = $index) {
                <div class="quiz-result-dot" [class.correct]="isQuestionCorrect(idx)" [class.incorrect]="!isQuestionCorrect(idx) && answers()[idx] !== undefined" [class.unanswered]="answers()[idx] === undefined">{{ idx + 1 }}</div>
              }
            </div>
          </div>
          <div class="quiz-results-actions">
            <button class="quiz-btn quiz-btn-outline" (click)="retryQuiz()">Làm lại đề này</button>
            <button class="quiz-btn quiz-btn-primary" (click)="fetchQuiz()">Bộ đề mới</button>
            <button class="quiz-btn quiz-btn-outline" (click)="showHistoryView.set(true)">Lịch sử</button>
            <button class="quiz-btn quiz-btn-ghost" (click)="router.navigate(['/dashboard/quiz'])">← Chọn môn khác</button>
          </div>
        </div>
      </div>
    }

    <!-- QUIZ QUESTION -->
    @else if (quizData().length > 0) {
      <div class="quiz-page-wrapper">
        <div class="quiz-top-bar">
          <div class="quiz-top-left">
            <button class="quiz-back-btn" (click)="router.navigate(['/dashboard/quiz'])">←</button>
            <div class="quiz-top-info">
              <h2>{{ courseName }}</h2>
              @if (bankInfo()) {
                <span class="quiz-bank-badge">{{ bankInfo()!.picked }} câu</span>
              }
            </div>
          </div>
          <div class="quiz-top-right"><span class="quiz-counter">{{ currentQ() + 1 }} / {{ quizData().length }}</span></div>
        </div>
        <div class="quiz-progress-track"><div class="quiz-progress-fill" [style.width.%]="((currentQ()+1)/quizData().length)*100"></div></div>
        <div class="quiz-card">
          <div class="quiz-card-header">
            <span class="quiz-q-number">Câu {{ currentQ() + 1 }}</span>
            <span class="quiz-difficulty-badge" [style.color]="getDiffColor(currentQuestion().difficulty)">{{ getDiffLabel(currentQuestion().difficulty) }}</span>
            <span class="quiz-type-badge">{{ currentQuestion().type === 'multiple_choice' ? 'Trắc nghiệm' : 'Đ/S' }}</span>
          </div>
          <div class="quiz-question-text">{{ currentQuestion().question }}</div>

          @if (currentQuestion().type === 'multiple_choice') {
            <div class="quiz-options">
              @for (opt of currentQuestion().options!; track $index; let idx = $index) {
                <button class="quiz-option"
                  [class.quiz-opt-selected]="!submitted() && answers()[currentQ()] === idx"
                  [class.quiz-opt-correct]="submitted() && idx === currentQuestion().correctIdx"
                  [class.quiz-opt-incorrect]="submitted() && answers()[currentQ()] === idx && idx !== currentQuestion().correctIdx"
                  [class.quiz-opt-muted]="submitted() && idx !== currentQuestion().correctIdx && answers()[currentQ()] !== idx"
                  (click)="handleAnswer(idx)" [disabled]="submitted()">
                  <span class="quiz-opt-letter">{{ getLetter(idx) }}</span>
                  <span class="quiz-opt-text">{{ opt }}</span>
                  @if (submitted() && idx === currentQuestion().correctIdx) { <span class="quiz-opt-icon correct">✓</span> }
                  @if (submitted() && answers()[currentQ()] === idx && idx !== currentQuestion().correctIdx) { <span class="quiz-opt-icon incorrect">✗</span> }
                </button>
              }
            </div>
          }

          @if (currentQuestion().type === 'true_false') {
            <div class="quiz-options quiz-options-tf">
              @for (val of [true, false]; track val) {
                <button class="quiz-option quiz-option-tf"
                  [class.quiz-opt-selected]="!submitted() && answers()[currentQ()] === val"
                  [class.quiz-opt-correct]="submitted() && val === currentQuestion().answer"
                  [class.quiz-opt-incorrect]="submitted() && answers()[currentQ()] === val && val !== currentQuestion().answer"
                  [class.quiz-opt-muted]="submitted() && val !== currentQuestion().answer && answers()[currentQ()] !== val"
                  (click)="handleAnswer(val)" [disabled]="submitted()">
                  <span class="quiz-tf-icon">{{ val ? 'Đ' : 'S' }}</span>
                  <span class="quiz-opt-text">{{ val ? 'Đúng' : 'Sai' }}</span>
                </button>
              }
            </div>
          }

          @if (!submitted() && answers()[currentQ()] !== undefined) {
            <button class="quiz-btn quiz-btn-check" (click)="submitQuestion()">✓ Kiểm tra đáp án</button>
          }

          @if (submitted()) {
            <div class="quiz-explanation" [class.correct]="isCurrentCorrect()" [class.incorrect]="!isCurrentCorrect()">
              <div class="quiz-explanation-header">
                {{ isCurrentCorrect() ? '✓ Chính xác!' : '✗ Chưa đúng!' }}
              </div>
              <div class="quiz-explanation-body">
                <span class="quiz-explanation-bulb" style="font-weight:700;color:var(--agent-primary)">i</span>
                <p>{{ currentQuestion().explanation }}</p>
              </div>
            </div>
          }
        </div>
        <div class="quiz-nav-bar">
          <button class="quiz-btn quiz-btn-outline" (click)="prevQuestion()" [disabled]="currentQ() === 0">← Câu trước</button>
          <div class="quiz-nav-dots">
            @for (q of quizData(); track $index; let idx = $index) {
              <span class="quiz-nav-dot" [class.active]="idx === currentQ()" [class.answered]="answers()[idx] !== undefined"></span>
            }
          </div>
          <button class="quiz-btn quiz-btn-primary" (click)="nextQuestion()">
            {{ currentQ() === quizData().length - 1 ? 'Xem kết quả →' : 'Câu tiếp →' }}
          </button>
        </div>
      </div>
    }

    <!-- EMPTY -->
    @else {
      <div class="quiz-page-wrapper">
        <div class="quiz-error-screen">
          <div class="quiz-error-icon" style="font-size:24px;color:var(--text-light)">?</div>
          <h3>Chưa có câu hỏi</h3>
          <div class="quiz-error-actions" style="display:flex;gap:1rem;margin-top:1.5rem;justify-content:center">
            <button class="quiz-btn quiz-btn-primary" (click)="fetchQuiz(true)">Tạo đề mới</button>
            <button class="quiz-btn quiz-btn-outline" (click)="showHistoryView.set(true)">Xem lịch sử</button>
          </div>
        </div>
      </div>
    }
  `
})
export class QuizComponent implements OnInit {
  private route = inject(ActivatedRoute);
  router = inject(Router);
  private state = inject(AppStateService);
  private api = inject(ApiService);

  courseId = '';
  courseName = '';
  loading = signal(true);
  error = signal('');
  quizData = signal<QuizQuestion[]>([]);
  bankInfo = signal<{ total: number; picked: number } | null>(null);
  currentQ = signal(0);
  answers = signal<{ [key: number]: any }>({});
  submitted = signal(false);
  showResults = signal(false);
  showHistoryView = signal(false);
  history = signal<QuizHistoryEntry[]>([]);
  historyLoading = signal(false);
  startTime = Date.now();
  timeTaken = signal(0);
  historySaved = false;

  ngOnInit() {
    this.courseId = this.route.snapshot.paramMap.get('courseId') || '';
    const courses = this.state.courses();
    const lessons = this.state.lessons() as any;
    this.courseName = courses.find(c => String(c.id) === this.courseId)?.name || lessons[this.courseId]?.courseName || 'Môn học';
    this.fetchQuiz();
  }

  fetchQuiz(forceNew = false) {
    this.loading.set(true);
    this.error.set('');
    this.quizData.set([]);
    this.currentQ.set(0);
    this.answers.set({});
    this.submitted.set(false);
    this.showResults.set(false);
    this.showHistoryView.set(false);
    this.startTime = Date.now();
    this.historySaved = false;

    const lessons = this.state.lessons() as any;
    const courseContent = lessons[this.courseId];
    let text = '';
    if (courseContent) {
      courseContent.lessons.forEach((l: any) => {
        if (l.content) {
          text += `\n${l.content.title}\n`;
          l.content.sections.forEach((s: any) => {
            text += `${s.heading}: ${s.text || ''} ${s.list ? s.list.join(', ') : ''}\n`;
          });
        }
      });
    }
    if (!text.trim()) text = 'Kiến thức đại cương môn ' + this.courseName;

    this.api.generateQuiz(text, this.courseId, forceNew ? 'new_set' : 'random').subscribe({
      next: (data: any) => {
        if (data.questions) {
          this.quizData.set(data.questions);
          this.bankInfo.set({ total: data.bankTotal, picked: data.pickedCount });
        } else if (Array.isArray(data)) {
          this.quizData.set(data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Có lỗi xảy ra khi tạo quiz bằng AI. Vui lòng thử lại sau.');
        this.loading.set(false);
      }
    });
  }

  currentQuestion(): QuizQuestion {
    return this.quizData()[this.currentQ()] || { question: '', type: 'multiple_choice', explanation: '' };
  }

  handleAnswer(value: any) {
    if (this.submitted()) return;
    this.answers.update(a => ({ ...a, [this.currentQ()]: value }));
  }

  submitQuestion() { this.submitted.set(true); }

  nextQuestion() {
    if (this.currentQ() < this.quizData().length - 1) {
      this.currentQ.update(v => v + 1);
      this.submitted.set(false);
    } else {
      this.timeTaken.set(Date.now() - this.startTime);
      this.showResults.set(true);
      this.saveHistory();
    }
  }

  prevQuestion() {
    if (this.currentQ() > 0) {
      this.currentQ.update(v => v - 1);
      this.submitted.set(true);
    }
  }

  retryQuiz() {
    this.currentQ.set(0);
    this.answers.set({});
    this.submitted.set(false);
    this.showResults.set(false);
    this.historySaved = false;
  }

  getScore(): number {
    let correct = 0;
    this.quizData().forEach((q, idx) => {
      if (q.type === 'multiple_choice' && this.answers()[idx] === q.correctIdx) correct++;
      if (q.type === 'true_false' && this.answers()[idx] === q.answer) correct++;
    });
    return correct;
  }

  getPercent(): number { return Math.round((this.getScore() / this.quizData().length) * 100); }

  isCurrentCorrect(): boolean {
    const q = this.currentQuestion();
    if (q.type === 'multiple_choice') return this.answers()[this.currentQ()] === q.correctIdx;
    if (q.type === 'true_false') return this.answers()[this.currentQ()] === q.answer;
    return false;
  }

  isQuestionCorrect(idx: number): boolean {
    const q = this.quizData()[idx];
    if (q.type === 'multiple_choice') return this.answers()[idx] === q.correctIdx;
    if (q.type === 'true_false') return this.answers()[idx] === q.answer;
    return false;
  }

  getLetter(idx: number) { return String.fromCharCode(65 + idx); }
  getDiffColor(d?: string) { return d === 'easy' ? '#10b981' : d === 'hard' ? '#ef4444' : '#f59e0b'; }
  getDiffLabel(d?: string) { return d === 'easy' ? 'Dễ' : d === 'hard' ? 'Khó' : 'TB'; }
  getGradeColor(p: number) { return p >= 90 ? '#10b981' : p >= 70 ? '#3b82f6' : p >= 50 ? '#f59e0b' : '#ef4444'; }
  getGradeLabel(p: number) { return p >= 90 ? 'Xuất sắc' : p >= 70 ? 'Tốt' : p >= 50 ? 'Khá' : 'Cần cố gắng'; }
  getResultEmoji() { const p = this.getPercent(); return p >= 90 ? 'A+' : p >= 70 ? 'B+' : p >= 50 ? 'C' : 'D'; }
  getResultText() { const p = this.getPercent(); return p >= 90 ? 'Xuất sắc!' : p >= 70 ? 'Tốt lắm!' : p >= 50 ? 'Khá!' : 'Cần cố gắng thêm!'; }

  formatTime(ms: number) {
    const sec = Math.floor(ms / 1000); const m = Math.floor(sec / 60); const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  formatDate(dateStr: string) {
    const d = new Date(dateStr); const diff = Date.now() - d.getTime();
    if (Math.floor(diff / 60000) < 1) return 'Vừa xong';
    if (Math.floor(diff / 60000) < 60) return `${Math.floor(diff / 60000)} phút trước`;
    if (Math.floor(diff / 3600000) < 24) return `${Math.floor(diff / 3600000)} giờ trước`;
    return d.toLocaleDateString('vi-VN');
  }

  avgScore() { const h = this.history(); return h.length ? Math.round(h.reduce((a, e) => a + (e.percent || 0), 0) / h.length) : 0; }
  bestScore() { const h = this.history(); return h.length ? Math.max(...h.map(e => e.percent || 0)) : 0; }

  private saveHistory() {
    if (this.historySaved) return;
    this.historySaved = true;
    this.api.saveQuizHistory({
      courseId: this.courseId, courseName: this.courseName,
      score: this.getScore(), total: this.quizData().length,
      percent: this.getPercent(), timeTaken: this.timeTaken(),
      date: new Date().toISOString()
    }).subscribe();
  }
}
