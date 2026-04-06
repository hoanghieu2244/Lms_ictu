import { useContext, useState, useRef, useEffect, useCallback } from 'react'
import { AppContext } from '../App'
import { useLocation } from 'react-router-dom'
import { HiXMark, HiPaperAirplane, HiSparkles, HiPaperClip, HiDocumentText, HiClipboard, HiCheck } from 'react-icons/hi2'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import mermaid from 'mermaid'
import ReactECharts from 'echarts-for-react'

const INITIAL_MESSAGES = [
    { role: 'bot', text: 'Xin chào! Mình là **Gia sư AI** 🎓\n\nBạn có thể:\n- 💡 **Hỏi kiến thức** bất kỳ\n- 📝 **Gửi bài làm** (paste code hoặc đính kèm file .docx/.txt) để được **chấm điểm**\n- 🔍 **Nhờ phân tích** lỗi code\n\n> Hãy bắt đầu bằng một câu hỏi nhé! 🚀' },
]

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Code block with copy button
function CodeBlock({ className, children }) {
    const [copied, setCopied] = useState(false)
    const codeContent = String(children).replace(/\n$/, '')
    const match = /language-(\w+)/.exec(className || '')
    const lang = match ? match[1] : ''

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(codeContent).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }, [codeContent])

    return (
        <div className="chat-code-block">
            <div className="chat-code-header">
                <span className="chat-code-lang">{lang || 'code'}</span>
                <button className="chat-code-copy" onClick={handleCopy} title="Sao chép">
                    {copied ? <><HiCheck /> Copied</> : <><HiClipboard /> Copy</>}
                </button>
            </div>
            <pre><code className={className}>{codeContent}</code></pre>
        </div>
    )
}

