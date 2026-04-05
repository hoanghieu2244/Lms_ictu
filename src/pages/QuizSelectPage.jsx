import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../App'
import { HiSparkles, HiAcademicCap, HiArrowRight } from 'react-icons/hi2'

export default function QuizSelectPage() {
    const { courses, lessons } = useContext(AppContext)
    const navigate = useNavigate()

    // Chỉ hiển thị các môn có dữ liệu bài học
    const availableCourses = courses.filter(c => lessons[c.id])

    return (
        <div className="quiz-select-container">
            <div className="quiz-select-header">
                <HiSparkles style={{ color: 'var(--agent-quiz)', fontSize: 28 }} />
                <div>
                    <h2>Quiz Generator</h2>
                    <p>Chọn một môn học để AI tạo bài kiểm tra trắc nghiệm</p>
                </div>
            </div>

            <div className="quiz-select-grid">
                {availableCourses.map(course => {
                    const lessonCount = lessons[course.id]?.lessons?.filter(l => l.content).length || 0
                    return (
                        <div
                            key={course.id}
                            className="quiz-course-card"
                            onClick={() => navigate(`/dashboard/quiz/${course.id}`)}
                        >
                            <div className="quiz-course-icon">
                                <HiAcademicCap />
                            </div>
                            <div className="quiz-course-info">
                                <h3>{course.name}</h3>
                                <span className="quiz-course-code">{course.code}</span>
                                <span className="quiz-course-lessons">{lessonCount} bài giảng</span>
                            </div>
                            <div className="quiz-course-arrow">
                                <HiArrowRight />
                            </div>
                        </div>
                    )
                })}
            </div>

            {availableCourses.length === 0 && (
                <div className="quiz-empty">
                    <p>Chưa có môn học nào có dữ liệu để tạo quiz.</p>
                </div>
            )}
        </div>
    )
}
