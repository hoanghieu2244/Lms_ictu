import express from 'express'
import cors from 'cors'
import nodemailer from 'nodemailer'
import multer from 'multer'
import fs from 'fs'
import dotenv from 'dotenv'
import mammoth from 'mammoth'
import { GoogleGenAI } from '@google/genai'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { initVectorDB, processDocument, searchKnowledgeBase, getDocumentTextByLesson } from './ragService.js'

const AVAILABLE_MODELS = [
    { id: 'openai/gpt-4o', name: 'GPT-4o', desc: '🧠 Suy luận mạnh nhất', speed: 'Nhanh', quality: 'Rất tốt' }
]

// Model riêng cho Tutor Chat
const TUTOR_CHAT_MODEL = 'openai/gpt-4o'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '.env') })

const app = express()
app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(join(__dirname, 'uploads')))

// Khởi tạo RAG Vector DB (Hỗ trợ MongoDB Atlas hoặc Local JSON)
await initVectorDB()

// ============================================
// FILE UPLOAD SETUP (Multer)
// ============================================
const UPLOADS_DIR = join(__dirname, 'uploads')
const METADATA_FILE = join(UPLOADS_DIR, 'metadata.json')
const QUIZ_HISTORY_FILE = join(__dirname, 'quiz-history.json')
const ASSIGNMENTS_FILE = join(__dirname, 'assignments.json')
const MAX_FILE_SIZE = 200 * 1024 * 1024 // 200MB

// Ensure uploads dir exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

// Ensure metadata file exists
if (!fs.existsSync(METADATA_FILE)) {
    fs.writeFileSync(METADATA_FILE, JSON.stringify([], null, 2))
}

// Ensure quiz history file exists
if (!fs.existsSync(QUIZ_HISTORY_FILE)) {
    fs.writeFileSync(QUIZ_HISTORY_FILE, JSON.stringify([], null, 2))
}

// Ensure assignments file exists
if (!fs.existsSync(ASSIGNMENTS_FILE)) {
    fs.writeFileSync(ASSIGNMENTS_FILE, JSON.stringify([], null, 2))
}

const TEMP_DIR = join(UPLOADS_DIR, '_temp')
fs.mkdirSync(TEMP_DIR, { recursive: true })

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, TEMP_DIR)
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now()
        // Multer decodes originalname as latin1 in some express versions, we decode it back to utf8
        const utf8Name = Buffer.from(file.originalname, 'latin1').toString('utf8')
        // Safe filename: allow basic ascii + basic unicode word chars
        const safeName = utf8Name.replace(/[^a-zA-Z0-9.\-_\u00C0-\u024F\u1E00-\u1EFF]/g, '_')
        cb(null, `${timestamp}_${safeName}`)
    }
})

const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/msword',
        ]
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true)
        } else {
            cb(new Error('Chỉ hỗ trợ file PDF, Word (.doc/.docx), PowerPoint (.ppt/.pptx)'))
        }
    }
})

// AI Setup
const ai = {
    models: {
        generateContent: async ({ model, contents, config }) => {
            const messages = [];
            if (config?.systemInstruction) {
                messages.push({ role: 'system', content: config.systemInstruction });
            }
            messages.push({ role: 'user', content: contents });

            const body = {
                model: model,
                messages: messages,
                temperature: config?.temperature || 0.7,
            };
            
            if (config?.responseMimeType === 'application/json') {
                body.response_format = { type: 'json_object' };
            }

            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (!res.ok) {
                console.error('❌ OpenRouter API Error:', JSON.stringify(data, null, 2));
                throw new Error(data.error?.message || 'OpenRouter Error');
            }
            return { text: data.choices[0].message.content };
        }
    },
    chats: {
        create: ({ model, config, history }) => {
            let messages = [];
            if (config?.systemInstruction) {
                messages.push({ role: 'system', content: config.systemInstruction });
            }
            if (history) {
                history.forEach(h => {
                    const role = h.role === 'model' ? 'assistant' : h.role;
                    messages.push({ role, content: h.parts[0].text });
                });
            }
            return {
                sendMessage: async ({ message }) => {
                    const currentMessages = [...messages, { role: 'user', content: message }];
                    messages = currentMessages; // update history
                    const body = {
                        model: model,
                        messages: currentMessages,
                        temperature: config?.temperature || 0.7,
                    };
                    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(body)
                    });
                    const data = await res.json();
                    if (!res.ok) {
                        console.error('❌ OpenRouter Chat Error:', JSON.stringify(data, null, 2));
                        throw new Error(data.error?.message || 'OpenRouter Error');
                    }
                    messages.push({ role: 'assistant', content: data.choices[0].message.content });
                    return { text: data.choices[0].message.content };
                }
            };
        }
    }
};
let currentModel = process.env.AI_MODEL || 'openai/gpt-4o'
console.log(`🤖 AI Model mặc định: ${currentModel}`)

// Lưu OTP tạm thời (production nên dùng Redis)
const otpStore = new Map()

// ============================================
// AI MODEL SELECTION API
// ============================================
app.get('/api/ai-models', (req, res) => {
    res.json({ models: AVAILABLE_MODELS, current: currentModel })
})

app.get('/api/ai-model', (req, res) => {
    res.json({ model: currentModel })
})

app.post('/api/ai-model', (req, res) => {
    const { model } = req.body
    const found = AVAILABLE_MODELS.find(m => m.id === model)
    if (!found) {
        return res.status(400).json({ error: `Model "${model}" không hợp lệ` })
    }
    currentModel = model
    console.log(`🔄 Đã đổi AI Model → ${currentModel}`)
    res.json({ success: true, model: currentModel, name: found.name })
})

// Tạo transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
})

// Kiểm tra kết nối SMTP khi khởi động
transporter.verify()
    .then(() => console.log('✅ SMTP kết nối thành công'))
    .catch(err => console.log('⚠️  SMTP chưa cấu hình:', err.message, '\n   → Sửa file server/.env với Gmail + App Password'))

// API: Gửi OTP
app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body

    if (!email) {
        return res.status(400).json({ error: 'Email là bắt buộc' })
    }

    if (!email.endsWith('@ictu.edu.vn') && !email.endsWith('@ms.ictu.edu.vn')) {
        return res.status(400).json({ error: 'Chỉ chấp nhận email @ictu.edu.vn hoặc @ms.ictu.edu.vn' })
    }

    // Tạo mã OTP 6 số
    const otp = String(Math.floor(100000 + Math.random() * 900000))

    // Lưu OTP (hết hạn sau 5 phút)
    otpStore.set(email, { code: otp, expiresAt: Date.now() + 5 * 60 * 1000 })

    // Gửi email
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"LMS ICTU" <${process.env.SMTP_USER}>`,
            to: email,
            subject: '🔐 Mã xác thực đăng nhập LMS ICTU',
            html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 0;">
          <div style="background: linear-gradient(135deg, #3c8dbc, #2c6fa0); padding: 28px 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">🎓 LMS ICTU</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 13px;">Hệ thống quản lý học tập trực tuyến</p>
          </div>
          <div style="background: #ffffff; padding: 28px 24px; border: 1px solid #e8e8e8; border-top: none;">
            <p style="font-size: 15px; color: #333; margin: 0 0 8px;">Xin chào,</p>
            <p style="font-size: 14px; color: #666; margin: 0 0 20px; line-height: 1.6;">
              Bạn vừa yêu cầu đăng nhập vào hệ thống LMS ICTU. Dưới đây là mã xác thực của bạn:
            </p>
            <div style="background: #f0f7ff; border: 2px solid #3c8dbc; border-radius: 10px; padding: 20px; text-align: center; margin: 0 0 20px;">
              <p style="font-size: 12px; color: #999; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Mã xác thực</p>
              <div style="font-size: 36px; font-weight: 700; color: #3c8dbc; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</div>
            </div>
            <p style="font-size: 13px; color: #999; margin: 0 0 4px;">⏱ Mã có hiệu lực trong <strong>5 phút</strong></p>
            <p style="font-size: 13px; color: #999; margin: 0;">🔒 Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
          </div>
          <div style="padding: 16px 24px; text-align: center; background: #f8f9fa; border-radius: 0 0 12px 12px; border: 1px solid #e8e8e8; border-top: none;">
            <p style="font-size: 11px; color: #aaa; margin: 0;">© 2025 LMS ICTU — AI Learning Assistant</p>
          </div>
        </div>
      `,
        })

        console.log(`📧 OTP sent to ${email}: ${otp}`)
        res.json({ success: true, message: 'Mã xác thực đã gửi đến email' })
    } catch (err) {
        console.error('❌ Gửi email thất bại:', err.message)

        // Fallback: Trả OTP trực tiếp nếu SMTP chưa cấu hình
        console.log(`⚠️  Fallback — OTP cho ${email}: ${otp}`)
        res.json({
            success: true,
            message: 'Mã xác thực đã gửi đến email',
            // Chỉ trả OTP khi SMTP lỗi (development only)
            _devOtp: otp,
            _devNote: 'SMTP chưa cấu hình. Cấu hình trong server/.env để gửi email thật.'
        })
    }
})

