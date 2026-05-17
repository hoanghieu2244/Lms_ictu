import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AppStateService } from '../../services/app-state.service';
import { ApiService } from '../../services/api.service';
import { AIModel } from '../../models/course.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="lms-sidebar" [class.collapsed]="state.sidebarCollapsed()">
      <!-- Logo -->
      <div class="sidebar-logo">
        <div class="logo-block">
          <svg class="logo-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3c8dbc" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          @if (!state.sidebarCollapsed()) {
            <div class="logo-text-group">
              <span class="logo-title">LMS</span>
              <span class="logo-subtitle">lms.ictu.edu.vn</span>
            </div>
          }
        </div>
      </div>

      <!-- User Profile -->
      @if (!state.sidebarCollapsed()) {
        <div class="sidebar-user">
          <div class="user-avatar-circle">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
          </div>
          <div class="user-info-block">
            <div class="user-display-name">{{ state.user().name }}</div>
            <div class="user-student-id">DTC225200472</div>
          </div>
          <button class="user-menu-toggle" (click)="toggleUserMenu()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 9l-7 7-7-7"/></svg>
          </button>
        </div>
        @if (showUserMenu()) {
          <div class="user-dropdown">
            <a class="dropdown-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg> Tài khoản</a>
            <a class="dropdown-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Cài đặt</a>
            <a class="dropdown-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Cập nhật mật khẩu</a>
            <a class="dropdown-item logout-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Đăng xuất</a>
          </div>
        }
      }

      <!-- Navigation -->
      <nav class="sidebar-nav-lms">
        <a routerLink="/dashboard/bulletin-board" routerLinkActive="active" class="nav-link" title="Bảng tin LMS">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          @if (!state.sidebarCollapsed()) { <span>Bảng tin LMS</span> }
        </a>

        <div class="nav-section-label">HỌC TẬP</div>

        <a routerLink="/dashboard/schedule" routerLinkActive="active" class="nav-link" title="Thời khóa biểu">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          @if (!state.sidebarCollapsed()) { <span>Thời khóa biểu</span> }
        </a>
        <a routerLink="/dashboard/classes" routerLinkActive="active" class="nav-link" title="Lớp học phần">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          @if (!state.sidebarCollapsed()) { <span>Lớp học phần</span> }
        </a>
        <a class="nav-link disabled" title="Kiểm tra kỹ năng">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          @if (!state.sidebarCollapsed()) { <span>Kiểm tra kỹ năng</span> <span class="badge-lock">KHÓA</span> }
        </a>
        <a class="nav-link disabled" title="Kiểm tra đầu giờ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          @if (!state.sidebarCollapsed()) { <span>Kiểm tra đầu giờ</span> <span class="badge-lock">KHÓA</span> }
        </a>
        <a class="nav-link disabled" title="Thi kết thúc học phần">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          @if (!state.sidebarCollapsed()) { <span>Thi kết thúc học phần</span> <span class="badge-lock">KHÓA</span> }
        </a>
        <a routerLink="/dashboard/upload" routerLinkActive="active" class="nav-link" title="Dự án">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          @if (!state.sidebarCollapsed()) { <span>Dự án</span> }
        </a>
        <a class="nav-link" title="Hỏi đáp với giảng viên" (click)="state.toggleChat()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          @if (!state.sidebarCollapsed()) { <span>Hỏi đáp với giảng viên</span> }
        </a>
        <a class="nav-link" title="Thông báo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          @if (!state.sidebarCollapsed()) { <span>Thông báo</span> }
        </a>

        <div class="nav-section-label">CÔNG CỤ AI</div>

        <a routerLink="/dashboard/quiz" routerLinkActive="active" class="nav-link" title="Luyện tập trắc nghiệm AI">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.57-3.25 3.92A1 1 0 0 0 12 11v1"/><circle cx="12" cy="16" r="1"/><circle cx="12" cy="12" r="10"/></svg>
          @if (!state.sidebarCollapsed()) { <span>Luyện tập trắc nghiệm</span> }
        </a>

        <div class="nav-section-label">KẾT QUẢ</div>

        <a routerLink="/dashboard/results" routerLinkActive="active" class="nav-link" title="Tra cứu điểm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          @if (!state.sidebarCollapsed()) { <span>Tra cứu điểm</span> }
        </a>

        <div class="nav-section-label">HỆ THỐNG</div>

        <a class="nav-link" title="Cài đặt">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          @if (!state.sidebarCollapsed()) { <span>Cài đặt</span> }
        </a>
      </nav>
    </aside>
  `
})
export class SidebarComponent implements OnInit {
  state = inject(AppStateService);
  private api = inject(ApiService);

  models = signal<AIModel[]>([]);
  selectedModel = signal('openai/gpt-4o');
  showModelDropdown = signal(false);
  showUserMenu = signal(false);

  selectedModelName = () => {
    const m = this.models().find(m => m.id === this.selectedModel());
    return m ? m.name : 'GPT-4o';
  }

  ngOnInit() {
    this.api.getAIModels().subscribe({
      next: (data: any) => {
        if (data.models) this.models.set(data.models);
        if (data.current) this.selectedModel.set(data.current);
      },
      error: () => {
        this.models.set([
          { id: 'openai/gpt-4o', name: 'GPT-4o', desc: 'Mạnh nhất' },
        ]);
      }
    });
  }

  toggleModelDropdown() {
    this.showModelDropdown.update(v => !v);
  }

  toggleUserMenu() {
    this.showUserMenu.update(v => !v);
  }

  selectModel(model: AIModel) {
    this.selectedModel.set(model.id);
    this.showModelDropdown.set(false);
    this.api.setAIModel(model.id).subscribe();
  }
}