export default function ChatPanel() {
    const { chatOpen, setChatOpen, courses, lessons } = useContext(AppContext)
    const location = useLocation()
    const [messages, setMessages] = useState(INITIAL_MESSAGES)
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [attachedFile, setAttachedFile] = useState(null)
    const [panelWidth, setPanelWidth] = useState(420) // New state for dynamic width

    const messagesEndRef = useRef(null)
    const fileInputRef = useRef(null)
    const textareaRef = useRef(null)

    // Handle dragged resizing of chat panel
    const handleMouseDown = useCallback((e) => {
        e.preventDefault()
        const startX = e.clientX
        const startWidth = panelWidth

        const doDrag = (dragEvent) => {
            const newWidth = startWidth - (dragEvent.clientX - startX)
            if (newWidth >= 320 && newWidth <= 800) {
                setPanelWidth(newWidth)
            }
        }

        const stopDrag = () => {
            document.removeEventListener('mousemove', doDrag)
            document.removeEventListener('mouseup', stopDrag)
            document.body.style.userSelect = 'auto' // Restore text selection
        }

        document.body.style.userSelect = 'none' // Prevent text selection during drag
        document.addEventListener('mousemove', doDrag)
        document.addEventListener('mouseup', stopDrag)
    }, [panelWidth])

    useEffect(() => {
        mermaid.initialize({ startOnLoad: false, theme: 'default' })
    }, [])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        mermaid.contentLoaded()
    }, [messages])

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
        }
    }, [input])

    const callGeminiChat = async (userText, file = null) => {
        setIsTyping(true)
        try {
            // Xác định ngữ cảnh thông minh dựa trên URL hiện tại
            let context = "Bạn là Gia sư AI trên hệ thống LMS ICTU. Hãy trợ giúp sinh viên giải đáp thắc mắc liên quan tới học tập một cách thân thiện và chính xác."
            
            const match = location.pathname.match(/\/dashboard\/classes\/learning\/(\d+)/)
            if (match) {
                const courseId = match[1]
                const course = courses?.find(c => String(c.id) === courseId)
                const courseLessons = lessons?.[courseId]

                if (course && courseLessons) {
                    const lessonNames = courseLessons.lessons
                        .filter(l => l.type !== 'info' && l.type !== 'exam')
                        .map(l => l.name)
                        .join(", ")
                    context = `Bạn là Gia sư AI hỗ trợ môn "${course.name}". Nội dung môn học gồm các bài: ${lessonNames}. Hãy bám sát kiến thức môn này để trả lời sinh viên.`
                }
            }

            // Format messages for API
            const apiMessages = [...messages, { role: 'user', text: userText }].map(m => ({
                role: m.role,
                content: m.text
            }))

            let data

            if (file) {
                const formData = new FormData()
                formData.append('file', file)
                formData.append('data', JSON.stringify({ messages: apiMessages, context }))

                const res = await fetch(`${API_URL}/api/chat-upload`, {
                    method: 'POST',
                    body: formData
                })

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}))
                    throw new Error(errData.error || 'Lỗi upload file')
                }
                data = await res.json()
            } else {
                const res = await fetch(`${API_URL}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages: apiMessages, context })
                })

                if (!res.ok) throw new Error('Network error')
                data = await res.json()
            }

            if (data.error) throw new Error(data.error)
            setMessages(prev => [...prev, { role: 'bot', text: data.text }])
        } catch (error) {
            console.error(error)
            setMessages(prev => [...prev, { role: 'bot', text: `⚠️ ${error.message || 'Xin lỗi, mình đang gặp sự cố kết nối. Vui lòng thử lại sau nhé!'}` }])
        } finally {
            setIsTyping(false)
        }
    }

    const handleSend = () => {
        if ((!input.trim() && !attachedFile) || isTyping) return

        const userText = input.trim() || (attachedFile ? `📎 Chấm bài file: ${attachedFile.name}` : '')
        const fileToSend = attachedFile

        let displayText = userText
        if (fileToSend) {
            displayText = `${userText}\n\n📎 Đính kèm: ${fileToSend.name}`
        }
        setMessages(prev => [...prev, { role: 'user', text: displayText }])
        setInput('')
        setAttachedFile(null)

        callGeminiChat(userText, fileToSend)
    }

    const handleQuickAction = (text) => {
        if (isTyping) return
        setMessages(prev => [...prev, { role: 'user', text }])
        callGeminiChat(text)
    }

    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        if (!file) return

        const allowedExts = ['.docx', '.txt', '.doc', '.png', '.jpg', '.jpeg', '.webp']
        const ext = '.' + file.name.split('.').pop().toLowerCase()

        if (!allowedExts.includes(ext)) {
            alert('Chỉ hỗ trợ file .docx, .txt và hình ảnh (png/jpg/webp)')
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('File quá lớn (tối đa 10MB)')
            return
        }

        setAttachedFile(file)
        textareaRef.current?.focus()
        e.target.value = ''
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handlePaste = (e) => {
        const items = e.clipboardData?.items
        if (!items) return

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile()
                if (blob) {
                    // Đổi tên file cho đẹp
                    const processTime = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(/:/g, '')
                    const file = new File([blob], `Ảnh_chụp_màn_hình_${processTime}.png`, { type: blob.type })
                    
                    if (file.size > 10 * 1024 * 1024) {
                        alert('Ảnh quá lớn (tối đa 10MB)')
                        return
                    }
                    
                    setAttachedFile(file)
                    e.preventDefault()
                    break
                }
            }
        }
    }

    const markdownComponents = {
        code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const codeContent = String(children).replace(/\n$/, '')

            if (!inline && match && match[1] === 'mermaid') {
                return (
                    <div className="mermaid-wrapper">
                        <div className="mermaid">{codeContent}</div>
                    </div>
                )
            }
            if (!inline && match && match[1] === 'echarts') {
                try {
                    const options = JSON.parse(codeContent)
                    return (
                        <div className="echarts-wrapper">
                            <ReactECharts option={options} style={{ height: '260px', width: '100%' }} />
                        </div>
                    )
                } catch (e) {
                    return <div className="chat-error-inline">⚠️ Lỗi biểu đồ: {e.message}</div>
                }
            }
            // Multi-line code block
            if (!inline && (match || codeContent.includes('\n'))) {
                return <CodeBlock className={className}>{children}</CodeBlock>
            }
            // Inline code
            return <code className="chat-inline-code" {...props}>{children}</code>
        },
        // Better table rendering
        table({ children }) {
            return (
                <div className="chat-table-wrap">
                    <table>{children}</table>
                </div>
            )
        },
        // Blockquote styling
        blockquote({ children }) {
            return <blockquote className="chat-blockquote">{children}</blockquote>
        },
        // Links open in new tab
        a({ href, children }) {
            return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
        }
    }

    return (
        <div className={`chat-panel ${chatOpen ? 'open' : ''}`} style={{ width: panelWidth }}>
            <div className="chat-resizer" onMouseDown={handleMouseDown} title="Kéo để thay đổi kích thước" />
            
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
                <button onClick={() => fileInputRef.current?.click()} className="chat-quick-grade">📝 Chấm bài</button>
            </div>

            <div className="chat-messages">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`chat-msg-row ${msg.role}`}>
                        {msg.role === 'bot' && (
                            <div className="chat-avatar bot-avatar">
                                <HiSparkles />
                            </div>
                        )}
                        <div className={`chat-message ${msg.role}`}>
                            {msg.role === 'user' ? (
                                msg.text.split('\n').map((line, i) => (
                                    <span key={i}>{line}{i < msg.text.split('\n').length - 1 && <br />}</span>
                                ))
                            ) : (
                                <div className="chat-bot-content">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={markdownComponents}
                                    >
                                        {msg.text}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="chat-msg-row bot">
                        <div className="chat-avatar bot-avatar">
                            <HiSparkles />
                        </div>
                        <div className="chat-message bot">
                            <div className="chat-typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* File attachment preview */}
            {attachedFile && (
                <div className="chat-file-preview">
                    {attachedFile.type.startsWith('image/') ? (
                        <img 
                            src={URL.createObjectURL(attachedFile)} 
                            alt="preview" 
                            style={{ height: '32px', width: '32px', objectFit: 'cover', borderRadius: '4px', marginRight: '8px' }} 
                        />
                    ) : (
                        <HiDocumentText />
                    )}
                    <span className="chat-file-name">{attachedFile.name}</span>
                    <button className="chat-file-remove" onClick={() => setAttachedFile(null)}>✕</button>
                </div>
            )}

            <div className="chat-input-area">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,.txt,.doc,image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                />

                <button
                    className="chat-attach-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title="Đính kèm file, ảnh, code"
                >
                    <HiPaperClip />
                </button>

                <textarea
                    ref={textareaRef}
                    placeholder={attachedFile ? 'Nhập lời nhắn kèm file (VD: "Chấm bài này cho em")...' : 'Hỏi hoặc Ctrl+V dán ảnh vào đây...'}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    rows={1}
                />
                <button className="chat-send-btn" onClick={handleSend} disabled={isTyping}><HiPaperAirplane /></button>
            </div>
        </div>
    )
}
