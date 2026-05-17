import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppStateService } from '../../services/app-state.service';

@Component({
  selector: 'app-bulletin-board',
  standalone: true,
  template: `
    <div>
      <h2 style="margin-bottom: 20px; font-size: 18px; font-weight: 600">Bảng tin học tập</h2>
      <div class="card">
        <div class="card-header">Danh sách lớp học phần đang học</div>
        <div class="card-body" style="padding: 0">
          <table class="data-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Tên môn</th>
                <th>Mã lớp</th>
                <th style="text-align:center">Tuần học</th>
                <th style="text-align:center">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              @for (course of state.courses(); track course.id; let i = $index) {
                <tr style="cursor:pointer" (click)="goToCourse(course.id)">
                  <td>{{ i + 1 }}</td>
                  <td>{{ course.name }}</td>
                  <td>{{ course.code }}</td>
                  <td style="text-align:center">{{ course.weeks }}</td>
                  <td style="text-align:center">
                    <span class="badge" [class.badge-success]="course.status==='on_track'" [class.badge-warning]="course.status==='late'" [class.badge-info]="course.status==='ontime'">
                      {{ course.status === 'on_track' ? 'Đúng tiến độ' : course.status === 'late' ? 'Chậm tiến độ' : 'Đúng hạn' }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class BulletinBoardComponent {
  state = inject(AppStateService);
  private router = inject(Router);

  goToCourse(id: number) {
    this.router.navigate(['/dashboard/classes/learning', id]);
  }
}
