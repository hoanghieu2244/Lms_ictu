import { Component, Input, inject, signal, OnInit, ElementRef, viewChild } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Lesson } from '../../models/course.model';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface MindmapNode {
  label: string;
  children?: MindmapNode[];
}

@Component({
  selector: 'app-mindmap-view',
  standalone: true,
  template: `
    @if (loading()) {
      <div class="imm-loading">
        <div class="imm-loading-icon"><div class="imm-loading-spinner"></div><span class="imm-loading-emoji">🧠</span></div>
        <p class="imm-loading-title">Đang tạo Mindmap...</p>
        <div class="imm-loading-dots"><span></span><span></span><span></span></div>
      </div>
    } @else if (rootNode()) {
      <div class="mindmap-container">
        <div class="mindmap-toolbar">
          <button class="mindmap-zoom-btn" (click)="zoomIn()">+</button>
          <button class="mindmap-zoom-btn" (click)="zoomOut()">−</button>
          <button class="mindmap-zoom-btn" (click)="resetZoom()">⟲</button>
          <span class="mindmap-zoom-label">{{ Math.round(scale() * 100) }}%</span>
        </div>
        <div class="mindmap-scroll" #scrollContainer>
          <div class="mindmap-canvas" [style.transform]="'scale(' + scale() + ')'" [style.transform-origin]="'center top'">
            <div class="mm-tree">
              <!-- Root -->
              <div class="mm-root-node">{{ rootNode()!.label }}</div>
              @if (rootNode()!.children && rootNode()!.children!.length > 0) {
                <div class="mm-connector-down"></div>
                <div class="mm-branches">
                  @for (branch of rootNode()!.children; track $index) {
                    <div class="mm-branch" [style.--branch-color]="branchColors[$index % branchColors.length]">
                      <div class="mm-connector-up"></div>
                      <div class="mm-branch-node">{{ branch.label }}</div>
                      @if (branch.children && branch.children.length > 0) {
                        <div class="mm-sub-branches">
                          @for (sub of branch.children; track $index) {
                            <div class="mm-sub-branch">
                              <div class="mm-sub-node">{{ sub.label }}</div>
                              @if (sub.children && sub.children.length > 0) {
                                <div class="mm-leaf-branches">
                                  @for (leaf of sub.children; track $index) {
                                    <div class="mm-leaf-node">{{ leaf.label }}</div>
                                  }
                                </div>
                              }
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    } @else if (error()) {
      <div class="content-placeholder">
        <p>{{ error() }}</p>
        <button class="quiz-btn quiz-btn-primary" (click)="fetchMindmap()" style="margin-top:16px">🔄 Thử lại</button>
      </div>
    }
  `,
  styles: [`
    .mindmap-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: linear-gradient(135deg, #f8fbff 0%, #f0f4f8 100%);
      position: relative;
    }
    .mindmap-toolbar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      background: rgba(255,255,255,0.85);
      border-bottom: 1px solid #e8ecf0;
      backdrop-filter: blur(8px);
      flex-shrink: 0;
    }
    .mindmap-zoom-btn {
      width: 32px; height: 32px;
      border: 1px solid #d0d5dd;
      background: #fff;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      color: #344054;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
    }
    .mindmap-zoom-btn:hover { background: #f2f4f7; border-color: #3c8dbc; color: #3c8dbc; }
    .mindmap-zoom-label { font-size: 12px; color: #667085; margin-left: 4px; }
    .mindmap-scroll {
      flex: 1;
      overflow: auto;
      padding: 40px 24px 60px;
    }
    .mindmap-canvas {
      transition: transform 0.2s ease;
      min-width: max-content;
    }
    /* Tree layout */
    .mm-tree {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .mm-root-node {
      background: linear-gradient(135deg, #3c8dbc, #2c6fa0);
      color: #fff;
      padding: 14px 32px;
      border-radius: 16px;
      font-size: 17px;
      font-weight: 700;
      box-shadow: 0 4px 16px rgba(60,141,188,0.35);
      text-align: center;
      max-width: 400px;
      line-height: 1.4;
    }
    .mm-connector-down {
      width: 3px;
      height: 32px;
      background: linear-gradient(180deg, #3c8dbc, #b0c4de);
    }
    .mm-connector-up {
      width: 3px;
      height: 20px;
      background: var(--branch-color, #5b9bd5);
      margin: 0 auto;
    }
    /* Branches container */
    .mm-branches {
      display: flex;
      gap: 20px;
      justify-content: center;
      flex-wrap: wrap;
      position: relative;
    }
    .mm-branches::before {
      content: '';
      position: absolute;
      top: 0;
      left: 10%;
      right: 10%;
      height: 3px;
      background: linear-gradient(90deg, transparent, #b0c4de, transparent);
    }
    /* Branch */
    .mm-branch {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 140px;
      max-width: 240px;
    }
    .mm-branch-node {
      background: var(--branch-color, #5b9bd5);
      color: #fff;
      padding: 10px 20px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
      box-shadow: 0 3px 10px rgba(0,0,0,0.12);
      line-height: 1.3;
      width: 100%;
    }
    /* Sub branches */
    .mm-sub-branches {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 10px;
      width: 100%;
    }
    .mm-sub-branch {
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }
    .mm-sub-node {
      background: #fff;
      border: 2px solid var(--branch-color, #5b9bd5);
      color: #344054;
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 500;
      text-align: center;
      line-height: 1.3;
    }
    /* Leaf nodes */
    .mm-leaf-branches {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 4px;
      padding-left: 16px;
    }
    .mm-leaf-node {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-left: 3px solid var(--branch-color, #5b9bd5);
      color: #667085;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 12px;
      line-height: 1.3;
    }
  `]
})
export class MindmapViewComponent implements OnInit {
  @Input() courseId!: string;
  @Input() lessonId!: string;
  @Input() lesson!: Lesson;

  private api = inject(ApiService);
  Math = Math;

  loading = signal(false);
  rootNode = signal<MindmapNode | null>(null);
  error = signal<string | null>(null);
  scale = signal(1);

  branchColors = [
    '#3c8dbc', '#27ae60', '#e67e22', '#9b59b6',
    '#e74c3c', '#1abc9c', '#f39c12', '#2980b9',
    '#8e44ad', '#16a085', '#d35400', '#2c3e50'
  ];

  ngOnInit() {
    if (this.lesson?.content) this.fetchMindmap();
  }

  fetchMindmap() {
    this.loading.set(true);
    this.error.set(null);
    this.api.getMindmap({
      courseId: this.courseId, lessonId: this.lessonId,
      title: this.lesson.content!.title,
      sections: this.lesson.content!.sections,
    }).subscribe({
      next: (result: any) => {
        // Backend trả { root: { label, children }, chainOfThought }
        if (result.root) {
          this.rootNode.set(result.root);
        } else if (result.mermaid || result.code) {
          // Fallback: nếu trả mermaid code, chuyển thành simple node
          this.rootNode.set({ label: this.lesson.content!.title, children: [{ label: 'Mindmap đã tạo (Mermaid format)' }] });
        } else {
          this.error.set('Dữ liệu mindmap không đúng định dạng.');
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Không thể tạo mindmap. Vui lòng thử lại.');
        this.loading.set(false);
      }
    });
  }

  zoomIn() { this.scale.update(s => Math.min(s + 0.15, 2)); }
  zoomOut() { this.scale.update(s => Math.max(s - 0.15, 0.4)); }
  resetZoom() { this.scale.set(1); }
}
