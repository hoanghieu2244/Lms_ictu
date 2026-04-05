import { useContext, useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppContext } from '../App'
import { HiSparkles, HiCpuChip, HiArrowLeft, HiArrowPath, HiCheckCircle, HiXCircle, HiLightBulb, HiTrophy, HiClock, HiAcademicCap, HiClipboardDocumentList } from 'react-icons/hi2'

const API_URL = 'http://localhost:3001'

export default function QuizPage() {
    const { lessons, courses } = useContext(AppContext)
    const { courseId } = useParams()
    const navigate = useNavigate()

    const [quizData, setQuizData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [bankInfo, setBankInfo] = useState(null) // { total, picked }

    const [currentQ, setCurrentQ] = useState(0)
    const [answers, setAnswers] = useState({})
    const [submitted, setSubmitted] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const [startTime] = useState(Date.now())
    const [endTime, setEndTime] = useState(null)
    const historySaved = useRef(false)

    // Lấy tên môn học từ courses hoặc lessons
    const courseName = courses?.find(c => String(c.id) === String(courseId))?.name
        || lessons[courseId]?.courseName
        || 'Môn học'

    const fetchQuiz = async (forceNew = false) => {
        setLoading(true)
        setError('')
        setQuizData([])
        setCurrentQ(0)
        setAnswers({})
        setSubmitted(false)
        setShowResults(false)
        setEndTime(null)

        try {
            const courseContent = lessons[courseId]
            if (!courseContent) throw new Error("Không tìm thấy dữ liệu khóa học")

            let text = ""
            courseContent.lessons.forEach(l => {
                if (l.content) {
                    text += `\n${l.content.title}\n`
                    l.content.sections.forEach(s => {
                        text += `${s.heading}: ${s.text || ''} ${s.list ? s.list.join(', ') : ''}\n`
                    })
                }
            })

            if (!text.trim()) {
                text = "Kiến thức đại cương môn " + courseName
            }

            const res = await fetch(`${API_URL}/api/generate-quiz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, courseId, mode: forceNew ? 'new_set' : 'random' })
            })

            if (!res.ok) throw new Error('Failed to generate quiz')

            const data = await res.json()
            if (data.error) throw new Error(data.error)

            // data = { questions: [...], bankTotal, pickedCount }
            if (data.questions) {
                setQuizData(data.questions)
                setBankInfo({ total: data.bankTotal, picked: data.pickedCount })
            } else if (Array.isArray(data)) {
                // Fallback nếu server trả về array trực tiếp
                setQuizData(data)
                setBankInfo(null)
            }
        } catch (err) {
            console.error(err)
            setError('Có lỗi xảy ra khi tạo quiz bằng AI. Vui lòng thử lại sau.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchQuiz()
    }, [courseId])

    if (loading) {
        return (
            <div className="quiz-page-wrapper">
                <div className="quiz-loading-screen">
                    <div className="quiz-loading-icon">
                        <HiCpuChip />
                        <div className="quiz-loading-ring"></div>
                    </div>
                    <h3>Quiz Generator Agent đang chuẩn bị đề...</h3>
                    <p>AI đang phân tích bài giảng <strong>{courseName}</strong> và tạo đề kiểm tra</p>
                    <div className="quiz-loading-dots">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="quiz-page-wrapper">
                <div className="quiz-error-screen">
                    <div className="quiz-error-icon">⚠️</div>
                    <h3>Không thể tạo bài kiểm tra</h3>
                    <p>{error}</p>
                    <div className="quiz-error-actions">
                        <button className="quiz-btn quiz-btn-primary" onClick={() => fetchQuiz()}>
                            <HiArrowPath /> Thử lại
                        </button>
                        <button className="quiz-btn quiz-btn-outline" onClick={() => navigate('/dashboard/quiz')}>
                            <HiArrowLeft /> Chọn môn khác
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (!quizData || quizData.length === 0) {
        return (
            <div className="quiz-page-wrapper">
                <div className="quiz-error-screen">
                    <div className="quiz-error-icon">📝</div>
                    <h3>Chưa có câu hỏi</h3>
                    <p>Chưa có câu hỏi cho môn này</p>
                    <button className="quiz-btn quiz-btn-primary" onClick={() => fetchQuiz(true)}>
                        <HiSparkles /> Tạo đề mới
                    </button>
                </div>
            </div>
        )
    }

    const q = quizData[currentQ]
    const total = quizData.length
    const progress = ((currentQ + 1) / total) * 100

    const handleAnswer = (value) => {
        if (submitted) return
        setAnswers({ ...answers, [currentQ]: value })
    }

    const handleSubmitQuestion = () => {
        setSubmitted(true)
    }

    const handleNext = () => {
        if (currentQ < total - 1) {
            setCurrentQ(currentQ + 1)
            setSubmitted(false)
        } else {
            setEndTime(Date.now())
            setShowResults(true)
        }
    }

    const handlePrev = () => {
        if (currentQ > 0) {
            setCurrentQ(currentQ - 1)
            setSubmitted(true) // show previous answer
        }
    }

    const getScore = () => {
        let correct = 0
        quizData.forEach((q, idx) => {
            if (q.type === 'multiple_choice' && answers[idx] === q.correctIdx) correct++
            if (q.type === 'true_false' && answers[idx] === q.answer) correct++
        })
        return correct
    }

    const isCorrect = () => {
        if (q.type === 'multiple_choice') return answers[currentQ] === q.correctIdx
        if (q.type === 'true_false') return answers[currentQ] === q.answer
        return false
    }

    const getDifficultyInfo = (diff) => {
        switch (diff) {
            case 'easy': return { label: 'Dễ', color: '#10b981', stars: 1 }
            case 'medium': return { label: 'Trung bình', color: '#f59e0b', stars: 2 }
            case 'hard': return { label: 'Khó', color: '#ef4444', stars: 3 }
            default: return { label: 'Trung bình', color: '#f59e0b', stars: 2 }
        }
    }

    const formatTime = (ms) => {
        const totalSec = Math.floor(ms / 1000)
        const min = Math.floor(totalSec / 60)
        const sec = totalSec % 60
        return `${min}:${sec < 10 ? '0' : ''}${sec}`
    }

    // ===== RESULTS SCREEN =====
    if (showResults) {
        const score = getScore()
        const percent = Math.round((score / total) * 100)
        const timeTaken = endTime - startTime

        // Auto-save quiz history
        if (!historySaved.current) {
            historySaved.current = true
            fetch(`${API_URL}/api/quiz-history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseId,
                    courseName,
                    score,
                    total,
                    percent,
                    timeTaken,
                    date: new Date().toISOString()
                })
            }).catch(err => console.error('Lỗi lưu quiz history:', err))
        }

        let gradeEmoji = '💪'
        let gradeText = 'Cần cố gắng thêm!'
        let gradeColor = '#ef4444'
        if (percent >= 90) { gradeEmoji = '🏆'; gradeText = 'Xuất sắc!'; gradeColor = '#10b981' }
        else if (percent >= 70) { gradeEmoji = '🎉'; gradeText = 'Tốt lắm!'; gradeColor = '#3b82f6' }
        else if (percent >= 50) { gradeEmoji = '👏'; gradeText = 'Khá!'; gradeColor = '#f59e0b' }

        return (
            <div className="quiz-page-wrapper">
                <div className="quiz-results-card">
                    <div className="quiz-results-header">
                        <div className="quiz-results-emoji">{gradeEmoji}</div>
                        <h2>{gradeText}</h2>
                        <p className="quiz-results-course">{courseName}</p>
                    </div>

                    <div className="quiz-results-score-ring">
                        <svg viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                            <circle cx="60" cy="60" r="52" fill="none" stroke={gradeColor} strokeWidth="8"
                                strokeDasharray={`${(percent / 100) * 327} 327`}
                                strokeLinecap="round"
                                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dasharray 1s ease' }}
                            />
                        </svg>
                        <div className="quiz-results-score-text">
                            <span className="quiz-results-percent" style={{ color: gradeColor }}>{percent}%</span>
                            <span className="quiz-results-fraction">{score}/{total}</span>
                        </div>
                    </div>

                    <div className="quiz-results-stats">
                        <div className="quiz-stat-item">
                            <HiCheckCircle style={{ color: '#10b981' }} />
                            <span>{score} đúng</span>
                        </div>
                        <div className="quiz-stat-item">
                            <HiXCircle style={{ color: '#ef4444' }} />
                            <span>{total - score} sai</span>
                        </div>
                        <div className="quiz-stat-item">
                            <HiClock style={{ color: '#6366f1' }} />
                            <span>{formatTime(timeTaken)}</span>
                        </div>
    
                    </div>

                    <div className="quiz-results-answers">
                        <h4>Chi tiết từng câu</h4>
                        <div className="quiz-results-grid">
                            {quizData.map((qq, idx) => {
                                let correct = false
                                if (qq.type === 'multiple_choice' && answers[idx] === qq.correctIdx) correct = true
                                if (qq.type === 'true_false' && answers[idx] === qq.answer) correct = true
                                const unanswered = answers[idx] === undefined

                                return (
                                    <div key={idx}
                                        className={`quiz-result-dot ${correct ? 'correct' : unanswered ? 'unanswered' : 'incorrect'}`}
                                        title={`Câu ${idx + 1}: ${correct ? 'Đúng' : unanswered ? 'Chưa trả lời' : 'Sai'}`}
                                    >
                                        {idx + 1}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="quiz-results-actions">
                        <button className="quiz-btn quiz-btn-outline" onClick={() => {
                            historySaved.current = false
                            setCurrentQ(0); setAnswers({}); setSubmitted(false); setShowResults(false); setEndTime(null)
                        }}>
                            <HiArrowPath /> Làm lại đề này
                        </button>
                        <button className="quiz-btn quiz-btn-primary" onClick={() => { historySaved.current = false; fetchQuiz() }}>
                            <HiSparkles /> Bộ đề mới
                        </button>
                        <button className="quiz-btn quiz-btn-outline" onClick={() => navigate('/dashboard/quiz-history')}>
                            <HiClipboardDocumentList /> Lịch sử
                        </button>
                        <button className="quiz-btn quiz-btn-ghost" onClick={() => navigate('/dashboard/quiz')}>
                            <HiArrowLeft /> Chọn môn khác
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ===== QUIZ QUESTION SCREEN =====
    const diffInfo = getDifficultyInfo(q.difficulty)

    return (
        <div className="quiz-page-wrapper">
            {/* Top bar */}
            <div className="quiz-top-bar">
                <div className="quiz-top-left">
                    <button className="quiz-back-btn" onClick={() => navigate('/dashboard/quiz')}>
                        <HiArrowLeft />
                    </button>
                    <div className="quiz-top-info">
                        <h2><HiSparkles className="quiz-sparkle" /> {courseName}</h2>
                        {bankInfo && (
                            <span className="quiz-bank-badge">
                                {bankInfo.picked} câu
                            </span>
                        )}
                    </div>
                </div>
                <div className="quiz-top-right">
                    <span className="quiz-counter">{currentQ + 1} / {total}</span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="quiz-progress-track">
                <div className="quiz-progress-fill" style={{ width: `${progress}%` }}></div>
            </div>

            {/* Question card */}
            <div className="quiz-card">
                <div className="quiz-card-header">
                    <span className="quiz-q-number">Câu {currentQ + 1}</span>
                    <span className="quiz-difficulty-badge" style={{
                        background: `${diffInfo.color}15`,
                        color: diffInfo.color,
                        border: `1px solid ${diffInfo.color}30`
                    }}>
                        {'⭐'.repeat(diffInfo.stars)} {diffInfo.label}
                    </span>
                    <span className="quiz-type-badge">
                        {q.type === 'multiple_choice' ? '📋 Trắc nghiệm' : '✅ Đúng/Sai'}
                    </span>
                </div>

                <div className="quiz-question-text">{q.question}</div>

                {/* Multiple choice options */}
                {q.type === 'multiple_choice' && (
                    <div className="quiz-options">
                        {q.options.map((opt, idx) => {
                            const isSelected = answers[currentQ] === idx
                            const isCorrectOption = idx === q.correctIdx
                            let stateClass = ''

                            if (submitted) {
                                if (isCorrectOption) stateClass = 'quiz-opt-correct'
                                else if (isSelected && !isCorrectOption) stateClass = 'quiz-opt-incorrect'
                                else stateClass = 'quiz-opt-muted'
                            } else if (isSelected) {
                                stateClass = 'quiz-opt-selected'
                            }

                            return (
                                <button key={idx}
                                    className={`quiz-option ${stateClass}`}
                                    onClick={() => handleAnswer(idx)}
                                    disabled={submitted}
                                >
                                    <span className="quiz-opt-letter">{String.fromCharCode(65 + idx)}</span>
                                    <span className="quiz-opt-text">{opt}</span>
                                    {submitted && isCorrectOption && (
                                        <HiCheckCircle className="quiz-opt-icon correct" />
                                    )}
                                    {submitted && isSelected && !isCorrectOption && (
                                        <HiXCircle className="quiz-opt-icon incorrect" />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}

                {/* True/False options */}
                {q.type === 'true_false' && (
                    <div className="quiz-options quiz-options-tf">
                        {[true, false].map(val => {
                            const isSelected = answers[currentQ] === val
                            const isCorrectOption = val === q.answer
                            let stateClass = ''

                            if (submitted) {
                                if (isCorrectOption) stateClass = 'quiz-opt-correct'
                                else if (isSelected && !isCorrectOption) stateClass = 'quiz-opt-incorrect'
                                else stateClass = 'quiz-opt-muted'
                            } else if (isSelected) {
                                stateClass = 'quiz-opt-selected'
                            }

                            return (
                                <button key={String(val)}
                                    className={`quiz-option quiz-option-tf ${stateClass}`}
                                    onClick={() => handleAnswer(val)}
                                    disabled={submitted}
                                >
                                    <span className="quiz-tf-icon">{val ? '✅' : '❌'}</span>
                                    <span className="quiz-opt-text">{val ? 'Đúng' : 'Sai'}</span>
                                    {submitted && isCorrectOption && (
                                        <HiCheckCircle className="quiz-opt-icon correct" />
                                    )}
                                    {submitted && isSelected && !isCorrectOption && (
                                        <HiXCircle className="quiz-opt-icon incorrect" />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}

                {/* Submit button */}
                {!submitted && answers[currentQ] !== undefined && (
                    <button className="quiz-btn quiz-btn-check" onClick={handleSubmitQuestion}>
                        <HiCheckCircle /> Kiểm tra đáp án
                    </button>
                )}

                {/* Explanation */}
                {submitted && (
                    <div className={`quiz-explanation ${isCorrect() ? 'correct' : 'incorrect'}`}>
                        <div className="quiz-explanation-header">
                            {isCorrect()
                                ? <><HiCheckCircle /> Chính xác!</>
                                : <><HiXCircle /> Chưa đúng!</>
                            }
                        </div>
                        <div className="quiz-explanation-body">
                            <HiLightBulb className="quiz-explanation-bulb" />
                            <p>{q.explanation}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="quiz-nav-bar">
                <button className="quiz-btn quiz-btn-outline" onClick={handlePrev} disabled={currentQ === 0}>
                    ← Câu trước
                </button>
                <div className="quiz-nav-dots">
                    {quizData.map((_, idx) => (
                        <span key={idx}
                            className={`quiz-nav-dot ${idx === currentQ ? 'active' : ''} ${answers[idx] !== undefined ? 'answered' : ''}`}
                        />
                    ))}
                </div>
                <button className="quiz-btn quiz-btn-primary" onClick={handleNext}>
                    {currentQ === total - 1 ? 'Xem kết quả →' : 'Câu tiếp →'}
                </button>
            </div>
        </div>
    )
}
