import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { initVectorDB } from './ragService.js'

// Import config and state
import { AVAILABLE_MODELS, getCurrentModel, setCurrentModel } from './config/ai.js'

// Import route modules
import authRouter from './routes/auth.js'
import uploadRouter from './routes/upload.js'
import chatRouter from './routes/chat.js'
import quizRouter from './routes/quiz.js'
import aiRouter from './routes/ai.js'
import assignmentsRouter from './routes/assignments.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '.env') })

const app = express()
app.use(cors())
app.use(express.json())

// Serve uploads as static assets
app.use('/uploads', express.static(join(__dirname, 'uploads')))

// Khởi tạo RAG Vector DB (Hỗ trợ MongoDB Atlas hoặc Local JSON)
await initVectorDB()

// ============================================
// MOUNT ROUTE MODULES
// ============================================
app.use('/api', authRouter)
app.use('/api', uploadRouter)
app.use('/api', chatRouter)
app.use('/api', quizRouter)
app.use('/api/ai', aiRouter)
app.use('/api', assignmentsRouter)

// ============================================
// AI MODEL SELECTION API (Main Entry point)
// ============================================
app.get('/api/ai-models', (req, res) => {
    res.json({ models: AVAILABLE_MODELS, current: getCurrentModel() })
})

app.get('/api/ai-model', (req, res) => {
    res.json({ model: getCurrentModel() })
})

app.post('/api/ai-model', (req, res) => {
    const { model } = req.body
    const found = AVAILABLE_MODELS.find(m => m.id === model)
    if (!found) {
        return res.status(400).json({ error: `Model "${model}" không hợp lệ` })
    }
    setCurrentModel(model)
    console.log(`🔄 Đã đổi AI Model → ${model}`)
    res.json({ success: true, model: model, name: found.name })
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
