import { Outlet, useLocation } from 'react-router-dom'
import { useContext } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import ChatPanel from './ChatPanel'
import { AppContext } from '../App'
import { HiChatBubbleLeftRight } from 'react-icons/hi2'

export default function Layout() {
    const { sidebarCollapsed, chatOpen, setChatOpen } = useContext(AppContext)

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Header />
                <div className="page-content">
                    <Outlet />
                </div>
            </div>
            <ChatPanel />
            {!chatOpen && (
                <button className="chat-fab" onClick={() => setChatOpen(true)} title="Trợ lý AI">
                    <HiChatBubbleLeftRight />
                </button>
            )}
        </div>
    )
}
