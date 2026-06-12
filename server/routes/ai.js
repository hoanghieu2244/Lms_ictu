import { Router } from 'express'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import {
    generateAndCacheImmersiveText,
    generateAndCacheCourseSource,
    buildImmersivePrompt
} from '../agents/immersiveAgent.js'
import { generateAndCacheMindmap } from '../agents/mindmapAgent.js'
import { readCache, writeCache } from '../services/cacheService.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const router = Router()

const METADATA_FILE = join(__dirname, '..', 'uploads', 'metadata.json')

// NOTE: These routes are mounted at /api/ai so paths should NOT include /api/ai prefix

// API: Course Source (AI tóm tắt cấu trúc bài học)
router.post('/course-source', async (req, res) => {
    try {
        const { courseId, lessonId, title } = req.body
        if (!courseId || !lessonId) {
            return res.status(400).json({ error: 'Thiếu courseId hoặc lessonId' })
        }

        const cached = readCache('source', courseId, lessonId)
        if (cached) {
            return res.json(cached)
        }

        const result = await generateAndCacheCourseSource(courseId, lessonId, title)
        if (result) {
            return res.json(result)
        }

        return res.status(404).json({ error: 'Chưa có dữ liệu bài giảng gốc. Vui lòng tải lên file tài liệu ở tab Tài liệu tham khảo.' })
    } catch (err) {
        console.error('❌ Lỗi Course Source:', err)
        res.status(500).json({ error: 'Lỗi hệ thống' })
    }
})

// API: Immersive Text (AI diễn giải nội dung)
router.post('/immersive-text', async (req, res) => {
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

        // Import ai and getCurrentModel dynamically to avoid circular deps
        const { ai, getCurrentModel } = await import('../config/ai.js')

        const sectionsText = sections.map((s) => {
            let content = `## ${s.heading}\n`
            if (s.text) content += s.text + '\n'
            if (s.list) content += s.list.map(item => `- ${item}`).join('\n') + '\n'
            return content
        }).join('\n')

        const sourceDataNote = `BÀI GIẢNG GỐC:\nTiêu đề: ${title}\n${sectionsText}`
        const prompt = buildImmersivePrompt(sourceDataNote)

        const response = await ai.models.generateContent({
            model: getCurrentModel(),
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

// API: Pre-train tất cả bài học đã có tài liệu
router.post('/pre-train', async (req, res) => {
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

// API: Mindmap Generator (AI tạo sơ đồ tư duy)
router.post('/mindmap', async (req, res) => {
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

        const result = await generateAndCacheMindmap({ courseId, lessonId, title, sections })

        if (result.error) {
            return res.status(result.status || 500).json({ error: result.error })
        }

        res.json(result.data)
    } catch (err) {
        console.error('❌ Lỗi Mindmap Generator:', err)
        res.status(500).json({ error: 'Lỗi trong quá trình tạo mindmap' })
    }
})

export default router
