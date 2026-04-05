import { useContext, useState, useRef, useEffect } from 'react'
import { AppContext } from '../App'
import { HiXMark, HiPaperAirplane, HiSparkles } from 'react-icons/hi2'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import mermaid from 'mermaid'
import ReactECharts from 'echarts-for-react'

const INITIAL_MESSAGES = [
    { role: 'bot', text: 'Xin chào! Bạn có thắc mắc hay câu hỏi nào cần giải đáp không?' },
]

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function ChatPanel() {
    const { chatOpen, setChatOpen } = useContext(AppContext)
    const [messages, setMessages] = useState(INITIAL_MESSAGES)
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef(null)

    useEffect(() => {
        mermaid.initialize({ startOnLoad: false, theme: 'default' })
    }, [])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        // Tự động render lại các biểu đồ mermaid mới
        mermaid.contentLoaded()
    }, [messages])

    const callGeminiChat = async (userText) => {
        setIsTyping(true)
        try {
            const context = "Học máy (Machine Learning) - Bài 1: Giới thiệu và Bài 2: Hồi quy tuyến tính."

            // Format messages for API
            const apiMessages = [...messages, { role: 'user', text: userText }].map(m => ({
                role: m.role,
                content: m.text
            }))

            const res = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: apiMessages, context })
            })

            if (!res.ok) throw new Error('Network error')

            const data = await res.json()
            if (data.error) throw new Error(data.error)

            setMessages(prev => [...prev, { role: 'bot', text: data.text }])
        } catch (error) {
            console.error(error)
            setMessages(prev => [...prev, { role: 'bot', text: '⚠️ Xin lỗi, mình đang gặp sự cố kết nối với hệ thống AI. Vui lòng thử lại sau nhé!' }])
        } finally {
            setIsTyping(false)
        }
    }

    const handleSend = () => {
        if (!input.trim() || isTyping) return

        const userText = input
        const userMsg = { role: 'user', text: userText }
        setMessages(prev => [...prev, userMsg])
        setInput('')

        callGeminiChat(userText)
    }

    const handleQuickAction = (text) => {
        if (isTyping) return

        const userMsg = { role: 'user', text }
        setMessages(prev => [...prev, userMsg])

        callGeminiChat(text)
    }

    return (
        <div className={`chat-panel ${chatOpen ? 'open' : ''}`}>
            <div className="chat-header">
                <h3><HiSparkles /> Trợ lý AI — Tutor Chat</h3>
                <button className="close-btn" onClick={() => setChatOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <HiXMark />
                </button>
            </div>

            <div className="chat-quick-actions">
                <button onClick={() => handleQuickAction('Giải thích Machine Learning')}>💡 Machine Learning</button>
                <button onClick={() => handleQuickAction('Giải thích hồi quy')}>📐 Hồi quy</button>
                <button onClick={() => handleQuickAction('Quiz nhanh cho mình')}>🎯 Quiz nhanh</button>
            </div>

            <div className="chat-messages">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`chat-message ${msg.role}`}>
                        {msg.role === 'user' ? (
                            msg.text.split('\n').map((line, i) => (
                                <span key={i}>{line}{i < msg.text.split('\n').length - 1 && <br />}</span>
                            ))
                        ) : (
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    code({ node, inline, className, children, ...props }) {
                                        const match = /language-(\w+)/.exec(className || '')
                                        const codeContent = String(children).replace(/\n$/, '')

                                        if (!inline && match && match[1] === 'mermaid') {
                                            return (
                                                <div className="mermaid-wrapper" style={{ background: 'white', padding: 10, borderRadius: 8, margin: '10px 0', overflowX: 'auto', border: '1px solid #eee' }}>
                                                    <div className="mermaid">{codeContent}</div>
                                                </div>
                                            )
                                        }
                                        if (!inline && match && match[1] === 'echarts') {
                                            try {
                                                const options = JSON.parse(codeContent)
                                                return (
                                                    <div className="echarts-wrapper" style={{ background: 'white', padding: 10, borderRadius: 8, margin: '10px 0', border: '1px solid #eee' }}>
                                                        <ReactECharts option={options} style={{ height: '300px', width: '100%' }} />
                                                    </div>
                                                )
                                            } catch (e) {
                                                return <div className="error-msg" style={{ color: 'red' }}>⚠️ Lỗi render biểu đồ ECharts: {e.message}</div>
                                            }
                                        }
                                        return <code className={className} {...props}>{children}</code>
                                    }
                                }}
                            >
                                {msg.text}
                            </ReactMarkdown>
                        )}
                    </div>
                ))}
                {isTyping && (
                    <div className="chat-message bot" style={{ color: 'var(--text-light)' }}>
                        Đang suy nghĩ... 💭
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
                <input
                    type="text"
                    placeholder="Hỏi bất cứ điều gì..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <button onClick={handleSend}><HiPaperAirplane /></button>
            </div>
        </div>
    )
}
