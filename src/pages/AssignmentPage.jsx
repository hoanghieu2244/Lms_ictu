import { useContext, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppContext } from '../App'
import { HiSparkles, HiDocumentText, HiPaperAirplane, HiPencilSquare, HiChevronLeft, HiCheckCircle, HiExclamationTriangle, HiAcademicCap, HiClipboardDocumentList } from 'react-icons/hi2'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function AssignmentPage() {
    const { courseId } = useParams()
    const navigate = useNavigate()
    const { courses } = useContext(AppContext)
    const [assignments, setAssignments] = useState([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState('list') // 'list' | 'create' | 'submit'
    const [selectedAssignment, setSelectedAssignment] = useState(null)

    // Form tạo bài tập
    const [createTitle, setCreateTitle] = useState('')
    const [createDesc, setCreateDesc] = useState('')
    const [creating, setCreating] = useState(false)

    // Form nộp bài
    const [submissionText, setSubmissionText] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [gradeResult, setGradeResult] = useState(null)

    // Sửa rubric
    const [editingRubric, setEditingRubric] = useState(false)
    const [rubricText, setRubricText] = useState('')

    const course = courses?.find(c => c.id === Number(courseId))

    useEffect(() => {
        if (courseId) fetchAssignments()
    }, [courseId])

    const fetchAssignments = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_URL}/api/assignments/${courseId}`)
            if (res.ok) {
                const data = await res.json()
                setAssignments(data)
            }
        } catch (e) {
            console.error('Lỗi fetch assignments:', e)
        }
        setLoading(false)
    }

    const handleCreate = async () => {
        if (!createTitle.trim() || !createDesc.trim()) return
        setCreating(true)
        try {
            const res = await fetch(`${API_URL}/api/assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseId,
                    courseName: course?.name || '',
                    title: createTitle,
                    description: createDesc
                })
            })
            const data = await res.json()
            if (data.success) {
                setAssignments(prev => [data.assignment, ...prev])
                setCreateTitle('')
                setCreateDesc('')
                setTab('list')
                setSelectedAssignment(data.assignment)
            }
        } catch (e) {
            console.error('Lỗi tạo assignment:', e)
        }
        setCreating(false)
    }

    const handleSubmit = async () => {
        if (!submissionText.trim() || !selectedAssignment) return
        setSubmitting(true)
        setGradeResult(null)
        try {
            const res = await fetch(`${API_URL}/api/assignments/${selectedAssignment.id}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentName: 'Sinh viên',
                    studentId: '',
                    submissionText
                })
            })
            const data = await res.json()
            if (data.success) {
                setGradeResult(data.submission.grade)
                // Cập nhật lại danh sách
                fetchAssignments()
            }
        } catch (e) {
            console.error('Lỗi submit:', e)
        }
        setSubmitting(false)
    }

    const handleSaveRubric = async () => {
        if (!selectedAssignment) return
        try {
            const res = await fetch(`${API_URL}/api/assignments/${selectedAssignment.id}/rubric`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rubric: rubricText })
            })
            const data = await res.json()
            if (data.success) {
                setSelectedAssignment(prev => ({ ...prev, rubric: rubricText }))
                setEditingRubric(false)
                fetchAssignments()
            }
        } catch (e) {
            console.error('Lỗi save rubric:', e)
        }
    }

    // ===== Chọn môn nếu chưa có courseId =====
    if (!courseId) {
        return (
            <div className="assignment-page">
                <div className="assignment-header">
                    <h2><HiAcademicCap /> Chấm bài AI — Chọn môn học</h2>
                </div>
                <div className="course-grid" style={{ padding: 24 }}>
                    {courses?.map(c => (
                        <div key={c.id} className="course-card" onClick={() => navigate(`/dashboard/assignments/${c.id}`)}>
                            <div className="progress-circle" style={{ width: 50, height: 50, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20, fontWeight: 700 }}>
                                {c.id}
                            </div>
                            <div className="course-info">
                                <div className="course-name">{c.name}</div>
                                <div className="course-code">{c.code}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="assignment-page">
            {/* Header */}
            <div className="assignment-header">
                <button className="assign-back-btn" onClick={() => navigate('/dashboard/assignments')}>
                    <HiChevronLeft /> Quay lại
                </button>
                <h2><HiAcademicCap /> {course?.name || `Môn #${courseId}`} — Chấm bài AI</h2>
            </div>

            {/* Tab Bar */}
            <div className="assign-tabs">
                <button className={`assign-tab ${tab === 'list' ? 'active' : ''}`} onClick={() => { setTab('list'); setGradeResult(null) }}>
                    <HiClipboardDocumentList /> Danh sách bài tập
                </button>
                <button className={`assign-tab ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>
                    <HiPencilSquare /> Tạo bài tập mới
                </button>
                {selectedAssignment && (
                    <button className={`assign-tab ${tab === 'submit' ? 'active' : ''}`} onClick={() => setTab('submit')}>
                        <HiPaperAirplane /> Nộp bài & Chấm điểm
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="assign-content">
                {/* === TAB: DANH SÁCH === */}
                {tab === 'list' && (
                    <div className="assign-list">
                        {loading ? (
                            <div className="assign-empty">Đang tải...</div>
                        ) : assignments.length === 0 ? (
                            <div className="assign-empty">
                                <span style={{ fontSize: 52 }}>📝</span>
                                <h3>Chưa có bài tập nào</h3>
                                <p>Nhấn "Tạo bài tập mới" để bắt đầu</p>
                            </div>
                        ) : (
                            assignments.map(a => (
                                <div
                                    key={a.id}
                                    className={`assign-card ${selectedAssignment?.id === a.id ? 'selected' : ''}`}
                                    onClick={() => { setSelectedAssignment(a); setRubricText(a.rubric); setGradeResult(null); setSubmissionText(''); }}
                                >
                                    <div className="assign-card-icon">
                                        <HiDocumentText />
                                    </div>
                                    <div className="assign-card-info">
                                        <h4>{a.title}</h4>
                                        <p>{a.description.substring(0, 120)}{a.description.length > 120 ? '...' : ''}</p>
                                        <div className="assign-card-meta">
                                            <span>📅 {new Date(a.createdAt).toLocaleDateString('vi-VN')}</span>
                                            <span>📄 {a.submissions?.length || 0} bài nộp</span>
                                        </div>
                                    </div>
                                    <button className="assign-select-btn" onClick={(e) => { e.stopPropagation(); setSelectedAssignment(a); setRubricText(a.rubric); setTab('submit'); setGradeResult(null); setSubmissionText(''); }}>
                                        Nộp bài →
                                    </button>
                                </div>
                            ))
                        )}

                        {/* Chi tiết bài tập đã chọn */}
                        {selectedAssignment && (
                            <div className="assign-detail-panel">
                                <h3>📋 {selectedAssignment.title}</h3>
                                <div className="assign-detail-section">
                                    <h4>Đề bài:</h4>
                                    <p style={{ whiteSpace: 'pre-wrap' }}>{selectedAssignment.description}</p>
                                </div>
                                <div className="assign-detail-section">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <h4>🎯 Tiêu chí chấm điểm (Rubric):</h4>
                                        <button className="assign-edit-rubric-btn" onClick={() => setEditingRubric(!editingRubric)}>
                                            <HiPencilSquare /> {editingRubric ? 'Hủy' : 'Sửa Rubric'}
                                        </button>
                                    </div>
                                    {editingRubric ? (
                                        <div>
                                            <textarea
                                                className="assign-rubric-edit"
                                                value={rubricText}
                                                onChange={e => setRubricText(e.target.value)}
                                                rows={8}
                                            />
                                            <button className="assign-save-rubric-btn" onClick={handleSaveRubric}>
                                                ✅ Lưu tiêu chí
                                            </button>
                                        </div>
                                    ) : (
                                        <pre className="assign-rubric-display">{selectedAssignment.rubric}</pre>
                                    )}
                                </div>

                                {/* Lịch sử nộp bài */}
                                {selectedAssignment.submissions?.length > 0 && (
                                    <div className="assign-detail-section">
                                        <h4>📊 Lịch sử chấm điểm ({selectedAssignment.submissions.length} lần):</h4>
                                        <div className="assign-history">
                                            {selectedAssignment.submissions.slice(0, 5).map((s, i) => (
                                                <div key={s.id || i} className="assign-history-item">
                                                    <div className={`assign-history-score ${s.grade?.diem >= 8 ? 'excellent' : s.grade?.diem >= 5 ? 'pass' : 'fail'}`}>
                                                        {s.grade?.diem ?? '?'}<small>/10</small>
                                                    </div>
                                                    <div className="assign-history-info">
                                                        <span className="assign-history-name">{s.studentName}</span>
                                                        <span className="assign-history-date">{new Date(s.submittedAt).toLocaleString('vi-VN')}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* === TAB: TẠO BÀI TẬP MỚI === */}
                {tab === 'create' && (
                    <div className="assign-create-form">
                        <div className="assign-form-header">
                            <HiSparkles className="assign-form-icon" />
                            <div>
                                <h3>Tạo bài tập mới</h3>
                                <p>AI sẽ tự động tạo Tiêu chí chấm điểm (Rubric) dựa trên đề bài của bạn</p>
                            </div>
                        </div>

                        <div className="assign-form-group">
                            <label>Tiêu đề bài tập</label>
                            <input
                                type="text"
                                className="assign-input"
                                placeholder="VD: Bài tập lập trình — Quản lý sinh viên"
                                value={createTitle}
                                onChange={e => setCreateTitle(e.target.value)}
                            />
                        </div>

                        <div className="assign-form-group">
                            <label>Đề bài chi tiết</label>
                            <textarea
                                className="assign-textarea"
                                placeholder="Mô tả chi tiết yêu cầu bài tập. Ví dụ:&#10;Viết chương trình C++ quản lý danh sách sinh viên gồm các chức năng:&#10;1. Thêm sinh viên&#10;2. Xóa sinh viên&#10;3. Tìm kiếm theo tên&#10;4. Sắp xếp theo điểm trung bình"
                                value={createDesc}
                                onChange={e => setCreateDesc(e.target.value)}
                                rows={8}
                            />
                        </div>

                        <button
                            className="assign-create-btn"
                            onClick={handleCreate}
                            disabled={creating || !createTitle.trim() || !createDesc.trim()}
                        >
                            {creating ? (
                                <><span className="assign-spinner" /> AI đang tạo Rubric...</>
                            ) : (
                                <><HiSparkles /> Tạo bài tập + AI sinh Rubric</>
                            )}
                        </button>
                    </div>
                )}

                {/* === TAB: NỘP BÀI & CHẤM ĐIỂM === */}
                {tab === 'submit' && selectedAssignment && (
                    <div className="assign-submit-area">
                        <div className="assign-submit-left">
                            <div className="assign-submit-header">
                                <h3>📝 {selectedAssignment.title}</h3>
                                <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>{selectedAssignment.description}</p>
                            </div>

                            <div className="assign-rubric-box">
                                <h4>🎯 Tiêu chí chấm điểm:</h4>
                                <pre>{selectedAssignment.rubric}</pre>
                            </div>

                            <div className="assign-form-group">
                                <label>📄 Bài làm của bạn (Paste code / văn bản vào đây)</label>
                                <textarea
                                    className="assign-submission-textarea"
                                    placeholder="Dán code hoặc bài viết của bạn vào đây...&#10;&#10;Ví dụ:&#10;#include <iostream>&#10;using namespace std;&#10;&#10;int main() {&#10;    cout << &quot;Hello World&quot;;&#10;    return 0;&#10;}"
                                    value={submissionText}
                                    onChange={e => setSubmissionText(e.target.value)}
                                    rows={14}
                                />
                            </div>

                            <button
                                className="assign-submit-btn"
                                onClick={handleSubmit}
                                disabled={submitting || !submissionText.trim()}
                            >
                                {submitting ? (
                                    <><span className="assign-spinner" /> 🤖 AI đang chấm bài...</>
                                ) : (
                                    <><HiSparkles /> Nộp bài & AI Chấm điểm</>
                                )}
                            </button>
                        </div>

                        {/* Kết quả chấm điểm */}
                        <div className="assign-submit-right">
                            {!gradeResult && !submitting && (
                                <div className="assign-grade-placeholder">
                                    <span style={{ fontSize: 56 }}>🎓</span>
                                    <h3>Kết quả chấm điểm</h3>
                                    <p>Nhập bài làm và nhấn "Nộp bài" để AI chấm điểm tự động</p>
                                </div>
                            )}
                            {submitting && (
                                <div className="assign-grade-placeholder">
                                    <div className="assign-grading-animation">
                                        <span>🤖</span>
                                    </div>
                                    <h3>AI đang phân tích bài làm...</h3>
                                    <p>Đối chiếu với tiêu chí chấm điểm</p>
                                </div>
                            )}
                            {gradeResult && (
                                <div className="assign-grade-result">
                                    <div className={`assign-score-circle ${gradeResult.diem >= 8 ? 'excellent' : gradeResult.diem >= 5 ? 'pass' : 'fail'}`}>
                                        <span className="assign-score-number">{gradeResult.diem}</span>
                                        <span className="assign-score-total">/10</span>
                                    </div>
                                    <div className={`assign-score-label ${gradeResult.diem >= 8 ? 'excellent' : gradeResult.diem >= 5 ? 'pass' : 'fail'}`}>
                                        {gradeResult.diem >= 9 ? '🏆 Xuất sắc!' : gradeResult.diem >= 8 ? '🌟 Giỏi!' : gradeResult.diem >= 6.5 ? '👍 Khá' : gradeResult.diem >= 5 ? '✅ Đạt' : '⚠️ Chưa đạt'}
                                    </div>

                                    {gradeResult.chiTiet?.length > 0 && (
                                        <div className="assign-grade-section">
                                            <h4>📊 Chi tiết điểm:</h4>
                                            <ul>
                                                {gradeResult.chiTiet.map((d, i) => <li key={i}>{d}</li>)}
                                            </ul>
                                        </div>
                                    )}

                                    {gradeResult.nhanXet && (
                                        <div className="assign-grade-section">
                                            <h4>💬 Nhận xét:</h4>
                                            <p>{gradeResult.nhanXet}</p>
                                        </div>
                                    )}

                                    {gradeResult.diemManh && (
                                        <div className="assign-grade-section good">
                                            <h4><HiCheckCircle /> Điểm mạnh:</h4>
                                            <p>{gradeResult.diemManh}</p>
                                        </div>
                                    )}

                                    {gradeResult.canCaiThien && (
                                        <div className="assign-grade-section warn">
                                            <h4><HiExclamationTriangle /> Cần cải thiện:</h4>
                                            <p>{gradeResult.canCaiThien}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
