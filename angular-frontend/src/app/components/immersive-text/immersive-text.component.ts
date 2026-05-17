import { Component, Input, inject, signal, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Lesson } from '../../models/course.model';

@Component({
  selector: 'app-immersive-text',
  standalone: true,
  template: `
    @if (loading()) {
      <div class="imm-loading">
        <div class="imm-loading-icon"><div class="imm-loading-spinner"></div><span class="imm-loading-emoji">🤖</span></div>
        <p class="imm-loading-title">Đang phân tích và thiết kế nội dung Immersive...</p>
        <p class="imm-loading-sub">AI đang đọc kỹ tài liệu và chuyển đổi thành nội dung học tập trực quan</p>
        <div class="imm-loading-dots"><span></span><span></span><span></span></div>
      </div>
    } @else if (data()) {
      <div class="imm-wrapper">
        <div class="imm-progress-bar"><div class="imm-progress-fill" [style.width.%]="scrollProgress()"></div></div>
        <div class="imm-scroll-area" #scrollArea (scroll)="onScroll()">
          @if (error()) { <div class="imm-error">⚠️ {{ error() }}</div> }
          <div class="imm-hero">
            <h1 class="imm-hero-title">{{ data()!.title }}</h1>
            @if (data()!.overview) { <p class="imm-hero-overview">{{ data()!.overview }}</p> }
            <div class="imm-hero-meta">
              @if (loadedFromCache()) { <span class="imm-cache-badge">⚡ Pre-trained</span> }
              <span>📚 {{ data()!.sections?.length || 0 }} phần kiến thức</span>
            </div>
          </div>
          <div class="imm-sections">
            @for (section of data()!.sections; track $index; let idx = $index) {
              <div class="imm-section" [style.animation-delay]="idx * 0.08 + 's'">
                <div class="imm-section-header">
                  <span class="imm-section-icon">{{ section.iconLabel || '📌' }}</span>
                  <div class="imm-section-header-text">
                    <span class="imm-section-number">Phần {{ idx + 1 }}</span>
                    <h2 class="imm-section-title">{{ section.heading }}</h2>
                  </div>
                </div>
                @if (section.keyInsight) {
                  <div class="imm-key-insight"><span class="imm-key-insight-icon">🔑</span><p>{{ section.keyInsight }}</p></div>
                }
                <div class="imm-body" [innerHTML]="renderMarkdown(section.content)"></div>
                @if (section.realWorldExample) {
                  <div class="imm-example"><div class="imm-example-header"><span>💡</span><h4>Ví dụ thực tế</h4></div><p>{{ section.realWorldExample }}</p></div>
                }
                @if (section.checklist && section.checklist.length > 0) {
                  <div class="imm-checklist">
                    <h4 class="imm-checklist-title">✅ Checklist ghi nhớ</h4>
                    <div class="imm-checklist-items">
                      @for (item of section.checklist; track $index; let i = $index) {
                        <label class="imm-checklist-item" [class.checked]="checklistState[idx+'-'+i]">
                          <input type="checkbox" [checked]="checklistState[idx+'-'+i]" (change)="toggleChecklist(idx, i)">
                          <span class="imm-checkbox-custom"></span>
                          <span class="imm-checklist-text" [class.done]="checklistState[idx+'-'+i]">{{ item }}</span>
                        </label>
                      }
                    </div>
                  </div>
                }
                @if (section.quiz) {
                  <div class="imm-quiz-wrapper">
                    <button class="imm-quiz-toggle" [class.open]="openQuizIdx() === idx" (click)="toggleQuiz(idx)">
                      <span>📝 Kiểm tra hiểu biết</span>
                      <span class="imm-quiz-chevron">{{ openQuizIdx() === idx ? '▲' : '▼' }}</span>
                    </button>
                    @if (openQuizIdx() === idx) {
                      <div class="imm-quiz-content">
                        <p class="imm-quiz-question">{{ section.quiz.question }}</p>
                        <div class="imm-quiz-options">
                          @for (opt of section.quiz.options; track $index; let optIdx = $index) {
                            <button class="imm-quiz-option"
                              [class.correct]="quizAnswered() && optIdx === section.quiz.correctIdx"
                              [class.wrong]="quizAnswered() && optIdx === quizSelected() && optIdx !== section.quiz.correctIdx"
                              [class.selected]="!quizAnswered() && optIdx === quizSelected()"
                              (click)="selectQuizAnswer(optIdx)">
                              <span class="imm-opt-letter">{{ getLetter(optIdx) }}</span>
                              <span class="imm-opt-text">{{ opt }}</span>
                            </button>
                          }
                        </div>
                        @if (quizAnswered()) {
                          <div class="imm-quiz-feedback" [class.correct]="quizSelected() === section.quiz.correctIdx" [class.wrong]="quizSelected() !== section.quiz.correctIdx">
                            {{ quizSelected() === section.quiz.correctIdx ? '✓ Chính xác! 🎯' : '✗ Chưa đúng!' }}
                            <p>{{ section.quiz.explanation }}</p>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
          <div class="imm-footer"><p>✨ Nội dung được AI phân tích từ tài liệu bài giảng gốc</p></div>
        </div>
      </div>
    }
  `
})
export class ImmersiveTextComponent implements OnInit {
  @Input() courseId!: string;
  @Input() lessonId!: string;
  @Input() lesson!: Lesson;