// API: Xác thực OTP
app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email và OTP là bắt buộc' })
    }

    const stored = otpStore.get(email)

    if (!stored) {
        return res.status(400).json({ error: 'Mã xác thực không tồn tại hoặc đã hết hạn', valid: false })
    }

    if (Date.now() > stored.expiresAt) {
        otpStore.delete(email)
        return res.status(400).json({ error: 'Mã xác thực đã hết hạn (5 phút)', valid: false })
    }

    if (stored.code !== otp) {
        return res.status(400).json({ error: 'Mã xác thực không đúng', valid: false })
    }

    // OTP hợp lệ → xóa khỏi store
    otpStore.delete(email)

    res.json({
        valid: true,
        user: {
            email,
            name: email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            id: 'DTC' + String(Math.floor(100000000 + Math.random() * 900000000)).slice(0, 9),
        }
    })
})

// ============================================
// FILE UPLOAD APIS
// ============================================

// API: Upload files
app.post('/api/upload', (req, res) => {
    upload.array('files', 10)(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: `File quá lớn! Tối đa ${MAX_FILE_SIZE / 1024 / 1024}MB` })
            }
            return res.status(400).json({ error: err.message })
        }
        if (err) {
            return res.status(400).json({ error: err.message })
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Chưa chọn file nào' })
        }

        const { courseId, courseName, lessonId, lessonName } = req.body

        // Move files from temp to proper directory
        const cid = courseId || 'unknown'
        const lid = lessonId || 'general'
        const targetDir = join(UPLOADS_DIR, cid, lid)
        fs.mkdirSync(targetDir, { recursive: true })

        for (const f of req.files) {
            const newPath = join(targetDir, f.filename)
            fs.renameSync(f.path, newPath)
            f.path = newPath
        }

        // Read existing metadata
        let metadata = []
        try {
            metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'))
        } catch (e) {
            metadata = []
        }

        // Add new files to metadata
        const newEntries = req.files.map(f => ({
            id: Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            originalName: f.originalname,
            storedName: f.filename,
            size: f.size,
            mimetype: f.mimetype,
            courseId: cid,
            courseName: courseName || '',
            lessonId: lid,
            lessonName: lessonName || '',
            path: f.path,
            downloadUrl: `/uploads/${cid}/${lid}/${f.filename}`,
            uploadedAt: new Date().toISOString(),
        }))

        metadata.push(...newEntries)
        fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2))

        console.log(`📁 Uploaded ${req.files.length} file(s) to course ${courseId}/${lessonId}`)

        // Xóa cache cũ để AI tạo lại text/mindmap dựa trên file thật này
        clearCache(cid, lid)

        // Nạp file upload vào RAG Vector DB + Auto Pre-generate Immersive Text
        for (const f of req.files) {
            try {
                // Background process: extract & embed text, bind to courseId and lessonId
                processDocument(f.path, f.originalname, f.mimetype, cid, lid).then(async (chunks) => {
                    console.log(`✅ File ${f.originalname} đã được Vector hóa thành công (${chunks} chunks).`)
                    // Auto pre-generate immersive text ngay sau khi vectorize xong
                    const lessonTitle = req.body.lessonName || f.originalname.replace(/\.[^.]+$/, '')
                    await generateAndCacheImmersiveText(cid, lid, lessonTitle)
                }).catch(err => {
                    console.error(`❌ Lỗi AI xử lý file ${f.originalname}:`, err.message)
                })
            } catch (e) { }
        }

        res.json({
            success: true,
            message: `Đã upload ${req.files.length} file thành công. AI đang đọc tài liệu của bạn...`,
            files: newEntries,
        })
    })
})

// API: List uploaded files
app.get('/api/uploads', (req, res) => {
    try {
        let metadata = []
        try {
            metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'))
        } catch (e) {
            metadata = []
        }

        const { courseId, lessonId } = req.query

        let filtered = metadata
        if (courseId) {
            filtered = filtered.filter(f => f.courseId === courseId)
        }
        if (lessonId) {
            filtered = filtered.filter(f => f.lessonId === lessonId)
        }

        res.json(filtered)
    } catch (err) {
        console.error('❌ Lỗi đọc metadata:', err)
        res.status(500).json({ error: 'Không thể đọc danh sách file' })
    }
})

// ============================================
// AI AGENT APIS (GPT-4o)
// ============================================

// ============================================
// TUTOR CHAT + AI GRADING (Tích hợp)
// Flash cho chat thường, Pro cho chấm bài
// ============================================

// Multer cho chat upload (docx, txt)
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

// Hàm trích xuất text từ file upload
async function extractTextFromFile(filePath, mimetype, originalname) {
    try {
        if (mimetype === 'text/plain' || originalname?.endsWith('.txt')) {
            return fs.readFileSync(filePath, 'utf-8')
        }
        if (mimetype?.includes('word') || originalname?.endsWith('.docx')) {
            const result = await mammoth.extractRawText({ path: filePath })
            return result.value
        }
        return null
    } catch (e) {
        console.error('Lỗi đọc file:', e.message)
        return null
    }
}

