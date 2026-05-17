import { Component, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AppStateService } from '../../services/app-state.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    <header class="lms-header">
      <button class="hamburger-btn" (click)="state.toggleSidebar()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <h1 class="page-title">{{ pageTitle }}</h1>
    </header>
  `
})
export class HeaderComponent {
  state = inject(AppStateService);
  private router = inject(Router);
  pageTitle = 'BẢNG TIN LMS';

  constructor() {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.updateTitle(e.url);
    });
    this.updateTitle(this.router.url);
  }

  private updateTitle(url: string) {
    if (url.includes('schedule')) this.pageTitle = 'THỜI KHÓA BIỂU';
    else if (url.includes('learning')) this.pageTitle = 'NỘI DUNG HỌC';
    else if (url.includes('classes')) this.pageTitle = 'LỚP HỌC PHẦN';
    else if (url.includes('results')) this.pageTitle = 'TRA CỨU ĐIỂM';
    else if (url.includes('quiz')) this.pageTitle = 'LUYỆN TẬP TRẮC NGHIỆM AI';
    else if (url.includes('upload')) this.pageTitle = 'DỰ ÁN';
    else if (url.includes('bulletin-board')) this.pageTitle = 'BẢNG TIN LMS';
    else this.pageTitle = 'BẢNG TIN LMS';
  }
}
