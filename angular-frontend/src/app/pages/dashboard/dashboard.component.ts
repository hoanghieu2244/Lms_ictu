import { Component } from '@angular/core';
import { GradeEntry } from '../../models/course.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="grades-page">
      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="filter-group">
          <label>Năm học</label>
          <select class="filter-select">
            <option>2025-2026</option>
            <option>2024-2025</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Học kỳ</label>
          <select class="filter-select">
            <option>Học kỳ 1</option>
            <option>Học kỳ 2</option>
          </select>
        </div>
      </div>

      <!-- Grades Table -->
      <div class="grades-table-wrapper">
        <table class="grades-table">
          <thead>
            <tr>
              <th rowspan="2">STT</th>
              <th rowspan="2">Tên học phần</th>
              <th rowspan="2">Số TC</th>
              <th rowspan="2">Học kỳ</th>
              <th rowspan="2">Điểm C.Cần</th>
              <th rowspan="2" class="col-tbctn">Điểm<br>TBCTN</th>
              <th colspan="4" class="col-tx-header">Điểm thường xuyên</th>
              <th rowspan="2">Điểm TBC</th>
              <th rowspan="2">BK thi KTHP</th>
            </tr>
            <tr>
              <th>TX 1</th>
              <th>TX 2</th>
              <th>TX 3</th>
              <th>TX 4</th>
            </tr>
          </thead>
          <tbody>
            @for (grade of grades; track grade.stt) {
              <tr>
                <td class="center">{{ grade.stt }}</td>
                <td>{{ grade.courseName }}</td>
                <td class="center">{{ grade.credits }}</td>
                <td class="center italic">{{ grade.semester }}</td>
                <td class="center">{{ grade.diemCC }}</td>
                <td class="center">{{ grade.diemTBCTN }}</td>
                <td class="center">{{ grade.tx1 }}</td>
                <td class="center">{{ grade.tx2 }}</td>
                <td class="center">{{ grade.tx3 }}</td>
                <td class="center">{{ grade.tx4 ?? '' }}</td>
                <td class="center highlight-score">{{ grade.diemTBC }}</td>
                <td class="center pass-status">{{ grade.bkThiKTHP }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class DashboardComponent {
  grades: GradeEntry[] = [
    { stt: 1, courseName: 'Lập trình cho thiết bị di động', credits: 3, semester: '2025_2026_1', diemCC: 8, diemTBCTN: 6.3, tx1: 6, tx2: 8, tx3: 7, tx4: undefined, diemTBC: 6.9, bkThiKTHP: 'Đạt' },
    { stt: 2, courseName: 'Xử lý ảnh', credits: 3, semester: '2025_2026_1', diemCC: 8.5, diemTBCTN: 7.6, tx1: 9.9, tx2: 8.3, tx3: 8.1, tx4: undefined, diemTBC: 8.4, bkThiKTHP: 'Đạt' },
    { stt: 3, courseName: 'Chuyển đổi số', credits: 3, semester: '2025_2026_1', diemCC: 10, diemTBCTN: 9.0, tx1: 9.8, tx2: 10, tx3: 10, tx4: undefined, diemTBC: 9.6, bkThiKTHP: 'Đạt' },
    { stt: 4, courseName: 'Điện toán đám mây', credits: 3, semester: '2025_2026_1', diemCC: 8, diemTBCTN: 8.4, tx1: 3, tx2: 4, tx3: 5, tx4: undefined, diemTBC: 5.7, bkThiKTHP: 'Đạt' },
    { stt: 5, courseName: 'Học máy', credits: 3, semester: '2025_2026_1', diemCC: 9, diemTBCTN: 8.3, tx1: 8.5, tx2: 8.5, tx3: 8.5, tx4: undefined, diemTBC: 8.5, bkThiKTHP: 'Đạt' },
  ];
}