// Hàm xử lý chat logic chung (dùng cho cả /api/chat và /api/chat-upload)
async function handleTutorChat({ messages, context, fileText, fileName, imageBase64 }) {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY is not configured')
    }

    // Format history for OpenRouter API (OpenAI uses 'assistant', not 'model')
    const formattedHistory = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        parts: [{ text: m.content }]
    }))

    // Extract the latest message and history
    let latestMessage = "Xin chào"
    let history = []
    if (formattedHistory.length > 0) {
        const lastMsg = formattedHistory.pop()
        latestMessage = lastMsg.parts[0].text
        history = formattedHistory
    }

    let messageContent = latestMessage

    // Nếu có file đính kèm, gắn nội dung file vào message
    if (fileText) {
        messageContent = `${latestMessage}\n\n📎 NỘI DUNG FILE "${fileName}":\n\`\`\`\n${fileText.substring(0, 30000)}\n\`\`\``
    } else if (imageBase64) {
        messageContent = [
            { type: "text", text: latestMessage + `\n\n📎 Đính kèm hình ảnh: ${fileName}` },
            { type: "image_url", image_url: { url: imageBase64 } }
        ];
    }

    // --- ROUTE-BASED RAG: Phân loại ý định (Intent Classification) ---
    const routePrompt = `Phân loại ý định của câu nói sau đây thành 1 trong 3 loại:
1. "SEARCH": Câu hỏi về kiến thức, học tập, cần tra cứu tài liệu bài giảng. (Ví dụ: Định nghĩa X là gì? Vì sao Y lại thế? Giải thích bài 2)
2. "GRADE": Yêu cầu chấm bài, đánh giá code, nhận xét bài làm, review code, chấm điểm. (Ví dụ: chấm bài này, đánh giá code, review bài làm, cho điểm, chấm điểm bài tập)
3. "CHAT": Câu giao tiếp thông thường, chào hỏi, cảm ơn, tán gẫu. (Ví dụ: Chào bạn, bạn tên gì)

Trả về CHỈ một từ "SEARCH", "GRADE" hoặc "CHAT". KHÔNG giải thích thêm.
Câu nói: "${latestMessage.substring(0, 500)}"`

    let intent = 'SEARCH' // Default fallback
    try {
        const routeRes = await ai.models.generateContent({
            model: TUTOR_CHAT_MODEL,
            contents: routePrompt,
            config: { temperature: 0.1 }
        })
        const intentText = routeRes.text?.trim().toUpperCase() || ''
        if (intentText.includes('GRADE')) intent = 'GRADE'
        else if (intentText.includes('CHAT')) intent = 'CHAT'
    } catch (e) { console.error('Lỗi Router RAG:', e.message) }

    // Nếu có file đính kèm (hoặc ảnh) → mặc định coi là GRADE
    if ((fileText || imageBase64) && intent !== 'GRADE') {
        intent = 'GRADE'
        console.log('📎 [File/Image detected] Tự động chuyển intent → GRADE')
    }

    // Tìm kiếm tài liệu RAG
    let ragContext = ''
    if (intent === 'SEARCH') {
        console.log(`🔍 [Intent=SEARCH] Tìm kiếm RAG cho: "${latestMessage.substring(0, 60)}"`)
        try {
            const relevantDocs = await searchKnowledgeBase(latestMessage, 3)
            if (relevantDocs.length > 0) {
                console.log(`✅ Tìm thấy ${relevantDocs.length} đoạn kiến thức phù hợp!`)
                ragContext = '\n\nKIẾN THỨC BỔ SUNG TỪ TÀI LIỆU ĐÃ UPLOAD (KNOWLEDGE BASE):\n' +
                    relevantDocs.map((doc, i) => `[Tài liệu ${i + 1} - ${doc.filename} (Trang ${doc.page})]: ${doc.text}`).join('\n\n')
            }
        } catch (ragErr) {
            console.error('⚠️ RAG Search failed:', ragErr.message)
        }
    } else if (intent === 'CHAT') {
        console.log(`💬 [Intent=CHAT] Bỏ qua RAG cho: "${latestMessage.substring(0, 60)}"`)
    }

    // Chọn model + system prompt theo intent
    let selectedModel = TUTOR_CHAT_MODEL
    let systemMessage = ''

    if (intent === 'GRADE') {
        // === CHẾ ĐỘ CHẤM BÀI: Dùng GPT-4o (chính xác hơn) ===
        selectedModel = currentModel // GPT-4o
        console.log(`📝 [Intent=GRADE] Chấm bài — dùng model: ${selectedModel} (Pro)`)

        systemMessage = `Bạn là một Gia sư AI thân thiện của hệ thống LMS ICTU. Nhiệm vụ: CHẤM ĐIỂM bài làm của sinh viên một cách tự nhiên.

## QUY TẮC TRẢ LỜI (TUYỆT ĐỐI TUÂN THỦ):
1. Xưng hô: Tuyệt đối dùng "tôi" và gọi người dùng là "bạn". Ví dụ: "Chào bạn. Bài này bạn làm quá chuẩn luôn...", "Chào bạn, bài này bạn làm khá ổn rồi nhưng còn vài chỗ cần chú ý..."
2. BỎ NGAY lập tức các câu dập khuôn máy móc như "Giảng viên đã nhận được câu hỏi...".
3. KHÔNG ĐƯỢC LIỆT KÊ TỪNG TIÊU CHÍ CHẤM ĐIỂM DÀI DÒNG.
4. NẾU CÓ LỖI SAI (RẤT QUAN TRỌNG): Bạn BẮT BUỘC phải giải thích rõ TẠI SAO sai, SỬA LẠI như thế nào, và đặc biệt phải GỢI Ý bạn ấy đọc lại kiến thức này ở bài nào, trang nào, hoặc môn nào (dựa vào dữ liệu RAG hoặc tên bài trong định hướng môn học).
5. Cuối bài, đưa ra một số điểm trên thang 10.

## ĐỊNH DẠNG TRẢ LỜI ĐỀ XUẤT:
(Mở đoạn chào hỏi và đánh giá tổng quan tự nhiên)

**Điểm: X/10** [emoji phù hợp]

**✅ Điểm tốt:** (Khen ngợi điểm tốt nhất của bài làm trong 1-2 câu)

**⚠️ Chỗ cần sửa & Ôn tập:** (Nếu có lỗi, giải thích rõ: Vì sao sai? Sửa thế nào? Xem lại lý thuyết ở đâu?)

## LƯU Ý:
- Chấm CÔNG TÂM. Trả lời bằng tiếng Việt.
- NHẮC LẠI: Phải đưa ra được reference (chỉ điểm kiến thức) để học sinh biết đường xem lại.

Context môn học: ${context || 'Không rõ'}
${ragContext}`

    } else {
        // === CHẾ ĐỘ GIA SƯ THƯỜNG: Dùng Flash (rẻ) ===
        console.log(`🎓 [Intent=${intent}] Tutor Chat — dùng model: ${TUTOR_CHAT_MODEL} (Flash)`)

        systemMessage = `Bạn là một Gia sư AI thân thiện và tự nhiên của hệ thống LMS ICTU. Bạn đóng vai trò một người hướng dẫn học tập.

## QUY TẮC GIAO TIẾP VÀNG:
1. Xưng hô: TUYỆT ĐỐI dùng "tôi" và gọi sinh viên là "bạn" (Ví dụ: "Chào bạn, tôi có thể giúp gì cho bạn?").
   Không dùng "anh/chị - em". Không xưng "Giảng viên".
2. Bỏ các form mẫu dập khuôn mào đầu. Vào thẳng vấn đề một cách gần gũi.

## VAI TRÒ CỐT LÕI — GIA SƯ HƯỚNG DẪN:
1. **Khi hướng dẫn giải bài**: Tuyệt đối không giải thẳng đáp án. Phân tích đề bài, vạch ra các bước (Step 1, Step 2...).
2. **KHI SINH VIÊN LÀM SAI (QUAN TRỌNG NHẤT)**: Bạn BẮT BUỘC phải làm đủ 3 việc sau:
   - Giải thích TẠI SAO sai.
   - Hướng dẫn CÁCH SỬA lại cho đúng.
   - CHỈ ĐIỂM LIÊN KẾT (Reference): Dặn dò đọc lại kiến thức này ở bìa nào, trang nào, chương mấy (Dựa trên nội dung môn học và RAG có sẵn). Ví dụ: "Phần này bạn có thể đọc lại Slide Bài 3 của môn X nhé."
   
3. **Khi hỏi kiến thức lý thuyết**: Giải thích dễ hiểu, đời thường, đưa ra ví dụ thực tế.

## PHONG CÁCH:
- Sư phạm, thân thiện, dùng emoji nhưng đừng lạm dụng.
- Ưu tiên dùng [Kiến thức bổ sung từ tài liệu] để trích dẫn nguồn cho sinh viên tiện tra cứu.
- Hãy khép lại bằng một lời nhắn tạo động lực: "Bạn thử sửa lại rồi gửi tôi xem nha!"

## KỸ NĂNG VẼ BIỂU ĐỒ:
- Flowchart, Mindmap, Sequence → dùng \`\`\`mermaid
- Biểu đồ Dữ liệu (Tròn, Cột, Line) → dùng \`\`\`echarts với JSON đúng chuẩn

---

Context môn học hiện tại: ${context || 'Không có dữ liệu ngữ cảnh cụ thể'}
${ragContext}`
    }

    const chat = ai.chats.create({
        model: selectedModel,
        config: {
            systemInstruction: systemMessage,
            temperature: intent === 'GRADE' ? 0.2 : 0.7,
        },
        history: history.length > 0 ? history : undefined,
    })

    const response = await chat.sendMessage({
        message: messageContent
    })

    return response.text
}

