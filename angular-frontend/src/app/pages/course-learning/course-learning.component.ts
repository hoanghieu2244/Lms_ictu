import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AppStateService } from '../../services/app-state.service';
import { ApiService } from '../../services/api.service';
import { Lesson, CourseData, UploadedFile } from '../../models/course.model';
import { MicroActivityComponent } from '../../components/micro-activity/micro-activity.component';
import { ImmersiveTextComponent } from '../../components/immersive-text/immersive-text.component';
import { MindmapViewComponent } from '../../components/mindmap-view/mindmap-view.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-course-learning',
  standalone: true,
  imports: [MicroActivityComponent, ImmersiveTextComponent, MindmapViewComponent],
  template: `
    <div class="learning-layout" style="margin:-24px;height:calc(100% + 48px)">
      <!-- Lesson Sidebar -->
      <div class="lesson-sidebar" [class.collapsed]="sidebarCollapsed()">
        <button class="lesson-sidebar-toggle" (click)="sidebarCollapsed.update(v=>!v)">
          {{ sidebarCollapsed() ? '»' : '«' }}
        </button>
        @if (courseData()) {
          <div class="lesson-header">{{ courseData()!.courseName }} ({{ courseData()!.courseCode }})</div>
          @for (lesson of courseData()!.lessons; track lesson.id) {
            <div class="lesson-item-wrapper">
              <div class="lesson-item" [class.active]="activeLesson() === lesson.id" (click)="toggleLesson(lesson.id)">
                <div style="width:4px;min-height:28px;border-radius:2px" [style.background]="lesson.type==='exam' ? '#f0ad4e' : 'var(--primary-light)'"></div>
                @if (lesson.type !== 'info' && lesson.type !== 'exam') {
                  <span class="lesson-toggle" [class.expanded]="activeLesson() === lesson.id">▶</span>
                }
                <span class="lesson-name">{{ lesson.name }}</span>
                @if (lesson.completed) { <span class="lesson-check">✓</span> }
              </div>
              @if (activeLesson() === lesson.id && lesson.type !== 'info' && lesson.type !== 'exam') {
                <div class="lesson-sub-items">
                  <div class="lesson-sub-item" [class.active]="activeTab()==='content'" (click)="setTab('content')">
                    <span class="sub-bullet">●</span> Nội dung bài học
                  </div>
                  <div class="lesson-sub-item" [class.active]="activeTab()==='materials'" (click)="setTab('materials')">
                    <span class="sub-bullet">●</span> Tài liệu tham khảo
                  </div>
                </div>
              }
            </div>
          }
        }
      </div>

      <!-- Content Area -->
      <div class="lesson-content-area">
        @if (!selectedLesson() || !selectedLesson()!.content) {
          <div class="content-placeholder">
            {{ !activeLesson() ? 'Vui lòng chọn 1 bài học để hiển thị nội dung.' : 'Nội dung bài học này chưa có dữ liệu demo.' }}
          </div>
        } @else if (activeTab() === 'content') {
          <div style="height:100%;display:flex;flex-direction:column">
            <!-- View Mode Toolbar -->
            <div class="view-mode-toolbar">
              @for (mode of viewModes; track mode.id) {
                <button class="view-mode-btn" [class.active]="viewMode()===mode.id" (click)="viewMode.set(mode.id)">
                  <span class="view-mode-icon">{{ mode.icon }}</span>
                  <span class="view-mode-label">{{ mode.label }}</span>
                </button>
              }
            </div>
            <div class="view-mode-content">
              @switch (viewMode()) {
                @case ('source') {
                  <!-- Source View -->
                  <div class="source-view" style="padding: 24px; overflow-y: auto; height: 100%;">
                    @if (sourceLoading()) {
                      <div class="imm-loading" style="display:flex;flex-direction:column;align-items:center;padding:40px 0;color:var(--text-secondary)">
                        <div style="font-size:32px;margin-bottom:16px;animation:pulse 1.5s infinite">📄</div>
                        <p style="margin:0;font-size:15px;font-weight:500">AI đang phân tích tài liệu để tạo cấu trúc bài học...</p>
                        <p style="margin:4px 0 0;font-size:13px;opacity:0.8">Vui lòng đợi trong giây lát</p>
                      </div>
                    } @else if (sourceError()) {
                      <div class="content-placeholder">
                        <div style="text-align:center">
                          <span style="font-size:32px;display:block;margin-bottom:16px;color:var(--text-light)">⚠️</span>
                          <h3 style="margin:0 0 8px;color:var(--text-primary)">Lỗi phân tích tài liệu</h3>
                          <p style="color:var(--text-secondary);margin:0;line-height:1.6">{{ sourceError() }}</p>
                        </div>
                      </div>
                    } @else if (sourceContent()) {
                      <h2 class="source-title" style="margin:0 0 24px;font-size:24px;color:var(--text-primary);border-bottom:1px solid var(--border);padding-bottom:16px;">{{ sourceContent()!.title }}</h2>
                      @for (sec of sourceContent()!.sections; track $index; let idx = $index) {
                        <div class="source-section" style="margin-bottom:24px">
                          <h3 class="source-heading" style="margin:0 0 12px;font-size:18px;color:#3b82f6">{{ sec.heading }}</h3>
                          @if (sec.text) {
                            @for (p of sec.text.split('\n'); track $index) {
                              <p class="source-text" style="margin:0 0 8px;line-height:1.6;color:var(--text-secondary)">{{ p }}</p>
                            }
                          }
                          @if (sec.list && sec.list.length > 0) {
                            <ul class="source-list" style="margin:0;padding-left:20px;color:var(--text-secondary);line-height:1.6">
                              @for (item of sec.list; track $index) { <li style="margin-bottom:6px">{{ item }}</li> }
                            </ul>
                          }
                        </div>
                      }
                    } @else {
                      <div class="content-placeholder">
                        <div style="text-align:center">
                          <span style="font-size:32px;display:block;margin-bottom:16px;color:var(--text-light)">📄</span>
                          <h3 style="margin:0 0 8px;color:var(--text-primary)">Chưa có dữ liệu phân tích</h3>
                          <p style="color:var(--text-secondary);margin:0;line-height:1.6">
                            Vui lòng tải lên tài liệu bài giảng (PDF/PPT) trong phần "Tài liệu tham khảo"<br>để AI có thể đọc và tạo cấu trúc bài học tại đây.
                          </p>
                        </div>
                      </div>
                    }
                  </div>
                }
                @case ('immersive') {
                  <app-immersive-text [courseId]="courseId" [lessonId]="activeLesson()!" [lesson]="selectedLesson()!" />
                }
                @case ('mindmap') {
                  <app-mindmap-view [courseId]="courseId" [lessonId]="activeLesson()!" [lesson]="selectedLesson()!" />
                }
                @case ('slides') {
                  <div class="content-placeholder">
                    <div style="text-align:center">
                      <span style="font-size:32px;display:block;margin-bottom:16px;color:var(--text-light)">▶ Slides</span>
                      <h3 style="margin:0 0 8px;color:var(--text-primary)">Slides & Narration</h3>
                      <p style="color:var(--text-secondary);margin:0;line-height:1.6">
                        Tính năng trình chiếu kèm thuyết minh AI đang được phát triển.<br>
                        Sẽ sớm ra mắt trong phiên bản tiếp theo!
                      </p>
                    </div>
                  </div>
                }
              }
            </div>
          </div>
        } @else if (activeTab() === 'materials') {
          <div style="height:100%;display:flex;flex-direction:column">
            @if (!viewingFile()) {
              <div style="padding:20px 24px 12px">
                <h3 style="margin:0 0 4px;font-size:16px;color:var(--text-primary)">Tài liệu tham khảo</h3>
                <p style="margin:0;font-size:13px;color:var(--text-secondary)">Chọn tài liệu bạn muốn xem</p>
              </div>
              @if (uploadedFiles().length === 0) {
                <div class="content-placeholder" style="flex:1">Chưa có tài liệu nào.</div>
              } @else {
                <div style="padding:0 24px 16px;display:flex;flex-direction:column;gap:8px">
                  @for (file of uploadedFiles(); track $index) {
                    <div style="display:flex;align-items:center;gap:16px;padding:16px;border-radius:12px;background:#fff;border:1px solid #e2e8f0;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.05);transition:all 0.2s"
                      (click)="openFile(file)"
                      onmouseover="this.style.borderColor='#3b82f6';this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 6px -1px rgba(59, 130, 246, 0.1)'"
                      onmouseout="this.style.borderColor='#e2e8f0';this.style.transform='none';this.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)'">
                      
                      <div style="width:48px;height:48px;border-radius:10px;background:#eff6ff;display:flex;align-items:center;justify-content:center;color:#3b82f6;flex-shrink:0">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                      </div>
                      
                      <div style="flex:1;min-width:0">
                        <div style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">BÀI GIẢNG</div>
                        <div style="font-weight:600;font-size:15px;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ fixEncoding(file.originalName) }}</div>
                        <div style="font-size:13px;color:#64748b;margin-top:4px;display:flex;align-items:center;gap:6px">
                          <span>{{ getFileIcon(file.mimetype) }}</span>
                          <span style="width:4px;height:4px;border-radius:50%;background:#cbd5e1"></span>
                          <span>{{ formatSize(file.size) }}</span>
                        </div>
                      </div>
                      
                      <div style="width:36px;height:36px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#64748b;flex-shrink:0" class="file-view-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20"/><path d="m15 5 7 7-7 7"/></svg>
                      </div>
                    </div>
                  }
                </div>
              }
            } @else {
              <div style="flex:1;display:flex;flex-direction:column;height:100%">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg-secondary);flex-shrink:0">
                  <button style="padding:6px 12px;border-radius:6px;border:1px solid var(--border);background:var(--bg-primary);color:var(--text-primary);font-size:13px;cursor:pointer;font-weight:500"
                    (click)="viewingFile.set('')">← Quay lại</button>
                </div>
                <iframe [src]="viewingFile()" style="flex:1;width:100%;border:none;background:#fff" title="Preview tài liệu"></iframe>
              </div>
            }
          </div>
        }
      </div>

      @if (activeActivity()) {
        <app-micro-activity [activity]="activeActivity()!" (closeEvent)="activeActivity.set(null)" />
      }
    </div>
  `
})
export class CourseLearningComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private state = inject(AppStateService);
  private api = inject(ApiService);
  private sanitizer = inject(DomSanitizer);

  courseId = '';
  courseData = signal<CourseData | null>(null);
  activeLesson = signal<string | null>(null);
  activeTab = signal('content');
  viewMode = signal('source');
  sidebarCollapsed = signal(false);
  activeActivity = signal<any>(null);
  uploadedFiles = signal<UploadedFile[]>([]);
  viewingFile = signal<SafeResourceUrl | string>('');

  sourceContent = signal<any>(null);
  sourceLoading = signal(false);
  sourceError = signal<string | null>(null);

  viewModes = [
    { id: 'source', icon: '⊞', label: 'Source' },
    { id: 'immersive', icon: '≡', label: 'Immersive Text' },
    { id: 'slides', icon: '▶', label: 'Slides & Narration' },
    { id: 'mindmap', icon: '◎', label: 'Mindmap' },
  ];

  ngOnInit() {
    this.courseId = this.route.snapshot.paramMap.get('courseId') || '';
    const lessons = this.state.lessons() as any;
    this.courseData.set(lessons[this.courseId] || null);
  }

  selectedLesson = (): Lesson | null => {
    const data = this.courseData();
    const id = this.activeLesson();
    if (!data || !id) return null;
    return data.lessons.find(l => l.id === id) || null;
  };

  toggleLesson(id: string) {
    this.activeLesson.set(this.activeLesson() === id ? null : id);
    this.activeTab.set('content');
    this.viewMode.set('source');
    this.viewingFile.set('');
    this.sourceContent.set(null);
    this.sourceError.set(null);
    this.fetchFiles();
    if (this.activeLesson() && this.activeLesson() !== 'info' && this.activeLesson() !== 'exam') {
      this.fetchSourceContent();
    }
  }

  fetchSourceContent() {
    this.sourceLoading.set(true);
    this.sourceError.set(null);
    const lessonId = this.activeLesson();
    if (!lessonId) return;

    this.api.getCourseSource({
      courseId: this.courseId,
      lessonId: lessonId,
      title: this.selectedLesson()?.name || `Bài ${lessonId}`
    }).subscribe({
      next: (data: any) => {
        this.sourceContent.set(data);
        this.sourceLoading.set(false);
      },
      error: (err: any) => {
        console.error(err);
        this.sourceError.set(err.error?.error || 'Lỗi khi gọi API Source');
        this.sourceLoading.set(false);
      }
    });
  }

  setTab(tab: string) {
    this.activeTab.set(tab);
    this.viewingFile.set('');
    if (tab === 'materials') this.fetchFiles();
  }

  getInteractionPoint(sectionIdx: number) {
    return this.selectedLesson()?.content?.interactionPoints?.find(p => p.sectionIdx === sectionIdx) || null;
  }

  fetchFiles() {
    const params: any = { courseId: this.courseId };
    const lesson = this.activeLesson();
    if (lesson && lesson !== 'info' && lesson !== 'exam') params.lessonId = lesson;
    this.api.getUploads(params).subscribe({
      next: (data: any) => this.uploadedFiles.set(Array.isArray(data) ? data : []),
      error: () => this.uploadedFiles.set([])
    });
  }

  openFile(file: UploadedFile) {
    this.viewingFile.set(this.getIframeUrl(file));
  }

  getIframeUrl(file: UploadedFile): SafeResourceUrl {
    const base = environment.apiUrl;
    const url = file.downloadUrl ? `${base}${file.downloadUrl}` : `${base}/uploads/${file.courseId}/${file.lessonId}/${file.storedName}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  fixEncoding(text: string): string {
    try {
      // Fix ISO-8859-1 decoding issues that show up as garbled UTF-8
      return decodeURIComponent(escape(text));
    } catch {
      return text;
    }
  }

  formatSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  getFileIcon(mimetype: string) {
    if (mimetype === 'application/pdf') return 'PDF';
    if (mimetype?.includes('presentation') || mimetype?.includes('powerpoint')) return 'PPT';
    if (mimetype?.includes('word')) return 'DOC';
    return 'FILE';
  }
}
