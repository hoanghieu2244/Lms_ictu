import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-micro-activity',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="micro-activity-overlay" (click)="closeEvent.emit()">
      <div class="micro-activity-card" (click)="$event.stopPropagation()">
        <div class="activity-header">
          <h3>{{ getTypeLabel() }}</h3>
          <button class="close-btn" (click)="closeEvent.emit()">✕</button>
        </div>
        <div class="activity-body">
          <div class="activity-question">{{ activity.question }}</div>

          @if (activity.type === 'fill_blank') {
            <input class="activity-input" type="text" placeholder="Nhập câu trả lời..." [(ngModel)]="answer" (keydown.enter)="!submitted() && handleSubmit()" [disabled]="submitted()" autofocus>
            @if (activity.hint && !submitted()) {
              <div style="margin-top:8px;font-size:12px;color:#999">💡 Gợi ý: {{ activity.hint }}</div>
            }
          }

          @if (activity.type === 'true_false') {
            <div class="activity-options">
              @for (val of [true, false]; track val) {
                <button class="option-btn"
                  [class.selected]="selectedOption() === val"
                  [class.correct]="submitted() && val === activity.answer"
                  [class.incorrect]="submitted() && selectedOption() === val && val !== activity.answer"
                  (click)="!submitted() && selectedOption.set(val)" [disabled]="submitted()">
                  <span class="option-key">{{ val ? 'Đ' : 'S' }}</span>
                  {{ val ? 'Đúng' : 'Sai' }}
                </button>
              }
            </div>
          }

          @if (activity.type === 'multiple_choice') {
            <div class="activity-options">
              @for (opt of activity.options; track $index; let idx = $index) {
                <button class="option-btn"
                  [class.selected]="selectedOption() === idx"
                  [class.correct]="submitted() && idx === activity.correctIdx"
                  [class.incorrect]="submitted() && selectedOption() === idx && idx !== activity.correctIdx"
                  (click)="!submitted() && selectedOption.set(idx)" [disabled]="submitted()">
                  <span class="option-key">{{ getLetter(idx) }}</span>
                  {{ opt }}
                </button>
              }
            </div>
          }

          @if (!submitted()) {
            <button class="submit-btn" (click)="handleSubmit()"
              [disabled]="activity.type === 'fill_blank' ? !answer.trim() : selectedOption() === null">
              Kiểm tra
            </button>
          }

          @if (submitted()) {
            <div class="feedback" [class.correct]="isCorrect()" [class.incorrect]="!isCorrect()">
              {{ isCorrect() ? activity.feedbackCorrect : activity.feedbackIncorrect }}
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class MicroActivityComponent {
  @Input() activity: any;
  @Output() closeEvent = new EventEmitter<void>();

  answer = '';
  selectedOption = signal<any>(null);
  submitted = signal(false);

  handleSubmit() {
    this.submitted.set(true);
  }

  isCorrect(): boolean {
    if (this.activity.type === 'fill_blank') return this.answer.trim().toLowerCase() === this.activity.answer.toLowerCase();
    if (this.activity.type === 'true_false') return this.selectedOption() === this.activity.answer;
    if (this.activity.type === 'multiple_choice') return this.selectedOption() === this.activity.correctIdx;
    return false;
  }

  getTypeLabel() {
    switch (this.activity.type) {
      case 'fill_blank': return '✏️ Điền khuyết';
      case 'true_false': return '✅ Đúng / Sai';
      case 'multiple_choice': return '🔘 Trắc nghiệm';
      default: return '🎯 Luyện tập';
    }
  }

  getLetter(idx: number) { return String.fromCharCode(65 + idx); }
}