// API: Tutor Chat (text only)
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, context } = req.body
        const text = await handleTutorChat({ messages, context })
        res.json({ text })
    } catch (err) {
        console.error('❌ Lỗi Tutor Chat:', err)
        res.status(500).json({ error: 'Không thể xử lý yêu cầu chat lúc này' })
    }
})

// API: Tutor Chat + File Upload (docx/txt/img)
app.post('/api/chat-upload', chatUpload.single('file'), async (req, res) => {
    try {
        const { messages, context } = JSON.parse(req.body.data || '{}')
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

// ============================================
// QUIZ QUESTION BANK SYSTEM
// AI tạo ngân hàng câu hỏi lớn (40-60 câu), mỗi lần vào random pick ~20 câu
// ============================================

// Hàm Fisher-Yates shuffle
function shuffleArray(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

// Hàm pick câu hỏi ngẫu nhiên từ ngân hàng, đảm bảo đa dạng difficulty
function pickRandomQuestions(bank, maxPick = 20) {
    if (bank.length <= maxPick) return { picked: shuffleArray(bank), total: bank.length, pickedCount: bank.length }

    // Phân nhóm theo difficulty
    const easy = bank.filter(q => q.difficulty === 'easy')
    const medium = bank.filter(q => q.difficulty === 'medium')
    const hard = bank.filter(q => q.difficulty === 'hard')

    // Tỷ lệ: ~30% easy, ~45% medium, ~25% hard
    const easyCount = Math.min(Math.round(maxPick * 0.3), easy.length)
    const hardCount = Math.min(Math.round(maxPick * 0.25), hard.length)
    const mediumCount = Math.min(maxPick - easyCount - hardCount, medium.length)
    const remaining = maxPick - easyCount - mediumCount - hardCount

    let picked = [
        ...shuffleArray(easy).slice(0, easyCount),
        ...shuffleArray(medium).slice(0, mediumCount),
        ...shuffleArray(hard).slice(0, hardCount),
    ]

    // Nếu chưa đủ, lấy thêm random từ bank
    if (remaining > 0) {
        const usedIds = new Set(picked.map(q => q.id))
        const rest = bank.filter(q => !usedIds.has(q.id))
        picked = [...picked, ...shuffleArray(rest).slice(0, remaining)]
    }

    // Shuffle lại thứ tự cuối cùng
    return { picked: shuffleArray(picked), total: bank.length, pickedCount: picked.length }
}

// API: Quiz Generator — Question Bank System (RAG-enhanced)
app.post('/api/generate-quiz', async (req, res) => {
    try {
        const { text, courseId = 'unknown', mode = 'random' } = req.body

        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured' })
        }

        // mode = 'new_set': Xóa bank cũ, tạo bank mới
        // mode = 'random': Pick random từ bank đã có (hoặc tạo mới nếu chưa có)

        if (mode === 'new_set') {
            try {
                fs.unlinkSync(getCachePath('quiz_bank', courseId, 'all'))
                console.log(`🗑️ Đã xóa quiz bank cũ cho courseId=${courseId}`)
            } catch (e) { }
        }

        // Check bank cache
        let bank = readCache('quiz_bank', courseId, 'all')

        if (bank && Array.isArray(bank) && bank.length > 0) {
            console.log(`📦 Quiz bank hit cho courseId=${courseId} (${bank.length} câu)`)
            const { picked, total, pickedCount } = pickRandomQuestions(bank, 20)
            return res.json({ questions: picked, bankTotal: total, pickedCount })
        }

        // === RAG: Lấy nội dung từ tài liệu đã upload ===
        let ragText = ''
        try {
            // Đọc metadata để tìm tất cả lessonId đã upload cho courseId này
            let metadata = []
            try {
                metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'))
            } catch (e) { metadata = [] }

            const lessonIds = [...new Set(metadata.filter(m => m.courseId === String(courseId)).map(m => m.lessonId))]

            if (lessonIds.length > 0) {
                console.log(`📚 [RAG Quiz] Tìm thấy ${lessonIds.length} bài giảng đã upload cho courseId=${courseId}`)
                for (const lid of lessonIds) {
                    const docText = await getDocumentTextByLesson(String(courseId), lid)
                    if (docText) {
                        ragText += `\n\n=== BÀI GIẢNG ${lid} ===\n${docText}`
                    }
                }
            }
        } catch (ragErr) {
            console.error('⚠️ Lỗi khi lấy RAG text cho quiz:', ragErr.message)
        }

        // Kết hợp: ưu tiên RAG text, fallback text từ frontend
        let finalText = ''
        if (ragText.trim()) {
            finalText = ragText
            console.log(`✅ [RAG Quiz] Dùng nội dung từ tài liệu đã upload (${ragText.length} chars)`)
        } else if (text && text.trim()) {
            finalText = text
            console.log(`⚠️ [RAG Quiz] Không có tài liệu upload, dùng text từ frontend (${text.length} chars)`)
        } else {
            return res.status(400).json({ error: 'Không có dữ liệu bài giảng để tạo quiz. Vui lòng upload tài liệu trước.' })
        }

        // Tính số câu cần tạo (Giảm số lượng để phản hồi nhanh hơn, AI sinh JSON quá dài sẽ bị chậm)
        const textLength = finalText.length
        let bankSize = 20 // default: tạo thẳng 20 câu để thi luôn
        if (textLength < 1000) bankSize = 10
        else if (textLength < 3000) bankSize = 15
        else if (textLength < 6000) bankSize = 20
        else bankSize = 25 // Tối đa 25 câu để tiết kiệm thời gian phản hồi trúc JSON

        console.log(`🤖 Generating quiz cho courseId=${courseId} (${bankSize} câu, text=${textLength} chars)...`)

        const prompt = `Bạn là Quiz Generator Agent chuyên tạo câu hỏi kiểm tra từ BÀI GIẢNG.

## NHIỆM VỤ:
Tạo CHÍNH XÁC ${bankSize} câu hỏi trắc nghiệm dựa trên NỘI DUNG BÀI GIẢNG bên dưới.

## QUY TẮC NGHIÊM NGẶT — BẮT BUỘC TUÂN THỦ:
1. **TUYỆT ĐỐI CHỈ** được tạo câu hỏi từ nội dung bài giảng được cung cấp bên dưới
2. **KHÔNG ĐƯỢC BỊA** thêm kiến thức, ví dụ, số liệu từ bên ngoài
3. **KHÔNG ĐƯỢC** lấy ví dụ hay thông tin không có trong tài liệu
4. Mọi câu hỏi phải có thể truy nguyên được trong nội dung bài giảng
5. Giải thích phải trích dẫn cụ thể từ nội dung đã cung cấp

## YÊU CẦU CHẤT LƯỢNG:
1. Tạo đủ ${bankSize} câu, bao phủ TOÀN BỘ nội dung (mỗi phần/bài đều phải có câu hỏi)
2. Tỷ lệ loại câu: ~70% multiple_choice, ~30% true_false
3. Tỷ lệ độ khó: ~30% easy, ~45% medium, ~25% hard
4. MỖI CÂU PHẢI KHÁC NHAU, không được trùng ý
5. Câu hỏi phải rõ ràng, chính xác, có 1 đáp án đúng duy nhất
6. Đáp án sai phải hợp lý (plausible distractors)

## ĐỊNH DẠNG: JSON array, MỖI PHẦN TỬ theo cấu trúc:

Câu multiple_choice:
{
  "id": number (1..${bankSize}),
  "type": "multiple_choice",
  "difficulty": "easy" | "medium" | "hard",
  "question": "Câu hỏi...",
  "options": ["A", "B", "C", "D"],
  "correctIdx": 0-3,
  "explanation": "Giải thích ngắn gọn (trích dẫn từ bài giảng)..."
}

Câu true_false:
{
  "id": number,
  "type": "true_false",
  "difficulty": "easy" | "medium" | "hard",
  "question": "Mệnh đề...",
  "answer": true | false,
  "explanation": "Giải thích ngắn gọn (trích dẫn từ bài giảng)..."
}

NỘI DUNG BÀI GIẢNG (CHỈ ĐƯỢC DÙNG NỘI DUNG NÀY):
${finalText}`

        const response = await ai.models.generateContent({
            model: currentModel,
            contents: prompt,
            config: {
                temperature: 0.5,
                responseMimeType: 'application/json'
            }
        })

        // parse JSON
        let quizBank = []
        try {
            quizBank = JSON.parse(response.text)
        } catch (e) {
            console.error("Lỗi parse JSON quiz bank:", response.text?.substring(0, 300))
            return res.status(500).json({ error: 'AI trả về định dạng sai' })
        }

        if (!Array.isArray(quizBank) || quizBank.length === 0) {
            return res.status(500).json({ error: 'AI không tạo được câu hỏi' })
        }

        // Đảm bảo mỗi câu có id duy nhất
        quizBank = quizBank.map((q, idx) => ({ ...q, id: idx + 1 }))

        // Cache
        writeCache('quiz_bank', courseId, 'all', quizBank)
        console.log(`✅ Quiz đã tạo và cache: ${quizBank.length} câu cho courseId=${courseId}`)

        // Pick random subset
        const pickCount = Math.min(20, quizBank.length)
        const { picked, total, pickedCount } = pickRandomQuestions(quizBank, pickCount)

        res.json({ questions: picked, bankTotal: total, pickedCount })
    } catch (err) {
        console.error('❌ Lỗi Quiz Generator:', err)
        res.status(500).json({ error: 'Lỗi trong quá trình tạo quiz' })
    }
})

// Clear quiz bank cache (để tạo lại bank mới)
app.delete('/api/clear-quiz-cache/:courseId', (req, res) => {
    const { courseId } = req.params
    try {
        fs.unlinkSync(getCachePath('quiz_bank', courseId, 'all'))
        console.log(`🗑️ Đã xóa quiz bank cho courseId=${courseId}`)
    } catch (e) { /* file might not exist */ }
    try {
        fs.unlinkSync(getCachePath('quiz', courseId, 'all'))
    } catch (e) { }
    res.json({ success: true })
})

// ============================================
// QUIZ HISTORY SYSTEM
// ============================================

function readQuizHistory() {
    try {
        return JSON.parse(fs.readFileSync(QUIZ_HISTORY_FILE, 'utf-8'))
    } catch (e) {
        return []
    }
}

function writeQuizHistory(data) {
    fs.writeFileSync(QUIZ_HISTORY_FILE, JSON.stringify(data, null, 2))
}

// API: Lưu kết quả quiz
app.post('/api/quiz-history', (req, res) => {
    try {
        const { courseId, courseName, score, total, percent, timeTaken, date } = req.body

        if (!courseId || score === undefined || total === undefined) {
            return res.status(400).json({ error: 'Thiếu dữ liệu kết quả quiz' })
        }

        const history = readQuizHistory()
        const entry = {
            id: Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
            courseId: String(courseId),
            courseName: courseName || 'Môn học',
            score,
            total,
            percent: percent || Math.round((score / total) * 100),
            timeTaken: timeTaken || 0,
            date: date || new Date().toISOString()
        }

        history.unshift(entry) // newest first

        // Giữ tối đa 200 bản ghi
        if (history.length > 200) history.length = 200

        writeQuizHistory(history)
        console.log(`📝 Quiz history saved: ${entry.courseName} — ${entry.score}/${entry.total} (${entry.percent}%)`)

        res.json({ success: true, entry })
    } catch (err) {
        console.error('❌ Lỗi lưu quiz history:', err)
        res.status(500).json({ error: 'Không thể lưu kết quả quiz' })
    }
})

// API: Lấy lịch sử quiz (tất cả hoặc theo courseId)
app.get(['/api/quiz-history', '/api/quiz-history/:courseId'], (req, res) => {
    try {
        const { courseId } = req.params
        let history = readQuizHistory()

        if (courseId) {
            history = history.filter(h => h.courseId === String(courseId))
        }

        res.json(history)
    } catch (err) {
        console.error('❌ Lỗi đọc quiz history:', err)
        res.status(500).json({ error: 'Không thể đọc lịch sử quiz' })
    }
})

// ============================================
// AI CACHE SETUP
// ============================================
const AI_CACHE_DIR = join(__dirname, 'ai-cache')
fs.mkdirSync(AI_CACHE_DIR, { recursive: true })

function getCachePath(type, courseId, lessonId) {
    return join(AI_CACHE_DIR, `${type}_${courseId}_${lessonId}.json`)
}

function readCache(type, courseId, lessonId) {
    const p = getCachePath(type, courseId, lessonId)
    if (fs.existsSync(p)) {
        try { return JSON.parse(fs.readFileSync(p, 'utf-8')) } catch { return null }
    }
    return null
}

function writeCache(type, courseId, lessonId, data) {
    fs.writeFileSync(getCachePath(type, courseId, lessonId), JSON.stringify(data, null, 2))
}

function clearCache(courseId, lessonId) {
    try { fs.unlinkSync(getCachePath('immersive', courseId, lessonId)) } catch (e) { }
    try { fs.unlinkSync(getCachePath('mindmap', courseId, lessonId)) } catch (e) { }
}

// ============================================
// PRE-GENERATE: Tạo sẵn Immersive Text & cache
// ============================================
async function generateAndCacheImmersiveText(courseId, lessonId, title) {
    // Kiểm tra cache trước
    const cached = readCache('immersive', courseId, lessonId)
    if (cached) {
        console.log(`📦 [Pre-train] Cache đã có sẵn cho ${courseId}/${lessonId}, bỏ qua.`)
        return cached
    }

    if (!process.env.OPENROUTER_API_KEY) {
        console.error('❌ [Pre-train] OPENROUTER_API_KEY chưa cấu hình')
        return null
    }

    // Lấy text từ Vector DB
    const realDocumentText = await getDocumentTextByLesson(courseId, lessonId)
    if (!realDocumentText) {
        console.log(`⚠️ [Pre-train] Chưa có document text cho ${courseId}/${lessonId}, bỏ qua.`)
        return null
    }

    const docTitle = title || `Bài giảng ${lessonId}`
    const sourceDataNote = `BÀI GIẢNG GỐC TỪ TÀI LIỆU CỦA GIÁO VIÊN NẠP LÊN HỆ THỐNG:\nTiêu đề: ${docTitle}\n================\n${realDocumentText}\n================\nHãy bám sát nội dung chi tiết phía trên để tạo bài học Immersive Text.`

    const prompt = buildImmersivePrompt(sourceDataNote)

    try {
        console.log(`🚀 [Pre-train] Đang tạo Immersive Text cho ${courseId}/${lessonId}...`)
        const response = await ai.models.generateContent({
            model: currentModel,
            contents: prompt,
            config: {
                temperature: 0.7,
                responseMimeType: 'application/json'
            }
        })

        const result = JSON.parse(response.text)
        if (!result.sections || result.sections.length === 0) {
            throw new Error('AI trả về dữ liệu không có sections')
        }

        writeCache('immersive', courseId, lessonId, result)
        console.log(`✅ [Pre-train] Đã tạo & cache Immersive Text cho ${courseId}/${lessonId} (${result.sections.length} sections)`)
        return result
    } catch (err) {
        console.error(`❌ [Pre-train] Lỗi tạo Immersive Text cho ${courseId}/${lessonId}:`, err.message)
        return null
    }
}

// Hàm build prompt dùng chung
function buildImmersivePrompt(sourceDataNote) {
    return `Vai trò: Bạn là một chuyên gia thiết kế nội dung học tập kỹ thuật số (Instructional Designer) hàng đầu. Nhiệm vụ của bạn là chuyển đổi tài liệu học thuật khô khan thành nội dung "Immersive Text" sinh động, dễ hiểu nhưng phải chính xác 100% so với tài liệu gốc.

## QUY TRÌNH PHÂN TÍCH (BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT):

### BƯỚC 1 — TRÍCH XUẤT Ý CHÍNH
- Quét toàn bộ văn bản gốc để tìm TẤT CẢ: Khái niệm, Định nghĩa, Tầm quan trọng, Bối cảnh chiến lược, Phân loại, Quy trình, Ưu/Nhược điểm...
- Tuyệt đối KHÔNG nhầm lẫn sang chủ đề khác, KHÔNG thêm kiến thức ngoài tài liệu.

### BƯỚC 2 — CẤU TRÚC TRÌNH BÀY (IMMERSIVE STYLE)
- Bám sát tài liệu bài giảng gốc, chuyển hóa thành các đoạn văn chuyên nghiệp, truyền cảm hứng.
- Mỗi section phải có: icon đại diện, tiêu đề rõ ràng, insight nổi bật (1 câu tóm tắt tinh hoa), nội dung diễn giải chi tiết bằng Markdown.
- Sử dụng **bold**, danh sách gạch đầu dòng, và cấu trúc rõ ràng để tăng khả năng đọc hiểu.

### BƯỚC 3 — VÍ DỤ THỰC TẾ DOANH NGHIỆP
- Đưa ra 01 ví dụ minh họa thực tế cho một doanh nghiệp cụ thể (có tên, ngành nghề) khi áp dụng kiến thức trong phần đó.
- Ví dụ phải sinh động, có ngữ cảnh rõ ràng, giúp người học liên tưởng ngay.

### BƯỚC 4 — ACTIONABLE CHECKLIST
- Biến các mục tiêu, ý chính trong tài liệu thành danh sách hành động/ghi nhớ ngắn gọn để người học dễ áp dụng.
- Mỗi checklist item nên bắt đầu bằng động từ hành động.

## QUY TẮC NỘI DUNG:
- 📝 **Giọng văn**: Chuyên nghiệp, truyền cảm hứng, sử dụng các icon phù hợp (📌🎯💡✅🔑📊🏢...).
- 🎯 **Tính chính xác**: Bám sát 100% tài liệu gốc. TUYỆT ĐỐI KHÔNG tự ý bịa đặt kiến thức bên ngoài.
- 📖 **Nội dung phong phú**: Mỗi section phải có nội dung diễn giải DÀI VÀ CHI TIẾT (ít nhất 3-5 đoạn văn), không được tóm tắt quá ngắn.
- 🌟 **Trực quan**: Dùng Markdown (**bold**, - list, ## heading) để tăng tính trực quan.

## ĐỊNH DẠNG TRẢ VỀ (JSON — BẮT BUỘC CHÍNH XÁC):
{
  "title": "📚 Tiêu đề bài học hấp dẫn",
  "overview": "Tổng quan ngắn gọn 2-3 câu giới thiệu bài học, nêu bật giá trị cốt lõi mà người học sẽ nhận được.",
  "sections": [
    {
      "iconLabel": "📌",
      "heading": "Tiêu đề phần kiến thức",
      "keyInsight": "Một câu insight nổi bật nhất, tóm tắt tinh hoa của phần này.",
      "content": "Nội dung diễn giải chi tiết, chuyên nghiệp, sinh động từ tài liệu gốc. Hỗ trợ Markdown: **bold**, - danh sách, ## heading con. Phải DÀI VÀ ĐẦY ĐỦ.",
      "realWorldExample": "💡 Ví dụ: Công ty ABC (ngành XYZ) đã áp dụng phương pháp này để... Kết quả đạt được là...",
      "checklist": [
        "Xác định rõ mục tiêu trước khi bắt đầu",
        "Đánh giá hiện trạng nguồn lực",
        "Lập kế hoạch triển khai từng giai đoạn"
      ],
      "quiz": {
        "question": "Câu hỏi kiểm tra tư duy phản biện?",
        "options": ["Lựa chọn A chi tiết", "Lựa chọn B chi tiết", "Lựa chọn C chi tiết", "Lựa chọn D chi tiết"],
        "correctIdx": 0,
        "explanation": "Giải thích chi tiết vì sao đáp án này đúng, trích dẫn từ tài liệu."
      }
    }
  ]
}

LƯU Ý QUAN TRỌNG:
- Mỗi section PHẢI có đầy đủ: iconLabel, heading, keyInsight, content, realWorldExample, checklist, quiz.
- iconLabel phải là emoji phù hợp với nội dung section (📌🎯💡🔑📊🏢🧩⚡🌐🛡️...).
- overview là BẮT BUỘC, phải tóm tắt giá trị cốt lõi toàn bài.
- Số lượng sections phải bám sát số lượng chủ đề chính trong tài liệu gốc.

BÀI GIẢNG GỐC CẦN PHÂN TÍCH:
${sourceDataNote}`
}

// ============================================
// API: Immersive Text (AI diễn giải nội dung)
// Ưu tiên load từ cache (pre-trained), fallback gọi AI nếu chưa có
// ============================================
app.post('/api/ai/immersive-text', async (req, res) => {
    try {
        const { courseId, lessonId, title, sections } = req.body

        if (!courseId || !lessonId || !sections) {
            return res.status(400).json({ error: 'Thiếu courseId, lessonId hoặc sections' })
        }

        // Check cache first (pre-trained data)
        const cached = readCache('immersive', courseId, lessonId)
        if (cached) {
            console.log(`⚡ [Cache hit] Immersive text cho ${courseId}/${lessonId} — load ngay, không tốn token!`)
            return res.json(cached)
        }

        // Fallback: generate on-the-fly nếu chưa có cache
        console.log(`🔄 [Cache miss] Immersive text cho ${courseId}/${lessonId} — generating...`)
        const result = await generateAndCacheImmersiveText(courseId, lessonId, title)

        if (result) {
            return res.json(result)
        }

        // Nếu không có document text → fallback dùng sections từ frontend
        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured' })
        }

        const sectionsText = sections.map((s) => {
            let content = `## ${s.heading}\n`
            if (s.text) content += s.text + '\n'
            if (s.list) content += s.list.map(item => `- ${item}`).join('\n') + '\n'
            return content
        }).join('\n')

        const sourceDataNote = `BÀI GIẢNG GỐC:\nTiêu đề: ${title}\n${sectionsText}`
        const prompt = buildImmersivePrompt(sourceDataNote)

        const response = await ai.models.generateContent({
            model: currentModel,
            contents: prompt,
            config: {
                temperature: 0.7,
                responseMimeType: 'application/json'
            }
        })

        let parsed
        try {
            parsed = JSON.parse(response.text)
        } catch (e) {
            console.error('Lỗi parse immersive text JSON:', response.text?.substring(0, 200))
            return res.status(500).json({ error: 'AI trả về định dạng sai' })
        }

        writeCache('immersive', courseId, lessonId, parsed)
        console.log(`✨ Generated & cached immersive text cho ${courseId}/${lessonId}`)
        res.json(parsed)
    } catch (err) {
        console.error('❌ Lỗi Immersive Text:', err)
        res.status(500).json({ error: 'Lỗi trong quá trình tạo immersive text' })
    }
})

// ============================================
// API: Pre-train tất cả bài học đã có tài liệu
// ============================================
app.post('/api/ai/pre-train', async (req, res) => {
    try {
        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured' })
        }

        // Đọc metadata.json để tìm tất cả courseId/lessonId đã upload
        let metadata = []
        try {
            metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'))
        } catch (e) {
            return res.json({ success: true, message: 'Không có tài liệu nào để pre-train', results: [] })
        }

        // Nhóm theo courseId + lessonId (unique pairs)
        const lessonPairs = new Map()
        for (const entry of metadata) {
            const key = `${entry.courseId}__${entry.lessonId}`
            if (!lessonPairs.has(key)) {
                lessonPairs.set(key, {
                    courseId: entry.courseId,
                    lessonId: entry.lessonId,
                    title: entry.lessonName || entry.originalName?.replace(/\.[^.]+$/, '') || `Bài ${entry.lessonId}`
                })
            }
        }

        console.log(`🎓 [Pre-train] Bắt đầu pre-train ${lessonPairs.size} bài học...`)

        const results = []
        for (const [key, info] of lessonPairs) {
            const result = await generateAndCacheImmersiveText(info.courseId, info.lessonId, info.title)
            results.push({
                courseId: info.courseId,
                lessonId: info.lessonId,
                status: result ? 'success' : 'skipped',
                sections: result?.sections?.length || 0
            })
        }

        const successCount = results.filter(r => r.status === 'success').length
        console.log(`✅ [Pre-train] Hoàn tất! ${successCount}/${results.length} bài học đã được pre-train.`)

        res.json({
            success: true,
            message: `Pre-train hoàn tất: ${successCount}/${results.length} bài học`,
            results
        })
    } catch (err) {
        console.error('❌ Lỗi Pre-train:', err)
        res.status(500).json({ error: 'Lỗi trong quá trình pre-train' })
    }
})

// ============================================
// API: Mindmap Generator (AI tạo sơ đồ tư duy)
// ============================================
app.post('/api/ai/mindmap', async (req, res) => {
    try {
        const { courseId, lessonId, title, sections } = req.body

        if (!courseId || !lessonId || !sections) {
            return res.status(400).json({ error: 'Thiếu courseId, lessonId hoặc sections' })
        }

        // Check cache first
        const cached = readCache('mindmap', courseId, lessonId)
        if (cached) {
            console.log(`📦 Cache hit: mindmap for ${courseId}/${lessonId}`)
            return res.json(cached)
        }

        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured' })
        }

        const sectionsText = sections.map(s => {
            let content = `## ${s.heading}\n`
            if (s.text) content += s.text + '\n'
            if (s.list) content += s.list.map(item => `- ${item}`).join('\n') + '\n'
            return content
        }).join('\n')

        // Tự động kiểm tra xem bài học này có tài liệu upload trong hệ thống chưa (Đã nâng cấp Async MongoDB)
        const realDocumentText = await getDocumentTextByLesson(courseId, lessonId)

        const sourceDataNote = realDocumentText
            ? `BÀI GIẢNG GỐC TỪ TÀI LIỆU CỦA GIÁO VIÊN NẠP LÊN HỆ THỐNG:\nTiêu đề: ${title}\n================\n${realDocumentText}\n================\nHãy bám sát nội dung chi tiết phía trên để tạo các nhánh Mindmap.`
            : `BÀI GIẢNG GỐC:\nTiêu đề: ${title}\n${sectionsText}`

        const prompt = `Bạn là AI chuyên tạo sơ đồ tư duy (mind map).

## QUY TRÌNH CHAIN OF THOUGHT (BẮT BUỘC):

### BƯỚC 1: LIỆT KÊ ĐẦU MỤC (QUAN TRỌNG NHẤT - TRÁNH BỎ SÓT)
Đọc KỸ BÀI GIẢNG GỐC và liệt kê TẤT CẢ các đầu mục chính tìm thấy trong tài liệu:
1. [Chủ đề lớn 1]: [khái niệm con A, khái niệm con B...]
2. [Chủ đề lớn 2]: [phân loại X, phân loại Y...]
3. [Chủ đề lớn 3]: [ưu điểm, nhược điểm...]
... (liệt kê HẾT, đảm bảo không bỏ sót ý nào trong tài liệu)

### BƯỚC 2: KIỂM TRA ĐẦY ĐỦ
- Đã liệt kê đủ các khái niệm chưa?
- Đã có phân loại/ưu nhược điểm/quy trình chưa?
- Có ý nào bị bỏ sót không?

### BƯỚC 3: XÂY DỰNG MINDMAP
- Node gốc (root): Tên bài giảng/Chủ đề chính
- Nhánh cấp 1: Các section/chủ đề lớn từ bước 1
- Nhánh cấp 2: Khái niệm/ý chính (2-5 nhánh con mỗi nhánh chính)
- Nhánh cấp 3,4: Chi tiết, định nghĩa, ví dụ nếu tài liệu có

---

## QUY TẮC NGHIÊM NGẶT:
- Label ngắn gọn, súc tích (1-5 từ)
- Bám sát TÀI LIỆU, KHÔNG bịa thêm
- Đảm bảo đầy đủ các ý chính đã liệt kê trong chainOfThought

## ĐỊNH DẠNG TRẢ VỀ: JSON object với cấu trúc:
{
  "chainOfThought": {
    "summary": "Tóm tắt ngắn gọn nội dung (1-2 câu)",
    "topics": [
      "1. Tên chủ đề lớn thứ nhất - gồm các khái niệm A, B, C",
      "2. Tên chủ đề lớn thứ hai - gồm phân loại X, Y, Z",
      "3. Tên chủ đề lớn thứ ba - gồm ưu điểm, nhược điểm"
    ]
  },
  "root": {
    "label": "Tên bài/Chủ đề chính",
    "children": [
      {
        "label": "Chủ đề số 1 (khớp với topics[0])",
        "children": [
          {
            "label": "Khái niệm con A",
            "children": [
              { "label": "Đặc điểm 1" },
              { "label": "Đặc điểm 2" }
            ]
          }
        ]
      }
    ]
  }
}

LƯU Ý: Số lượng children cấp 1 của root PHẢI KHỚP với số lượng topics đã liệt kê

${sourceDataNote}`

        const response = await ai.models.generateContent({
            model: currentModel,
            contents: prompt,
            config: {
                temperature: 0.3,
                responseMimeType: 'application/json'
            }
        })

        let result
        try {
            result = JSON.parse(response.text)
        } catch (e) {
            console.error('Lỗi parse mindmap JSON:', response.text?.substring(0, 200))
            return res.status(500).json({ error: 'AI trả về định dạng sai' })
        }

        // Cache the result
        writeCache('mindmap', courseId, lessonId, result)
        console.log(`🧠 Generated mindmap for ${courseId}/${lessonId}`)

        res.json(result)
    } catch (err) {
        console.error('❌ Lỗi Mindmap Generator:', err)
        res.status(500).json({ error: 'Lỗi trong quá trình tạo mindmap' })
    }
})

