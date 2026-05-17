import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-schedule',
  standalone: true,
  template: `
    <div class="schedule-page">
      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="filter-group">
          <label>Năm học</label>
          <select class="filter-select" [(value)]="selectedYear">
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
        <div class="filter-group">
          <label>Tuần</label>
          <select class="filter-select week-select">
            <option>{{ getWeekRange() }}</option>
          </select>
        </div>
      </div>

      <!-- Week Info -->
      <div class="week-info">
        Tuần bắt đầu từ {{ getWeekStart() }} đến {{ getWeekEnd() }}
      </div>

      <!-- Schedule Grid -->
      <div class="schedule-grid">
        <table class="schedule-table">
          <thead>
            <tr>
              @for (day of weekDays; track day.label) {
                <th>
                  <div class="day-header">
                    <span class="day-name">{{ day.label }}</span>
                    <span class="day-date">{{ day.date }}</span>
                  </div>
                </th>
              }
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="7" class="empty-schedule">
                <p>Bạn không có lớp học nào diễn ra trong tuần này.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class ScheduleComponent {
  selectedYear = '2025-2026';

  weekDays = this.generateWeekDays();

  private generateWeekDays() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const days = [];
    const labels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({
        label: labels[i],
        date: this.formatDate(d)
      });
    }
    return days;
  }

  getWeekStart(): string {
    return this.weekDays[0]?.date || '';
  }

  getWeekEnd(): string {
    return this.weekDays[6]?.date || '';
  }

  getWeekRange(): string {
    return `${this.getWeekStart()} - ${this.getWeekEnd()}`;
  }

  private formatDate(d: Date): string {
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
