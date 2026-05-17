import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { ChatPanelComponent } from '../chat-panel/chat-panel.component';
import { AppStateService } from '../../services/app-state.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent, ChatPanelComponent],
  template: `
    <div class="app-layout">
      <app-sidebar />
      <div class="main-content">
        <app-header />
        <div class="page-content">
          <!-- Banner -->
          @if (showBanner()) {
            <div class="lms-banner">
              <div class="banner-left">
                <div class="banner-logo">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                </div>
                <div class="banner-text">
                  <p class="banner-greeting">Các bạn Sinh viên ICTU ơi...!</p>
                  <p class="banner-title">LMS ĐÃ CÓ PHIÊN BẢN DÀNH CHO THIẾT BỊ DI ĐỘNG</p>
                  <p class="banner-cta"><em>Quét mã QR truy cập App Store<br>hoặc CH Play để tải nào...!</em></p>
                </div>
              </div>
              <div class="banner-right">
                <div class="qr-group">
                  <div class="qr-item">
                    <div class="qr-placeholder">
                      <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><rect x="18" y="14" width="3" height="3"/><rect x="14" y="18" width="3" height="3"/><rect x="18" y="18" width="3" height="3"/></svg>
                    </div>
                    <span class="qr-label">ios</span>
                  </div>
                  <div class="qr-item">
                    <div class="qr-placeholder">
                      <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><rect x="18" y="14" width="3" height="3"/><rect x="14" y="18" width="3" height="3"/><rect x="18" y="18" width="3" height="3"/></svg>
                    </div>
                    <span class="qr-label">android</span>
                  </div>
                </div>
              </div>
            </div>
          }

          <router-outlet />
        </div>
      </div>
      <app-chat-panel />
      <button class="chat-fab" (click)="state.toggleChat()" title="Chat AI">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </button>
    </div>
  `
})
export class LayoutComponent {
  state = inject(AppStateService);
  private router = inject(Router);
  
  showBanner = signal(true);

  constructor() {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.checkBanner(e.urlAfterRedirects || e.url);
    });
    this.checkBanner(this.router.url);
  }

  private checkBanner(url: string) {
    if (url.includes('/learning/') || url.includes('/quiz')) {
      this.showBanner.set(false);
    } else {
      this.showBanner.set(true);
    }
  }
}
