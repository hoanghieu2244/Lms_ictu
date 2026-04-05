import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../App'
import { HiClipboardDocumentList, HiTrophy, HiClock, HiAcademicCap, HiArrowPath, HiSparkles, HiCheckCircle, HiXCircle, HiChartBar, HiTrash } from 'react-icons/hi2'

const API_URL = 'http://localhost:3001'

export default function QuizHistoryPage() {
    const { courses } = useContext(AppContext)
    const navigate = useNavigate()
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [filterCourse, setFilterCourse] = useState('all')

    const fetchHistory = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_URL}/api/quiz-history`)
            const data = await res.json()
            setHistory(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Lỗi lấy quiz history:', err)
            setHistory([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchHistory()
    }, [])

    const filteredHistory = filterCourse === 'all'
        ? history
        : history.filter(h => String(h.courseId) === filterCourse)

    // Thống kê tổng
    const totalAttempts = filteredHistory.length
    const avgScore = totalAttempts > 0
        ? Math.round(filteredHistory.reduce((acc, h) => acc + (h.percent || 0), 0) / totalAttempts)
        : 0
    const bestScore = totalAttempts > 0
        ? Math.max(...filteredHistory.map(h => h.percent || 0))
        : 0
    const totalTime = filteredHistory.reduce((acc, h) => acc + (h.timeTaken || 0), 0)

    const formatTime = (ms) => {
        const totalSec = Math.floor(ms / 1000)
        const min = Math.floor(totalSec / 60)
        const sec = totalSec % 60
        return `${min}:${sec < 10 ? '0' : ''}${sec}`
    }

    const formatDate = (dateStr) => {
        const d = new Date(dateStr)
        const now = new Date()
        const diff = now - d
        const mins = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (mins < 1) return 'Vừa xong'
        if (mins < 60) return `${mins} phút trước`
        if (hours < 24) return `${hours} giờ trước`
        if (days < 7) return `${days} ngày trước`
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    const getGradeInfo = (percent) => {
        if (percent >= 90) return { emoji: '🏆', label: 'Xuất sắc', color: '#10b981', bg: '#10b98115' }
        if (percent >= 70) return { emoji: '🎉', label: 'Tốt', color: '#3b82f6', bg: '#3b82f615' }
        if (percent >= 50) return { emoji: '👏', label: 'Khá', color: '#f59e0b', bg: '#f59e0b15' }
        return { emoji: '💪', label: 'Cần cố gắng', color: '#ef4444', bg: '#ef444415' }
    }

    // Unique courses in history
    const uniqueCourses = [...new Map(history.map(h => [h.courseId, { id: h.courseId, name: h.courseName }])).values()]

    return (
        <div className="quiz-history-container">
            {/* Header */}
            <div className="quiz-history-header">
                <div className="quiz-history-header-left">
                    <HiClipboardDocumentList style={{ color: 'var(--agent-quiz)', fontSize: 28 }} />
                    <div>
                        <h2>Lịch sử Quiz</h2>
                        <p>Theo dõi tiến trình học tập qua các lần kiểm tra</p>
                    </div>
                </div>
                <div className="quiz-history-header-actions">
                    <button className="quiz-btn quiz-btn-primary" onClick={() => navigate('/dashboard/quiz')}>
                        <HiSparkles /> Làm quiz mới
                    </button>
                </div>
            </div>

            {/* Stats summary */}
            <div className="quiz-history-stats">
                <div className="quiz-history-stat-card">
                    <div className="stat-icon" style={{ background: '#6366f115', color: '#6366f1' }}>
                        <HiChartBar />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{totalAttempts}</span>
                        <span className="stat-label">Lần làm</span>
                    </div>
                </div>
                <div className="quiz-history-stat-card">
                    <div className="stat-icon" style={{ background: '#10b98115', color: '#10b981' }}>
                        <HiTrophy />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{avgScore}%</span>
                        <span className="stat-label">Trung bình</span>
                    </div>
                </div>
                <div className="quiz-history-stat-card">
                    <div className="stat-icon" style={{ background: '#f59e0b15', color: '#f59e0b' }}>
                        <HiSparkles />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{bestScore}%</span>
                        <span className="stat-label">Cao nhất</span>
                    </div>
                </div>
                <div className="quiz-history-stat-card">
                    <div className="stat-icon" style={{ background: '#8b5cf615', color: '#8b5cf6' }}>
                        <HiClock />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{formatTime(totalTime)}</span>
                        <span className="stat-label">Tổng thời gian</span>
                    </div>
                </div>
            </div>

            {/* Filter */}
            {uniqueCourses.length > 1 && (
                <div className="quiz-history-filter">
                    <button
                        className={`filter-chip ${filterCourse === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterCourse('all')}
                    >
                        Tất cả
                    </button>
                    {uniqueCourses.map(c => (
                        <button
                            key={c.id}
                            className={`filter-chip ${filterCourse === c.id ? 'active' : ''}`}
                            onClick={() => setFilterCourse(c.id)}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Timeline */}
            {loading ? (
                <div className="quiz-history-loading">
                    <div className="quiz-loading-dots"><span></span><span></span><span></span></div>
                    <p>Đang tải lịch sử...</p>
                </div>
            ) : filteredHistory.length === 0 ? (
                <div className="quiz-history-empty">
                    <div className="quiz-history-empty-icon">📋</div>
                    <h3>Chưa có lịch sử quiz</h3>
                    <p>Hãy làm một bài quiz để bắt đầu theo dõi tiến trình!</p>
                    <button className="quiz-btn quiz-btn-primary" onClick={() => navigate('/dashboard/quiz')}>
                        <HiSparkles /> Làm quiz ngay
                    </button>
                </div>
            ) : (
                <div className="quiz-history-timeline">
                    {filteredHistory.map((entry, idx) => {
                        const grade = getGradeInfo(entry.percent)
                        return (
                            <div key={entry.id || idx} className="quiz-history-card">
                                <div className="history-card-left">
                                    <div className="history-score-ring" style={{ borderColor: grade.color }}>
                                        <span style={{ color: grade.color }}>{entry.percent}%</span>
                                    </div>
                                </div>
                                <div className="history-card-body">
                                    <div className="history-card-top">
                                        <h4>{entry.courseName}</h4>
                                        <span className="history-grade-badge" style={{ background: grade.bg, color: grade.color }}>
                                            {grade.emoji} {grade.label}
                                        </span>
                                    </div>
                                    <div className="history-card-meta">
                                        <span><HiCheckCircle style={{ color: '#10b981' }} /> {entry.score} đúng</span>
                                        <span><HiXCircle style={{ color: '#ef4444' }} /> {entry.total - entry.score} sai</span>
                                        <span><HiClock style={{ color: '#6366f1' }} /> {formatTime(entry.timeTaken)}</span>
                                        <span className="history-date">{formatDate(entry.date)}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