// ============================================
// ASSIGNMENT & AI AUTO-GRADER SYSTEM
// ============================================

function readAssignments() {
    try {
        return JSON.parse(fs.readFileSync(ASSIGNMENTS_FILE, 'utf-8'))
    } catch (e) {
        return []
    }
}

function writeAssignments(data) {
    fs.writeFileSync(ASSIGNMENTS_FILE, JSON.stringify(data, null, 2))
}

// API: Tạo bài tập mới (Giảng viên)
app.post('/api/assignments', async (req, res) => {
    try {
        const { courseId, courseName, title, description, dueDate } = req.body

        if (!courseId || !title || !description) {
            return res.status(400).json({ error: 'Thiếu courseId, title hoặc description' })
        }

        // AI tự động sinh Rubric từ đề bài
        let rubric = ''
        try {
            console.log(`🤖 [Auto-Rubric] Đang tạo tiêu chí chấm điểm cho: "${title}"`)
            const rubricPrompt = `Bạn là một giảng viên đại học chuyên nghiệp. Dựa vào đề bài tập sau đây, hãy tạo ra TIÊU CHÍ CHẤM ĐIỂM (Rubric) chi tiết trên thang điểm 10.

ĐỀ BÀI:
${description}

Hãy trả về Rubric dưới dạng danh sách gạch đầu dòng, mỗi dòng gồm: Tên tiêu chí + Điểm tối đa.
Tổng điểm tất cả tiêu chí PHẢI BẰNG ĐÚNG 10.

Ví dụ format:
- Đúng logic/thuật toán: 4 điểm
- Trình bày code rõ ràng, có comment: 2 điểm  
- Xử lý edge cases: 2 điểm
- Đặt tên biến/hàm dễ hiểu: 1 điểm
- Code chạy không lỗi: 1 điểm

Chỉ trả về danh sách Rubric, KHÔNG giải thích thêm.`

            const rubricRes = await ai.models.generateContent({
                model: currentModel,
                contents: rubricPrompt,
                config: { temperature: 0.3 }
            })
            rubric = rubricRes.text?.trim() || ''
            console.log(`✅ [Auto-Rubric] Đã tạo xong tiêu chí chấm điểm`)
        } catch (e) {
            console.error('⚠️ Lỗi tạo rubric tự động:', e.message)
            rubric = '- Hoàn thành đúng yêu cầu: 5 điểm\n- Trình bày rõ ràng: 3 điểm\n- Sáng tạo: 2 điểm'
        }

        const assignment = {
            id: Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
            courseId: String(courseId),
            courseName: courseName || '',
            title,
            description,
            rubric,
            dueDate: dueDate || null,
            submissions: [],
            createdAt: new Date().toISOString()
        }

        const assignments = readAssignments()
        assignments.unshift(assignment)
        writeAssignments(assignments)

        console.log(`📝 Assignment created: "${title}" for course ${courseId}`)
        res.json({ success: true, assignment })
    } catch (err) {
        console.error('❌ Lỗi tạo assignment:', err)
        res.status(500).json({ error: 'Không thể tạo bài tập' })
    }
})

