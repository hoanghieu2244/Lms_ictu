import { useState, useRef, useEffect, useContext } from 'react'
import { AppContext } from '../App'
import { HiDocumentArrowUp, HiXMark, HiDocumentText, HiCpuChip, HiCheckCircle, HiClock, HiAcademicCap, HiBookOpen } from 'react-icons/hi2'

const API_URL = 'http://localhost:3001'

export default function UploadPage() {
    const { courses, lessons } = useContext(AppContext)
    const [dragActive, setDragActive] = useState(false)
    const [files, setFiles] = useState([])
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [step, setStep] = useState('upload') // upload | processing | complete
    const [error, setError] = useState('')
    const [uploadedFiles, setUploadedFiles] = useState([])
    const inputRef = useRef(null)

    // Course / Lesson selection
    const [selectedCourseId, setSelectedCourseId] = useState('')
    const [selectedLessonId, setSelectedLessonId] = useState('')

    const selectedCourse = courses.find(c => String(c.id) === String(selectedCourseId))
    const courseLessons = selectedCourseId && lessons[selectedCourseId]
        ? lessons[selectedCourseId].lessons.filter(l => l.type !== 'info' && l.type !== 'exam')
        : []

    // Load uploaded files
    useEffect(() => {
        fetchUploadedFiles()
    }, [selectedCourseId, selectedLessonId])

    const fetchUploadedFiles = async () => {
        try {
            let url = `${API_URL}/api/uploads`
            const params = new URLSearchParams()
            if (selectedCourseId) params.set('courseId', selectedCourseId)
            if (selectedLessonId) params.set('lessonId', selectedLessonId)
            if (params.toString()) url += `?${params.toString()}`

            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                setUploadedFiles(data)
            }
        } catch (err) {
            console.error('Không tải được danh sách file:', err)
        }
    }

    const handleDrag = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }

    const handleDrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files)
        }
    }

    const handleChange = (e) => {
        e.preventDefault()
        if (e.target.files && e.target.files[0]) {
            handleFiles(e.target.files)
        }
    }

    const MAX_SIZE = 200 * 1024 * 1024 // 200MB

    const handleFiles = (newFiles) => {
        setError('')
        const fileArr = Array.from(newFiles).filter(f =>
            f.type === 'application/pdf' ||
            f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            f.type === 'application/msword' ||
            f.type === 'application/vnd.ms-powerpoint' ||
            f.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        )

        if (fileArr.length === 0) {
            setError('Chỉ hỗ trợ file PDF, Word (.doc/.docx), PowerPoint (.ppt/.pptx)')
            return
        }

        const tooBig = fileArr.filter(f => f.size > MAX_SIZE)
        if (tooBig.length > 0) {
            setError(`File "${tooBig[0].name}" quá lớn (${(tooBig[0].size / 1024 / 1024).toFixed(1)}MB). Tối đa 200MB/file.`)
            return
        }

        setFiles([...files, ...fileArr])
    }

    const removeFile = (idx) => {
        const newFiles = [...files]
        newFiles.splice(idx, 1)
        setFiles(newFiles)
    }

    const handleUpload = async () => {
        if (files.length === 0) return

        if (!selectedCourseId) {
            setError('Vui lòng chọn Môn học')
            return
        }

        setError('')
        setUploading(true)
        setStep('processing')
        setProgress(0)

        const formData = new FormData()
        files.forEach(f => formData.append('files', f))
        formData.append('courseId', selectedCourseId)
        formData.append('courseName', selectedCourse?.name || '')
        formData.append('lessonId', selectedLessonId || 'general')
        formData.append('lessonName', courseLessons.find(l => l.id === selectedLessonId)?.name || 'Chung')

        // Simulate progress while uploading
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) return prev
                return prev + Math.random() * 10
            })
        }, 300)

        try {
            const res = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                body: formData,
            })

            clearInterval(progressInterval)

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Upload thất bại')
            }

            setProgress(100)
            setTimeout(() => {
                setUploading(false)
                setStep('complete')
                fetchUploadedFiles()
            }, 500)
        } catch (err) {
            clearInterval(progressInterval)
            setUploading(false)
            setStep('upload')
            setError(err.message || 'Lỗi khi upload file')
        }
    }

    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / 1024 / 1024).toFixed(2) + ' MB'
    }

    const formatDate = (iso) => {
        const d = new Date(iso)
        return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 0' }}>
            <div className="page-header" style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Upload bài giảng</h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Tải lên file bài giảng (PDF, Word, PPT) để AI Agent phân tích, tạo Quiz, Flashcard và gắn tương tác tự động.
                </p>
            </div>

            {step === 'upload' && (
                <div className="card">
                    <div className="card-body">
                        {/* Course/Lesson selector */}
                        <div className="upload-selectors">
                            <div className="selector-group">
                                <label className="selector-label">
                                    <HiAcademicCap /> Môn học <span className="required">*</span>
                                </label>
                                <select
                                    className="selector-select"
                                    value={selectedCourseId}
                                    onChange={e => { setSelectedCourseId(e.target.value); setSelectedLessonId('') }}
                                >
                                    <option value="">— Chọn môn học —</option>
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="selector-group">
                                <label className="selector-label">
                                    <HiBookOpen /> Bài giảng
                                </label>
                                <select
                                    className="selector-select"
                                    value={selectedLessonId}
                                    onChange={e => setSelectedLessonId(e.target.value)}
                                    disabled={!selectedCourseId || courseLessons.length === 0}
                                >
                                    <option value="">— Chung (không chọn bài cụ thể) —</option>
                                    {courseLessons.map(l => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                                {selectedCourseId && courseLessons.length === 0 && (
                                    <span className="selector-hint">Môn này chưa có danh sách bài giảng</span>
                                )}
                            </div>
                        </div>

                        {/* Upload zone */}
                        <div
                            className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => inputRef.current?.click()}
                        >
                            <input
                                ref={inputRef}
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx,.ppt,.pptx"
                                onChange={handleChange}
                                style={{ display: 'none' }}
                            />
                            <div className="upload-icon">
                                <HiDocumentArrowUp />
                            </div>
                            <h3>Bấm để chọn hoặc kéo thả file vào đây</h3>
                            <p>Hỗ trợ: PDF, DOCX, PPTX (Tối đa 200MB/file)</p>
                        </div>

                        {error && <div className="upload-error">{error}</div>}

                        {files.length > 0 && (
                            <div className="file-list">
                                <h4 style={{ marginBottom: 12, marginTop: 24, fontSize: 14 }}>File đã chọn ({files.length})</h4>
                                <div className="file-items">
                                    {files.map((file, idx) => (
                                        <div key={idx} className="file-item">
                                            <div className="file-icon"><HiDocumentText /></div>
                                            <div className="file-info">
                                                <div className="file-name">{file.name}</div>
                                                <div className="file-size">{formatSize(file.size)}</div>
                                            </div>
                                            <button className="remove-btn" onClick={(e) => { e.stopPropagation(); removeFile(idx) }}>
                                                <HiXMark />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginTop: 24, textAlign: 'right' }}>
                                    <button
                                        className="upload-submit-btn"
                                        onClick={handleUpload}
                                    >
                                        <HiDocumentArrowUp style={{ fontSize: 18 }} /> Upload & AI phân tích
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {step === 'processing' && (
                <div className="card processing-card">
                    <div className="card-body" style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <div className="ai-pulse-icon">
                            <HiCpuChip />
                        </div>
                        <h3 style={{ fontSize: 20, marginBottom: 12 }}>Đang upload & phân tích tài liệu...</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
                            Đang tải file lên server và AI Agent phân tích nội dung
                        </p>
                        <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--agent-primary)', fontWeight: 600 }}>
                            {Math.floor(progress)}%
                        </div>
                    </div>
                </div>
            )}

            {step === 'complete' && (
                <div className="card success-card">
                    <div className="card-body" style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <div className="success-circle" style={{ margin: '0 auto 20px', width: 80, height: 80, fontSize: 40 }}>
                            <HiCheckCircle />
                        </div>
                        <h3 style={{ fontSize: 22, marginBottom: 12, color: 'var(--success)' }}>Upload hoàn tất!</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
                            File đã được lưu thành công vào hệ thống.
                        </p>
                        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                            <button className="upload-secondary-btn" onClick={() => { setStep('upload'); setFiles([]) }}>
                                Tải thêm file
                            </button>
                            <button className="upload-submit-btn" onClick={() => window.location.href = `/dashboard/classes/learning/${selectedCourseId}`}>
                                Xem bài giảng ngay
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Uploaded files history */}
            {uploadedFiles.length > 0 && step === 'upload' && (
                <div className="card" style={{ marginTop: 24 }}>
                    <div className="card-body">
                        <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <HiClock style={{ color: 'var(--agent-primary)' }} />
                            File đã upload ({uploadedFiles.length})
                        </h4>
                        <div className="file-items">
                            {uploadedFiles.map((file) => (
                                <div key={file.id} className="file-item uploaded-file-item">
                                    <div className="file-icon"><HiDocumentText /></div>
                                    <div className="file-info">
                                        <div className="file-name">{file.originalName}</div>
                                        <div className="file-meta">
                                            <span>{formatSize(file.size)}</span>
                                            <span>•</span>
                                            <span>{file.courseName}</span>
                                            {file.lessonName && file.lessonName !== 'Chung' && (
                                                <>
                                                    <span>•</span>
                                                    <span>{file.lessonName}</span>
                                                </>
                                            )}
                                            <span>•</span>
                                            <span>{formatDate(file.uploadedAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