  private api = inject(ApiService);
  private sanitizer = inject(DomSanitizer);

  loading = signal(false);
  data = signal<any>(null);
  error = signal<string | null>(null);
  scrollProgress = signal(0);
  loadedFromCache = signal(false);
  openQuizIdx = signal<number | null>(null);
  quizSelected = signal<number | null>(null);
  quizAnswered = signal(false);
  checklistState: { [key: string]: boolean } = {};

  ngOnInit() {
    if (!this.lesson?.content) return;
    this.fetchData();
  }

  fetchData() {
    this.loading.set(true);
    this.error.set(null);
    const start = Date.now();
    this.api.getImmersiveText({
      courseId: this.courseId, lessonId: this.lessonId,
      title: this.lesson.content!.title,
      sections: this.lesson.content!.sections,
    }).subscribe({
      next: (result: any) => {
        if (!result.sections || result.sections.length === 0) {
          this.error.set('AI trả về dữ liệu không hợp lệ');
          this.useFallback();
        } else {
          this.data.set(result);
          if (Date.now() - start < 2000) this.loadedFromCache.set(true);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(`Lỗi AI: ${err.message || err.statusText}`);
        this.useFallback();
        this.loading.set(false);
      }
    });
  }

  private useFallback() {
    this.data.set({
      title: this.lesson.content!.title,
      overview: null,
      sections: this.lesson.content!.sections.map(s => ({
        iconLabel: '📄', heading: s.heading, keyInsight: null,
        content: s.text || (s.list ? s.list.map(item => `- ${item}`).join('\n') : ''),
        realWorldExample: null, checklist: [], quiz: null
      }))
    });
  }

  renderMarkdown(text: string): SafeHtml {
    if (!text) return '';
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/\n/g, '<br>');
    html = html.replace(/(<li>.*?<\/li>)+/gs, '<ul>$&</ul>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  onScroll() {
    // Would need ElementRef, simplified for now
  }

  toggleQuiz(idx: number) {
    if (this.openQuizIdx() === idx) { this.openQuizIdx.set(null); }
    else { this.openQuizIdx.set(idx); this.quizSelected.set(null); this.quizAnswered.set(false); }
  }

  selectQuizAnswer(optIdx: number) {
    if (this.quizAnswered()) return;
    this.quizSelected.set(optIdx);
    this.quizAnswered.set(true);
  }

  toggleChecklist(sIdx: number, iIdx: number) {
    const key = `${sIdx}-${iIdx}`;
    this.checklistState[key] = !this.checklistState[key];
  }

  getLetter(idx: number) { return String.fromCharCode(65 + idx); }
}