// API: Lấy danh sách bài tập theo courseId
app.get('/api/assignments/:courseId', (req, res) => {
    const { courseId } = req.params
    const assignments = readAssignments().filter(a => a.courseId === String(courseId))
    res.json(assignments)
})

// API: Lấy chi tiết 1 bài tập
app.get('/api/assignment/:id', (req, res) => {
    const { id } = req.params
    const assignment = readAssignments().find(a => a.id === id)
    if (!assignment) return res.status(404).json({ error: 'Không tìm thấy bài tập' })
    res.json(assignment)
})

// API: Cập nhật Rubric (Giảng viên sửa tiêu chí)
app.put('/api/assignments/:id/rubric', (req, res) => {
    const { id } = req.params
    const { rubric } = req.body
    const assignments = readAssignments()
    const idx = assignments.findIndex(a => a.id === id)
    if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy bài tập' })
    assignments[idx].rubric = rubric
    writeAssignments(assignments)
    res.json({ success: true, rubric })
})

// API: Sinh viên nộp bài + AI chấm điểm tự động
app.post('/api/assignments/:id/submit', async (req, res) => {
    try {
        const { id } = req.params
        const { studentName, studentId, submissionText } = req.body

        if (!submissionText || !submissionText.trim()) {
            return res.status(400).json({ error: 'Chưa có nội dung bài làm' })
        }

        const assignments = readAssignments()
        const idx = assignments.findIndex(a => a.id === id)
        if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy bài tập' })

        const assignment = assignments[idx]

        // === GỌI AI CHẤM ĐIỂM ===
        console.log(`🤖 [AI Grading] Đang chấm bài "${assignment.title}" cho SV ${studentName || 'N/A'}...`)

        const gradingPrompt = `Bạn là một giảng viên đại học công tâm và chặt chẽ. Hãy chấm điểm bài làm của sinh viên dưới đây.

## ĐỀ BÀI:
${assignment.description}

## TIÊU CHÍ CHẤM ĐIỂM (RUBRIC) — Thang điểm 10:
${assignment.rubric}

## BÀI LÀM CỦA SINH VIÊN:
${submissionText}

## YÊU CẦU:
1. Đánh giá bài làm dựa CHÍNH XÁC theo từng tiêu chí trong Rubric
2. Cho điểm từng tiêu chí, sau đó tính tổng
3. Tổng điểm tối đa là 10
4. Viết nhận xét chi tiết (chỉ ra điểm tốt + điểm cần cải thiện)

Trả về KẾT QUẢ dưới dạng JSON:
{
  "diem": <số điểm từ 0.0 đến 10.0>,
  "chiTiet": ["Tiêu chí 1: X/Y điểm - Lý do", "Tiêu chí 2: X/Y điểm - Lý do"],
  "nhanXet": "Nhận xét tổng quan ngắn gọn về bài làm",
  "diemManh": "Điểm mạnh của bài làm",
  "canCaiThien": "Những điểm cần cải thiện"
}`

        const gradeRes = await ai.models.generateContent({
            model: currentModel, // Dùng GPT-4o cho chấm điểm (chính xác)
            contents: gradingPrompt,
            config: {
                temperature: 0.2,
                responseMimeType: 'application/json'
            }
        })

        let gradeResult = {}
        try {
            gradeResult = JSON.parse(gradeRes.text)
        } catch (e) {
            console.error('Lỗi parse grading JSON:', gradeRes.text?.substring(0, 300))
            gradeResult = { diem: 0, nhanXet: 'Lỗi hệ thống khi chấm điểm. Vui lòng thử lại.', chiTiet: [], diemManh: '', canCaiThien: '' }
        }

        // Lưu submission + kết quả
        const submission = {
            id: Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 4),
            studentName: studentName || 'Sinh viên',
            studentId: studentId || '',
            submissionText: submissionText.substring(0, 50000), // Giới hạn 50k ký tự
            grade: gradeResult,
            submittedAt: new Date().toISOString()
        }

        assignments[idx].submissions.unshift(submission)
        writeAssignments(assignments)

        console.log(`✅ [AI Grading] Đã chấm xong: ${gradeResult.diem}/10 — "${assignment.title}"`)

        res.json({ success: true, submission })
    } catch (err) {
        console.error('❌ Lỗi AI Grading:', err)
        res.status(500).json({ error: 'Lỗi trong quá trình chấm điểm' })
    }
})

// API: Lấy lịch sử nộp bài của 1 assignment
app.get('/api/assignments/:id/submissions', (req, res) => {
    const { id } = req.params
    const assignment = readAssignments().find(a => a.id === id)
    if (!assignment) return res.status(404).json({ error: 'Không tìm thấy bài tập' })
    res.json(assignment.submissions || [])
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
    console.log(`\n🚀 LMS API Server đang chạy: http://localhost:${PORT}`)
    console.log(`   POST /api/send-otp         — Gửi mã OTP`)
    console.log(`   POST /api/verify-otp        — Xác thực OTP`)
    console.log(`   POST /api/chat              — Tutor Chat (Flash)`)
    console.log(`   POST /api/assignments       — Tạo bài tập + AI Rubric`)
    console.log(`   POST /api/assignments/:id/submit — Nộp bài + AI Chấm điểm\n`)
})
