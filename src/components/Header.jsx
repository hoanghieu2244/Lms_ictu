import { useContext } from 'react'
import { useLocation } from 'react-router-dom'
import { AppContext } from '../App'
import { HiBars3, HiBell, HiMagnifyingGlass } from 'react-icons/hi2'

const BREADCRUMBS = {
    '/dashboard/bulletin-board': ['Bảng tin ICTU'],
    '/dashboard/classes': ['Lớp học phần'],
    '/dashboard/results': ['Kết quả', 'Tra cứu điểm'],
}

export default function Header() {
    const { sidebarCollapsed, setSidebarCollapsed } = useContext(AppContext)
    const location = useLocation()

    const getBreadcrumb = () => {
        if (location.pathname.includes('/classes/learning/')) {
            return ['Lớp học phần', 'Nội dung học']
        }
        if (location.pathname.includes('/quiz/')) {
            return ['AI Agent', 'Quiz Generator']
        }
        return BREADCRUMBS[location.pathname] || ['Dashboard']
    }

    const crumbs = getBreadcrumb()

    return (
        <header className="header">
            <button className="toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
                <HiBars3 />
            </button>
            <div className="breadcrumb">
                {crumbs.map((crumb, i) => (
                    <span key={i}>
                        {i > 0 && <span className="separator"> {'>'} </span>}
                        <span className={i === crumbs.length - 1 ? 'current' : ''}>{crumb}</span>
                    </span>
                ))}
            </div>
            <div className="header-actions">
                <button title="Tìm kiếm"><HiMagnifyingGlass /></button>
                <button title="Thông báo"><HiBell /></button>
            </div>
        </header>
    )
}
