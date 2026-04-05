import { useContext, useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { AppContext } from '../App'
import MicroActivity from '../components/MicroActivity'
import ImmersiveText from '../components/ImmersiveText'
import MindmapView from '../components/MindmapView'
import { HiCheckCircle, HiSparkles, HiDocumentText, HiXMark, HiChevronDoubleLeft, HiChevronDoubleRight } from 'react-icons/hi2'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const VIEW_MODES = [
    { id: 'source', icon: '📄', label: 'Source' },
    { id: 'immersive', icon: '📖', label: 'Immersive Text' },
    { id: 'slides', icon: '🎬', label: 'Slides & Narration' },
    { id: 'mindmap', icon: '🧠', label: 'Mindmap' },
]

/* ── Source View: render nội dung gốc từ lesson.content ── */
function SourceView({ content, onActivity }) {
    if (!content) return null
    return (
        <div className="source-view">
            <h2 className="source-title">{content.title}</h2>
            {content.sections?.map((sec, idx) => {
                // Tìm interaction point gắn với section này
                const ip = content.interactionPoints?.find(p => p.sectionIdx === idx)
                return (
                    <div key={idx} className="source-section">
                        <h3 className="source-heading">{sec.heading}</h3>
                        {sec.text && sec.text.split('\n').map((p, i) => (
                            <p key={i} className="source-text">{p}</p>
                        ))}
                        {sec.list && (
                            <ul className="source-list">
                                {sec.list.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                        )}
                        {ip && (
                            <button className="source-activity-btn" onClick={() => onActivity(ip)}>
                                <HiSparkles /> Trả lời câu hỏi tương tác
                            </button>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

export default function CourseLearning() {
    const { courseId } = useParams()
    const { lessons } = useContext(AppContext)
    const [activeLesson, setActiveLesson] = useState(null)
    const [activeActivity, setActiveActivity] = useState(null)
    const [uploadedFiles, setUploadedFiles] = useState([])
    const [viewingFile, setViewingFile] = useState(null)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [activeTab, setActiveTab] = useState('content')
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [viewMode, setViewMode] = useState('source')

    const courseData = lessons[courseId]

    // Fetch uploaded files for the current course/lesson
    useEffect(() => {
        if (!courseId) return
        fetchFiles()
    }, [courseId, activeLesson])

    // Reset tab and view when switching lessons
    useEffect(() => {
        setActiveTab('content')
        setViewingFile(null)
        setViewMode('source')
    }, [activeLesson])

    const fetchFiles = async () => {
        try {
            const params = new URLSearchParams({ courseId })
            if (activeLesson && activeLesson !== 'info' && activeLesson !== 'exam') {
                params.set('lessonId', activeLesson)
            }
            const res = await fetch(`${API_URL}/api/uploads?${params.toString()}`)
            if (res.ok) {
                const data = await res.json()
                setUploadedFiles(data)
            }
        } catch (err) {
            console.error('Lỗi tải danh sách tài liệu:', err)
        }
    }

    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / 1024 / 1024).toFixed(2) + ' MB'
    }

    const getFileIcon = (mimetype) => {
        if (mimetype === 'application/pdf') return '📄'
        if (mimetype?.includes('presentation') || mimetype?.includes('powerpoint')) return '📊'
        if (mimetype?.includes('word')) return '📝'
        return '📎'
    }

    if (!courseData) {
        return (
            <div className="learning-layout">
                <div className="lesson-content-area">
                    <div className="content-placeholder">Khóa học này chưa có dữ liệu demo. Hãy chọn khóa "Học máy" hoặc "Chuyển đổi số".</div>
                </div>
            </div>
        )
    }

    const selectedLesson = courseData.lessons.find(l => l.id === activeLesson)
    const hasContent = selectedLesson?.content
    const isSpecialTab = selectedLesson?.type === 'info' || selectedLesson?.type === 'exam'

    /* ── Render nội dung theo viewMode ── */
    const renderContentByMode = () => {
        const content = selectedLesson.content
        switch (viewMode) {
            case 'source':
                return <SourceView content={content} onActivity={setActiveActivity} />
            case 'immersive':
                return <ImmersiveText courseId={courseId} lessonId={activeLesson} lesson={selectedLesson} />
            case 'mindmap':
                return <MindmapView courseId={courseId} lessonId={activeLesson} lesson={selectedLesson} />
            case 'slides':
                return (
                    <div className="content-placeholder">
                        <div style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>🎬</span>
                            <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>Slides & Narration</h3>
                            <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                                Tính năng trình chiếu kèm thuyết minh AI đang được phát triển.<br />
                                Sẽ sớm ra mắt trong phiên bản tiếp theo! 🚀
                            </p>
                        </div>
                    </div>
                )
            default:
                return null
        }
    }

    return (
        <div className="learning-layout" style={{ margin: '-24px', height: 'calc(100% + 48px)' }}>
            {/* Lesson List Sidebar */}
            <div className={`lesson-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                <button className="lesson-sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title={sidebarCollapsed ? 'Mở danh sách bài' : 'Thu gọn'}>
                    {sidebarCollapsed ? <HiChevronDoubleRight /> : <HiChevronDoubleLeft />}
                </button>
                <div className="lesson-header">
                    {courseData.courseName} ({courseData.courseCode})
                </div>
                {courseData.lessons.map(lesson => {
                    const isExpanded = activeLesson === lesson.id
                    const isSpecial = lesson.type === 'info' || lesson.type === 'exam'
                    return (
                        <div key={lesson.id} className="lesson-item-wrapper">
                            <div
                                className={`lesson-item ${isExpanded ? 'active' : ''}`}
                                onClick={() => setActiveLesson(isExpanded ? null : lesson.id)}
                            >
                                <div style={{ width: 4, minHeight: 28, borderRadius: 2, background: lesson.type === 'exam' ? '#f0ad4e' : 'var(--primary-light)' }} />
                                {!isSpecial && (
                                    <span className={`lesson-toggle ${isExpanded ? 'expanded' : ''}`}>▶</span>
                                )}
                                <span className="lesson-name">{lesson.name}</span>
                                {lesson.completed && <span className="lesson-check"><HiCheckCircle /></span>}
                            </div>
                            {isExpanded && !isSpecial && (
                                <div className="lesson-sub-items">
                                    <div
                                        className={`lesson-sub-item ${activeTab === 'content' ? 'active' : ''}`}
                                        onClick={() => { setActiveTab('content'); setViewingFile(null) }}
                                    >
                                        <span className="sub-bullet">●</span> Nội dung bài học
                                    </div>
                                    <div
                                        className={`lesson-sub-item ${activeTab === 'materials' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('materials')}
                                    >
                                        <span className="sub-bullet">●</span> Tài liệu tham khảo
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Content Area */}
            <div className="lesson-content-area">
                {!selectedLesson || !hasContent ? (
                    <div className="content-placeholder">
                        {!activeLesson ? 'Vui lòng chọn 1 bài học để hiển thị nội dung.' : 'Nội dung bài học này chưa có dữ liệu demo.'}
                    </div>
                ) : activeTab === 'content' ? (
                    /* === NỘI DUNG BÀI HỌC với View Mode Switcher === */
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {/* View Mode Toolbar */}
                        <div className="view-mode-toolbar">
                            {VIEW_MODES.map(mode => (
                                <button
                                    key={mode.id}
                                    className={`view-mode-btn ${viewMode === mode.id ? 'active' : ''}`}
                                    onClick={() => setViewMode(mode.id)}
                                >
                                    <span className="view-mode-icon">{mode.icon}</span>
                                    <span className="view-mode-label">{mode.label}</span>
                                </button>
                            ))}
                        </div>
                        {/* Content by mode */}
                        <div className="view-mode-content">
                            {renderContentByMode()}
                        </div>
                    </div>
                ) : activeTab === 'materials' ? (
                    /* === TÀI LIỆU THAM KHẢO === */
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {!viewingFile ? (
                            /* --- File list --- */
                            <>
                                <div style={{ padding: '20px 24px 12px' }}>
                                    <h3 style={{ margin: '0 0 4px', fontSize: 16, color: 'var(--text-primary)' }}>📁 Tài liệu tham khảo</h3>
                                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Chọn tài liệu bạn muốn xem</p>
                                </div>

                                {uploadedFiles.length === 0 ? (
                                    <div className="content-placeholder" style={{ flex: 1 }}>
                                        Chưa có tài liệu nào được upload cho bài này.<br />
                                        Hãy vào <strong>Upload Tài Liệu</strong> để tải file lên.
                                    </div>
                                ) : (
                                    <div style={{ padding: '0 24px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {uploadedFiles.map((file, idx) => {
                                            const fileUrl = file.downloadUrl
                                                ? `${API_URL}${file.downloadUrl}`
                                                : `${API_URL}/uploads/${file.courseId}/${file.lessonId}/${file.storedName}`
                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => { setViewingFile(fileUrl); setIsFullscreen(false) }}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: 12,
                                                        padding: '12px 16px', borderRadius: 10,
                                                        background: 'var(--bg-primary)',
                                                        border: '1px solid var(--border)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                    }}
                                                >
                                                    <span style={{ fontSize: 28 }}>{getFileIcon(file.mimetype)}</span>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{
                                                            fontWeight: 600, fontSize: 14,
                                                            color: 'var(--text-primary)',
                                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                                        }}>
                                                            {file.originalName}
                                                        </div>
                                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                            {formatSize(file.size)}
                                                        </div>
                                                    </div>
                                                    <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 500 }}>
                                                        👁 Xem
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </>
                        ) : (
                            /* --- Inline document viewer --- */
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                                {/* Toolbar */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 16px',
                                    borderBottom: '1px solid var(--border)',
                                    background: 'var(--bg-secondary)',
                                    flexShrink: 0,
                                }}>
                                    <button
                                        onClick={() => { setViewingFile(null); setIsFullscreen(false) }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            padding: '6px 12px', borderRadius: 6,
                                            border: '1px solid var(--border)', background: 'var(--bg-primary)',
                                            color: 'var(--text-primary)', fontSize: 13,
                                            cursor: 'pointer', fontWeight: 500,
                                        }}
                                    >
                                        ← Quay lại
                                    </button>
                                    <button
                                        onClick={() => setIsFullscreen(true)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            padding: '6px 12px', borderRadius: 6,
                                            border: '1px solid var(--border)', background: 'var(--bg-primary)',
                                            color: 'var(--text-primary)', fontSize: 13,
                                            cursor: 'pointer', fontWeight: 500,
                                        }}
                                        title="Phóng toàn màn hình"
                                    >
                                        ⛶ Toàn màn hình
                                    </button>
                                </div>
                                {/* Iframe */}
                                <iframe
                                    src={`${viewingFile}#view=FitH&toolbar=1`}
                                    style={{ flex: 1, width: '100%', border: 'none', background: '#fff' }}
                                    title="Preview tài liệu"
                                />
                            </div>
                        )}

                        {/* Fullscreen overlay (only when user clicks fullscreen) */}
                        {viewingFile && isFullscreen && (
                            <div style={{
                                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                background: '#fff', zIndex: 9999,
                                display: 'flex', flexDirection: 'column',
                            }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 20px',
                                    borderBottom: '1px solid #e0e0e0',
                                    background: '#f8f9fa', flexShrink: 0,
                                }}>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>
                                        📄 Xem tài liệu
                                    </span>
                                    <button
                                        onClick={() => setIsFullscreen(false)}
                                        style={{
                                            padding: '6px 14px', borderRadius: 6,
                                            border: '1px solid #ccc', background: '#e0e0e0',
                                            color: '#333', fontSize: 13, fontWeight: 500,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        ✕ Thu nhỏ
                                    </button>
                                </div>
                                <iframe
                                    src={viewingFile}
                                    style={{ flex: 1, width: '100%', border: 'none' }}
                                    title="Preview tài liệu"
                                />
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            {/* Micro Activity Popup */}
            {activeActivity && (
                <MicroActivity activity={activeActivity} onClose={() => setActiveActivity(null)} />
            )}
        </div>
    )
}
