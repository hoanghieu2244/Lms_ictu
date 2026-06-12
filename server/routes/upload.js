import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { processDocument } from '../ragService.js'
import { clearCache } from '../services/cacheService.js'
import { generateAndCacheImmersiveText } from '../agents/immersiveAgent.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const router = Router()

// ============================================
// FILE UPLOAD SETUP (Multer)
// ============================================
const UPLOADS_DIR = join(__dirname, '..', 'uploads')
const METADATA_FILE = join(UPLOADS_DIR, 'metadata.json')
const MAX_FILE_SIZE = 200 * 1024 * 1024 // 200MB

// Ensure uploads dir exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

// Ensure metadata file exists
if (!fs.existsSync(METADATA_FILE)) {
    fs.writeFileSync(METADATA_FILE, JSON.stringify([], null, 2))
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

// API: Upload files
router.post('/upload', (req, res) => {
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
router.get('/uploads', (req, res) => {
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

export default router
