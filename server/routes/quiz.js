import { Router } from 'express'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { generateQuizBank, shuffleArray, pickRandomQuestions } from '../agents/quizAgent.js'
import { readCache, writeCache, getCachePath } from '../services/cacheService.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const router = Router()

const METADATA_FILE = join(__dirname, '..', 'uploads', 'metadata.json')
const QUIZ_HISTORY_FILE = join(__dirname, '..', 'quiz-history.json')

// Ensure quiz history file exists
if (!fs.existsSync(QUIZ_HISTORY_FILE)) {
    fs.writeFileSync(QUIZ_HISTORY_FILE, JSON.stringify([], null, 2))
}

// ============================================
// QUIZ HISTORY HELPERS
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

// API: Quiz Generator — Question Bank System (RAG-enhanced)
router.post('/generate-quiz', async (req, res) => {
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
        const quizResult = await generateQuizBank({ text, courseId, metadataFile: METADATA_FILE })

        if (quizResult.error) {
            return res.status(quizResult.status || 500).json({ error: quizResult.error })
        }

        // Cache
        writeCache('quiz_bank', courseId, 'all', quizResult.quizBank)
        console.log(`✅ Quiz đã tạo và cache: ${quizResult.quizBank.length} câu cho courseId=${courseId}`)

        // Pick random subset
        const pickCount = Math.min(20, quizResult.quizBank.length)
        const { picked, total, pickedCount } = pickRandomQuestions(quizResult.quizBank, pickCount)

        res.json({ questions: picked, bankTotal: total, pickedCount })
    } catch (err) {
        console.error('❌ Lỗi Quiz Generator:', err)
        res.status(500).json({ error: 'Lỗi trong quá trình tạo quiz' })
    }
})

// Clear quiz bank cache (để tạo lại bank mới)
router.delete('/clear-quiz-cache/:courseId', (req, res) => {
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
// QUIZ HISTORY ENDPOINTS
// ============================================

// API: Lưu kết quả quiz
router.post('/quiz-history', (req, res) => {
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
router.get(['/quiz-history', '/quiz-history/:courseId'], (req, res) => {
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

export default router
