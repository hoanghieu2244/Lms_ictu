import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { handleTutorChat, extractTextFromFile } from '../agents/tutorChatAgent.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const router = Router()

const UPLOADS_DIR = join(__dirname, '..', 'uploads')
const TEMP_DIR = join(UPLOADS_DIR, '_temp')
fs.mkdirSync(TEMP_DIR, { recursive: true })

// Multer cho chat upload (docx, txt, images)
const chatUploadStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, TEMP_DIR),
    filename: (req, file, cb) => {
        const utf8Name = Buffer.from(file.originalname, 'latin1').toString('utf8')
        const safeName = utf8Name.replace(/[^a-zA-Z0-9.\-_\u00C0-\u024F\u1E00-\u1EFF]/g, '_')
        cb(null, `chat_${Date.now()}_${safeName}`)
    }
})
const chatUpload = multer({
    storage: chatUploadStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max cho chat
    fileFilter: (req, file, cb) => {
        const allowed = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'text/plain', // .txt
            'application/msword', // .doc
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/webp'
        ]
        if (allowed.includes(file.mimetype) || file.originalname.endsWith('.txt')) {
            cb(null, true)
        } else {
            cb(new Error('Chat chỉ hỗ trợ file .docx, .txt và hình ảnh (png/jpg/webp)'))
        }
    }
})

// API: Tutor Chat (text only)
router.post('/chat', async (req, res) => {
    try {
        const { messages, context } = req.body
        const text = await handleTutorChat({ messages, context })
        res.json({ text })
    } catch (err) {
        console.error('❌ Lỗi Tutor Chat:', err)
        res.status(500).json({ error: 'Không thể xử lý yêu cầu chat lúc này' })
    }
})

// API: Tutor Chat (Streaming with SSE)
router.post('/chat-stream', async (req, res) => {
    try {
        const { messages, context } = req.body
        
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        
        const stream = await handleTutorChat({ messages, context, stream: true })
        
        const handleLine = (line) => {
            const cleaned = line.trim()
            if (!cleaned) return
            
            if (cleaned.startsWith('data: ')) {
                const dataStr = cleaned.slice(6)
                if (dataStr === '[DONE]') {
                    res.write('data: [DONE]\n\n')
                    return
                }
                try {
                    const json = JSON.parse(dataStr)
                    const content = json.choices?.[0]?.delta?.content || ''
                    if (content) {
                        res.write(`data: ${JSON.stringify({ content })}\n\n`)
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        }

        const decoder = new TextDecoder()
        let buffer = ''

        if (stream && typeof stream.getReader === 'function') {
            const reader = stream.getReader()
            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop()
                
                for (const line of lines) {
                    handleLine(line)
                }
            }
        } else if (stream) {
            // Async iterator fallback
            for await (const chunk of stream) {
                buffer += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop()
                
                for (const line of lines) {
                    handleLine(line)
                }
            }
        }
        res.end()
    } catch (err) {
        console.error('❌ Lỗi Tutor Chat Stream:', err)
        res.write(`data: ${JSON.stringify({ error: 'Không thể xử lý yêu cầu chat stream lúc này' })}\n\n`)
        res.end()
    }
})

// API: Tutor Chat + File Upload (docx/txt/img)
router.post('/chat-upload', chatUpload.single('file'), async (req, res) => {
    try {
        let messages = []
        let context = ''
        if (req.body.data) {
            try {
                const parsed = JSON.parse(req.body.data)
                messages = parsed.messages || []
                context = parsed.context || ''
            } catch (e) {
                console.error('Lỗi parse req.body.data:', e.message)
            }
        } else {
            context = req.body.context || ''
            const msgText = req.body.message || ''
            if (msgText) {
                messages = [{ role: 'user', content: msgText }]
            }
        }
        let fileText = null
        let fileName = null
        let imageBase64 = null

        if (req.file) {
            fileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8')
            console.log(`📎 [Chat Upload] Đọc file: ${fileName}`)

            if (req.file.mimetype.startsWith('image/')) {
                const b64 = fs.readFileSync(req.file.path).toString('base64');
                imageBase64 = `data:${req.file.mimetype};base64,${b64}`;
            } else {
                fileText = await extractTextFromFile(req.file.path, req.file.mimetype, fileName)
                
                if (!fileText || !fileText.trim()) {
                    try { fs.unlinkSync(req.file.path) } catch (e) { }
                    return res.status(400).json({ error: 'Không thể đọc nội dung file text. Hãy thử file .docx hoặc .txt khác.' })
                }
                console.log(`✅ Đã trích xuất ${fileText.length} ký tự từ file text`)
            }

            // Cleanup temp file
            try { fs.unlinkSync(req.file.path) } catch (e) { }
        }

        const text = await handleTutorChat({ messages, context, fileText, fileName, imageBase64 })
        res.json({ text })
    } catch (err) {
        // Cleanup temp file on error
        if (req.file) try { fs.unlinkSync(req.file.path) } catch (e) { }
        console.error('❌ Lỗi Chat Upload:', err)
        res.status(500).json({ error: err.message || 'Không thể xử lý yêu cầu' })
    }
})

export default router

