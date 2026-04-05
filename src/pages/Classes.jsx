import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../App'

function ProgressCircle({ percent }) {
    const r = 24
    const c = 2 * Math.PI * r
    const offset = c - (percent / 100) * c

    return (
        <div className="progress-circle">
            <svg width="60" height="60" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r={r} fill="none" stroke="#e8e8e8" strokeWidth="5" />
                <circle cx="30" cy="30" r={r} fill="none" stroke="#3c8dbc" strokeWidth="5"
                    strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
            </svg>
            <span className="progress-text">{percent}%</span>
        </div>
    )
}

export default function Classes() {
    const { courses } = useContext(AppContext)
    const navigate = useNavigate()

    return (
        <div>
            <h2 style={{ marginBottom: 20, fontSize: 18, fontWeight: 600 }}>Lớp học phần</h2>
            <div className="course-grid">
                {courses.map(course => (
                    <div key={course.id} className="course-card" onClick={() => navigate(`/dashboard/classes/learning/${course.id}`)}>
                        <ProgressCircle percent={course.status === 'late' ? 70 : 100} />
                        <div className="course-info">
                            <div className="course-name">{course.name}</div>
                            <div className="course-code">{course.code}</div>
                            <div className="course-meta">
                                <span>📅 Tuần {course.weeks}</span>
                                <span>📝 {course.absences} buổi nghỉ</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
