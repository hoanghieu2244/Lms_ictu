import { useState, useEffect, useRef, useCallback } from 'react'
import { HiCheckCircle, HiXCircle } from 'react-icons/hi2'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function ImmersiveText({ courseId, lessonId, lesson }) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [scrollProgress, setScrollProgress] = useState(0)
    const [openQuizIdx, setOpenQuizIdx] = useState(null)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [answered, setAnswered] = useState(false)
    const [checklistState, setChecklistState] = useState({})
    const [loadedFromCache, setLoadedFromCache] = useState(false)
    const scrollRef = useRef(null)

    useEffect(() => {
        if (!lesson?.content) return
        fetchImmersiveText()
    }, [courseId, lessonId])

    const fetchImmersiveText = async () => {
        setLoading(true)
        setError(null)
        setLoadedFromCache(false)
        const startTime = Date.now()
        try {
            const res = await fetch(`${API_URL}/api/ai/immersive-text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseId,
                    lessonId,
                    title: lesson.content.title,
                    sections: lesson.content.sections,
                })
            })
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.error || `API error: ${res.status}`)
            }
            const result = await res.json()
            if (!result.sections || result.sections.length === 0) {
                throw new Error('AI trả về dữ liệu không hợp lệ')
            }
            setData(result)
            // Nếu load < 2 giây → data từ cache (pre-trained)
            if (Date.now() - startTime < 2000) {
                setLoadedFromCache(true)
            }
        } catch (err) {
            console.error('Immersive text error:', err)
            setError(`Lỗi AI: ${err.message}`)
            setData({
                title: lesson.content.title,
                overview: null,
                sections: lesson.content.sections.map(s => ({
                    iconLabel: '📄',
                    heading: s.heading,
                    keyInsight: null,
                    content: s.text || (s.list ? s.list.map(item => `- ${item}`).join('\n') : ''),
                    realWorldExample: null,
                    checklist: [],
                    quiz: null
                }))
            })
        } finally {
            setLoading(false)
        }
    }

    // Scroll progress tracking
    const handleScroll = useCallback(() => {
        const el = scrollRef.current
        if (!el) return
        const scrollTop = el.scrollTop
        const scrollHeight = el.scrollHeight - el.clientHeight
        const progress = scrollHeight > 0 ? Math.min((scrollTop / scrollHeight) * 100, 100) : 0
        setScrollProgress(progress)
    }, [])

    useEffect(() => {
        const el = scrollRef.current
        if (!el) return
        el.addEventListener('scroll', handleScroll, { passive: true })
        return () => el.removeEventListener('scroll', handleScroll)
    }, [handleScroll, data])

    const handleQuizToggle = (idx) => {
        if (openQuizIdx === idx) {
            setOpenQuizIdx(null)
        } else {
            setOpenQuizIdx(idx)
            setSelectedAnswer(null)
            setAnswered(false)
        }
    }

    const handleAnswerSelect = (optIdx) => {
        if (answered) return
        setSelectedAnswer(optIdx)
        setAnswered(true)
    }

    const toggleChecklistItem = (sectionIdx, itemIdx) => {
        const key = `${sectionIdx}-${itemIdx}`
        setChecklistState(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const renderMarkdown = (text) => {
        if (!text) return null
        const lines = text.split('\n')
        const elements = []
        let listItems = []

        const flushList = () => {
            if (listItems.length > 0) {
                elements.push(
                    <ul key={`list-${elements.length}`} className="imm-content-list">
                        {listItems.map((item, i) => (
                            <li key={i} dangerouslySetInnerHTML={{ __html: processInline(item) }} />
                        ))}
                    </ul>
                )
                listItems = []
            }
        }

        const processInline = (str) => {
            return str
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code>$1</code>')
        }

        lines.forEach((line, i) => {
            if (line.startsWith('## ')) {
                flushList()
                elements.push(
                    <h4 key={i} className="imm-content-subheading"
                        dangerouslySetInnerHTML={{ __html: processInline(line.slice(3)) }} />
                )
            } else if (line.startsWith('### ')) {
                flushList()
                elements.push(
                    <h5 key={i} className="imm-content-subsubheading"
                        dangerouslySetInnerHTML={{ __html: processInline(line.slice(4)) }} />
                )
            } else if (line.startsWith('- ') || line.startsWith('• ')) {
                listItems.push(line.slice(2))
            } else if (line.trim() === '') {
                flushList()
            } else {
                flushList()
                elements.push(
                    <p key={i} className="imm-content-para"
                        dangerouslySetInnerHTML={{ __html: processInline(line) }} />
                )
            }
        })
        flushList()
        return elements
    }

    if (loading) {
        return (
            <div className="imm-loading">
                <div className="imm-loading-icon">
                    <div className="imm-loading-spinner" />
                    <span className="imm-loading-emoji">🤖</span>
                </div>
                <p className="imm-loading-title">Đang phân tích và thiết kế nội dung Immersive...</p>
                <p className="imm-loading-sub">AI đang đọc kỹ tài liệu và chuyển đổi thành nội dung học tập trực quan</p>
                <div className="imm-loading-dots">
                    <span /><span /><span />
                </div>
            </div>
        )
    }

    if (!data) return null

    return (
        <div className="imm-wrapper">
            {/* Progress bar */}
            <div className="imm-progress-bar">
                <div className="imm-progress-fill" style={{ width: `${scrollProgress}%` }} />
            </div>

            <div className="imm-scroll-area" ref={scrollRef}>
                {error && <div className="imm-error">⚠️ {error}</div>}

                {/* Hero Section */}
                <div className="imm-hero">
                    <h1 className="imm-hero-title">{data.title}</h1>
                    {data.overview && (
                        <p className="imm-hero-overview">{data.overview}</p>
                    )}
                    <div className="imm-hero-meta">
                        {loadedFromCache && (
                            <span className="imm-cache-badge">⚡ Pre-trained</span>
                        )}
                        <span>📚 {data.sections?.length || 0} phần kiến thức</span>
                        <span>📝 {data.sections?.filter(s => s.quiz).length || 0} câu hỏi quiz</span>
                    </div>
                </div>

                {/* Sections */}
                <div className="imm-sections">
                    {data.sections.map((section, idx) => (
                        <div key={idx} className="imm-section" style={{ animationDelay: `${idx * 0.08}s` }}>
                            {/* Section Header */}
                            <div className="imm-section-header">
                                <span className="imm-section-icon">{section.iconLabel || '📌'}</span>
                                <div className="imm-section-header-text">
                                    <span className="imm-section-number">Phần {idx + 1}</span>
                                    <h2 className="imm-section-title">{section.heading}</h2>
                                </div>
                            </div>

                            {/* Key Insight */}
                            {section.keyInsight && (
                                <div className="imm-key-insight">
                                    <span className="imm-key-insight-icon">🔑</span>
                                    <p>{section.keyInsight}</p>
                                </div>
                            )}

                            {/* Content Body */}
                            <div className="imm-body">
                                {renderMarkdown(section.content)}
                            </div>

                            {/* Real World Example */}
                            {section.realWorldExample && (
                                <div className="imm-example">
                                    <div className="imm-example-header">
                                        <span>💡</span>
                                        <h4>Ví dụ thực tế doanh nghiệp</h4>
                                    </div>
                                    <p>{section.realWorldExample}</p>
                                </div>
                            )}

                            {/* Checklist */}
                            {section.checklist && section.checklist.length > 0 && (
                                <div className="imm-checklist">
                                    <h4 className="imm-checklist-title">✅ Checklist ghi nhớ</h4>
                                    <div className="imm-checklist-items">
                                        {section.checklist.map((item, i) => {
                                            const key = `${idx}-${i}`
                                            const checked = checklistState[key] || false
                                            return (
                                                <label key={i} className={`imm-checklist-item ${checked ? 'checked' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleChecklistItem(idx, i)}
                                                    />
                                                    <span className="imm-checkbox-custom" />
                                                    <span className={`imm-checklist-text ${checked ? 'done' : ''}`}>{item}</span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Quiz Inline */}
                            {section.quiz && (
                                <div className="imm-quiz-wrapper">
                                    <button
                                        className={`imm-quiz-toggle ${openQuizIdx === idx ? 'open' : ''}`}
                                        onClick={() => handleQuizToggle(idx)}
                                    >
                                        <span>📝 Kiểm tra hiểu biết</span>
                                        <span className="imm-quiz-chevron">{openQuizIdx === idx ? '▲' : '▼'}</span>
                                    </button>
                                    {openQuizIdx === idx && (
                                        <div className="imm-quiz-content">
                                            <p className="imm-quiz-question">{section.quiz.question}</p>
                                            <div className="imm-quiz-options">
                                                {section.quiz.options.map((opt, optIdx) => {
                                                    let cls = 'imm-quiz-option'
                                                    if (answered) {
                                                        if (optIdx === section.quiz.correctIdx) cls += ' correct'
                                                        else if (optIdx === selectedAnswer) cls += ' wrong'
                                                    } else if (optIdx === selectedAnswer) {
                                                        cls += ' selected'
                                                    }
                                                    return (
                                                        <button
                                                            key={optIdx}
                                                            className={cls}
                                                            onClick={() => handleAnswerSelect(optIdx)}
                                                        >
                                                            <span className="imm-opt-letter">{String.fromCharCode(65 + optIdx)}</span>
                                                            <span className="imm-opt-text">{opt}</span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                            {answered && (
                                                <div className={`imm-quiz-feedback ${selectedAnswer === section.quiz.correctIdx ? 'correct' : 'wrong'}`}>
                                                    {selectedAnswer === section.quiz.correctIdx ? (
                                                        <><HiCheckCircle className="imm-feedback-icon" /> <strong>Chính xác! 🎯</strong></>
                                                    ) : (
                                                        <><HiXCircle className="imm-feedback-icon" /> <strong>Chưa đúng!</strong></>
                                                    )}
                                                    <p>{section.quiz.explanation}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="imm-footer">
                    <p>✨ Nội dung được AI phân tích và thiết kế từ tài liệu bài giảng gốc</p>
                </div>
            </div>
        </div>
    )
}
