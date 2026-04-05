import { useContext, useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AppContext } from '../App'
import { HiHome, HiAcademicCap, HiClipboardDocumentCheck, HiClock, HiDocumentText, HiChatBubbleLeftEllipsis, HiBell, HiChartBar, HiCog6Tooth, HiSparkles, HiDocumentArrowUp, HiCpuChip, HiChevronUpDown, HiClipboardDocumentList } from 'react-icons/hi2'

const API_URL = 'http://localhost:3001'

export default function Sidebar() {
    const { sidebarCollapsed, user } = useContext(AppContext)
    const [models, setModels] = useState([])
    const [currentModel, setCurrentModel] = useState('')
    const [modelOpen, setModelOpen] = useState(false)
    const [switching, setSwitching] = useState(false)

    useEffect(() => {
        fetch(`${API_URL}/api/ai-models`)
            .then(r => r.json())
            .then(data => {
                setModels(data.models || [])
                setCurrentModel(data.current || '')
            })
            .catch(() => { })
    }, [])

    const handleModelChange = async (modelId) => {
        setSwitching(true)
        try {
            const res = await fetch(`${API_URL}/api/ai-model`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: modelId })
            })
            const data = await res.json()
            if (data.success) {
                setCurrentModel(data.model)
            }
        } catch (e) { }
        setSwitching(false)
        setModelOpen(false)
    }

    const currentModelInfo = models.find(m => m.id === currentModel)

    return (
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
            {/* Logo */}
            <div className="sidebar-logo">
                <div className="logo-icon">LMS</div>
                <div className="logo-text">
                    <span>LMS ICTU</span>
                    <span>lms.ictu.edu.vn</span>
                </div>
            </div>

            {/* User Info */}
            <div className="sidebar-user">
                <div className="user-avatar">{user?.name?.[0] || 'H'}</div>
                <div className="user-info">
                    <div className="user-name">{user?.name || 'Sinh viên'}</div>
                    <div className="user-id">{user?.id || ''}</div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                <div className="nav-group-label">Học tập</div>
                <NavLink to="/dashboard/bulletin-board" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <span className="nav-icon"><HiHome /></span>
                    Bảng tin LMS
                </NavLink>
                <NavLink to="/dashboard/classes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <span className="nav-icon"><HiAcademicCap /></span>
                    Lớp học phần
                </NavLink>
                <NavLink to="#" className="nav-item">
                    <span className="nav-icon"><HiClipboardDocumentCheck /></span>
                    Kiểm tra kỹ năng
                </NavLink>
                <NavLink to="#" className="nav-item">
                    <span className="nav-icon"><HiClock /></span>
                    Kiểm tra đầu giờ
                    <span className="nav-badge">KHÓA</span>
                </NavLink>
                <NavLink to="#" className="nav-item">
                    <span className="nav-icon"><HiDocumentText /></span>
                    Thi kết thúc học phần
                    <span className="nav-badge">KHÓA</span>
                </NavLink>
                <NavLink to="#" className="nav-item">
                    <span className="nav-icon"><HiChatBubbleLeftEllipsis /></span>
                    Hỏi đáp với giảng viên
                </NavLink>
                <NavLink to="#" className="nav-item">
                    <span className="nav-icon"><HiBell /></span>
                    Thông báo
                </NavLink>

                <div className="nav-group-label">Kết quả</div>
                <NavLink to="/dashboard/results" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <span className="nav-icon"><HiChartBar /></span>
                    Tra cứu điểm
                </NavLink>

                <div className="nav-group-label">AI Agent</div>
                <NavLink to="/dashboard/upload" className={({ isActive }) => `nav-item agent-nav ${isActive ? 'active' : ''}`}>
                    <span className="nav-icon"><HiDocumentArrowUp /></span>
                    Upload Tài Liệu
                </NavLink>
                <NavLink to="/dashboard/quiz" className={({ isActive }) => `nav-item agent-nav ${isActive ? 'active' : ''}`}>
                    <span className="nav-icon"><HiSparkles /></span>
                    Quiz Generator
                </NavLink>
                <NavLink to="/dashboard/quiz-history" className={({ isActive }) => `nav-item agent-nav ${isActive ? 'active' : ''}`}>
                    <span className="nav-icon"><HiClipboardDocumentList /></span>
                    Lịch sử Quiz
                </NavLink>
            </nav>

            {/* Model Selector */}
            {!sidebarCollapsed && models.length > 0 && (
                <div className="model-selector-wrapper">
                    <button
                        className={`model-selector-btn ${modelOpen ? 'open' : ''}`}
                        onClick={() => setModelOpen(!modelOpen)}
                    >
                        <HiCpuChip className="model-selector-icon" />
                        <div className="model-selector-info">
                            <span className="model-selector-label">AI Model</span>
                            <span className="model-selector-name">{currentModelInfo?.name || currentModel}</span>
                        </div>
                        <HiChevronUpDown className="model-selector-chevron" />
                    </button>

                    {modelOpen && (
                        <div className="model-dropdown">
                            {models.map(m => (
                                <button
                                    key={m.id}
                                    className={`model-dropdown-item ${m.id === currentModel ? 'active' : ''}`}
                                    onClick={() => handleModelChange(m.id)}
                                    disabled={switching}
                                >
                                    <div className="model-dropdown-main">
                                        <span className="model-dropdown-name">{m.name}</span>
                                        {m.id === currentModel && <span className="model-active-dot"></span>}
                                    </div>
                                    <span className="model-dropdown-desc">{m.desc}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </aside>
    )
}
