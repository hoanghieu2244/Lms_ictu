import { Component, inject, signal, OnInit } from '@angular/core';
import { AppStateService } from '../../services/app-state.service';
import { ApiService } from '../../services/api.service';
import { UploadedFile } from '../../models/course.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div style="max-width:800px;margin:0 auto;padding:20px 0">
      <div class="page-header" style="margin-bottom:24px">
        <h1 style="font-size:24px;font-weight:700;margin-bottom:8px">Upload bài giảng</h1>
        <p style="color:var(--text-secondary)">Tải lên file bài giảng (PDF, Word, PPT) để AI Agent phân tích.</p>
      </div>

      @if (step() === 'upload') {
        <div class="card">
          <div class="card-body">
            <div class="upload-selectors">
              <div class="selector-group">
                <label class="selector-label">🎓 Môn học <span class="required">*</span></label>
                <select class="selector-select" [ngModel]="selectedCourseId()" (ngModelChange)="onCourseChange($event)">
                  <option value="">— Chọn môn học —</option>
                  @for (c of state.courses(); track c.id) {
                    <option [value]="c.id">{{ c.name }} ({{ c.code }})</option>
                  }
                </select>
              </div>
              <div class="selector-group">
                <label class="selector-label">📖 Bài giảng</label>
                <select class="selector-select" [ngModel]="selectedLessonId()" (ngModelChange)="selectedLessonId.set($event)" [disabled]="!selectedCourseId() || courseLessons().length === 0">
                  <option value="">— Chung (không chọn bài cụ thể) —</option>
                  @for (l of courseLessons(); track l.id) {
                    <option [value]="l.id">{{ l.name }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="upload-zone" [class.drag-active]="dragActive()"
              (dragenter)="onDrag($event, true)" (dragleave)="onDrag($event, false)" (dragover)="onDragOver($event)" (drop)="onDrop($event)"
              (click)="fileInput.click()">
              <input #fileInput type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx" style="display:none" (change)="onFileChange($event)">
              <div class="upload-icon">📤</div>
              <h3>Bấm để chọn hoặc kéo thả file vào đây</h3>
              <p>Hỗ trợ: PDF, DOCX, PPTX (Tối đa 200MB/file)</p>
            </div>

            @if (uploadError()) { <div class="upload-error">{{ uploadError() }}</div> }

            @if (files().length > 0) {
              <div class="file-list">
                <h4 style="margin-bottom:12px;margin-top:24px;font-size:14px">File đã chọn ({{ files().length }})</h4>
                <div class="file-items">
                  @for (file of files(); track $index; let idx = $index) {
                    <div class="file-item">
                      <div class="file-icon">📄</div>
                      <div class="file-info">
                        <div class="file-name">{{ file.name }}</div>
                        <div class="file-size">{{ formatSize(file.size) }}</div>
                      </div>
                      <button class="remove-btn" (click)="removeFile(idx); $event.stopPropagation()">✕</button>
                    </div>
                  }
                </div>
                <div style="margin-top:24px;text-align:right">
                  <button class="upload-submit-btn" (click)="handleUpload()">📤 Upload & AI phân tích</button>
                </div>
              </div>
            }
          </div>
        </div>
      }

      @if (step() === 'processing') {
        <div class="card processing-card">
          <div class="card-body" style="text-align:center;padding:60px 20px">
            <div class="ai-pulse-icon">🤖</div>
            <h3 style="font-size:20px;margin-bottom:12px">Đang upload & phân tích tài liệu...</h3>
            <div class="progress-bar-container"><div class="progress-bar-fill" [style.width.%]="progress()"></div></div>
            <div style="margin-top:12px;font-size:13px;color:var(--agent-primary);font-weight:600">{{ mathFloor(progress()) }}%</div>
          </div>
        </div>
      }

      @if (step() === 'complete') {
        <div class="card success-card">
          <div class="card-body" style="text-align:center;padding:60px 20px">
            <div class="success-circle" style="margin:0 auto 20px;width:80px;height:80px;font-size:40px">✓</div>
            <h3 style="font-size:22px;margin-bottom:12px;color:var(--success)">Upload hoàn tất!</h3>
            <p style="color:var(--text-secondary);margin-bottom:32px;max-width:400px;margin:0 auto 32px">File đã được lưu thành công.</p>
            <div style="display:flex;gap:16px;justify-content:center">
              <button class="upload-secondary-btn" (click)="resetUpload()">Tải thêm file</button>
            </div>
          </div>
        </div>
      }

      @if (uploadedFiles().length > 0 && step() === 'upload') {
        <div class="card" style="margin-top:24px">
          <div class="card-body">
            <h4 style="font-size:16px;font-weight:600;margin-bottom:16px;display:flex;align-items:center;gap:8px">
              ⏱ File đã upload ({{ uploadedFiles().length }})
            </h4>
            <div class="file-items">
              @for (file of uploadedFiles(); track file.id) {
                <div class="file-item uploaded-file-item">
                  <div class="file-icon">📄</div>
                  <div class="file-info">
                    <div class="file-name">{{ file.originalName }}</div>
                    <div class="file-meta">
                      <span>{{ formatSize(file.size) }}</span>
                      <span>•</span>
                      <span>{{ file.courseName }}</span>
                      <span>•</span>
                      <span>{{ formatDate(file.uploadedAt) }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class UploadComponent implements OnInit {
  state = inject(AppStateService);
  private api = inject(ApiService);

  step = signal<'upload' | 'processing' | 'complete'>('upload');
  files = signal<File[]>([]);
  dragActive = signal(false);
  progress = signal(0);
  uploadError = signal('');
  selectedCourseId = signal('');
  selectedLessonId = signal('');
  uploadedFiles = signal<UploadedFile[]>([]);

  courseLessons = () => {
    const cid = this.selectedCourseId();
    if (!cid) return [];
    const lessons = this.state.lessons() as any;
    return lessons[cid]?.lessons?.filter((l: any) => l.type !== 'info' && l.type !== 'exam') || [];
  };

  ngOnInit() { this.fetchUploadedFiles(); }

  onCourseChange(val: string) {
    this.selectedCourseId.set(val);
    this.selectedLessonId.set('');
    this.fetchUploadedFiles();
  }

  fetchUploadedFiles() {
    const params: any = {};
    if (this.selectedCourseId()) params.courseId = this.selectedCourseId();
    if (this.selectedLessonId()) params.lessonId = this.selectedLessonId();
    this.api.getUploads(params).subscribe({
      next: (data: any) => this.uploadedFiles.set(Array.isArray(data) ? data : []),
      error: () => {}
    });
  }

  onDrag(e: Event, active: boolean) { e.preventDefault(); e.stopPropagation(); this.dragActive.set(active); }
  onDragOver(e: Event) { e.preventDefault(); e.stopPropagation(); }

  onDrop(e: DragEvent) {
    e.preventDefault(); e.stopPropagation(); this.dragActive.set(false);
    if (e.dataTransfer?.files) this.addFiles(e.dataTransfer.files);
  }

  onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) this.addFiles(input.files);
  }

  addFiles(fileList: FileList) {
    this.uploadError.set('');
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    const arr = Array.from(fileList).filter(f => allowed.includes(f.type));
    if (arr.length === 0) { this.uploadError.set('Chỉ hỗ trợ file PDF, Word, PowerPoint'); return; }
    const tooBig = arr.filter(f => f.size > 200 * 1024 * 1024);
    if (tooBig.length > 0) { this.uploadError.set(`File "${tooBig[0].name}" quá lớn. Tối đa 200MB/file.`); return; }
    this.files.update(f => [...f, ...arr]);
  }

  removeFile(idx: number) { this.files.update(f => { const n = [...f]; n.splice(idx, 1); return n; }); }

  handleUpload() {
    if (this.files().length === 0) return;
    if (!this.selectedCourseId()) { this.uploadError.set('Vui lòng chọn Môn học'); return; }
    this.uploadError.set(''); this.step.set('processing'); this.progress.set(0);

    const formData = new FormData();
    this.files().forEach(f => formData.append('files', f));
    formData.append('courseId', this.selectedCourseId());
    const course = this.state.courses().find(c => String(c.id) === this.selectedCourseId());
    formData.append('courseName', course?.name || '');
    formData.append('lessonId', this.selectedLessonId() || 'general');

    const interval = setInterval(() => { this.progress.update(p => p >= 90 ? p : p + Math.random() * 10); }, 300);

    this.api.uploadFiles(formData).subscribe({
      next: () => { clearInterval(interval); this.progress.set(100); setTimeout(() => { this.step.set('complete'); this.fetchUploadedFiles(); }, 500); },
      error: (err) => { clearInterval(interval); this.step.set('upload'); this.uploadError.set(err.error?.error || 'Lỗi khi upload file'); }
    });
  }

  mathFloor(n: number) { return Math.floor(n); }

  resetUpload() { this.step.set('upload'); this.files.set([]); }

  formatSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
}
