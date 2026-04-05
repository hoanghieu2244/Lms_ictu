import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../App'

export default function BulletinBoard() {
    const { courses } = useContext(AppContext)
    const navigate = useNavigate()

    return (
        <div>
            <div className="card">
                <div className="card-header">
                    Các lớp học phần học kỳ hiện tại (2025_2026_1)
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 60 }}>STT</th>
                                <th>Tên lớp học phần</th>
                                <th style={{ width: 120, textAlign: 'center' }}>Tuần học</th>
                                <th style={{ width: 120, textAlign: 'center' }}>Số buổi nghỉ</th>
                                <th style={{ width: 140, textAlign: 'center' }}>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {courses.map((course, idx) => (
                                <tr key={course.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/dashboard/classes/learning/${course.id}`)}>
                                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                    <td>
                                        <a style={{ color: course.status === 'late' ? 'var(--danger)' : 'var(--primary)' }}>
                                            {course.name}-1-25 ({course.code})
                                        </a>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{course.weeks}</td>
                                    <td style={{ textAlign: 'center', color: course.status === 'late' ? 'var(--danger)' : 'inherit' }}>
                                        {course.absences}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={`badge ${course.status === 'late' ? 'badge-warning' : 'badge-success'}`}>
                                            {course.status === 'late' ? 'Chậm tiến độ' : 'Đúng tiến độ'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
