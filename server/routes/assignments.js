import { Router } from 'express'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { ai, getCurrentModel } from '../config/ai.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const router = Router()

const ASSIGNMENTS_FILE = join(__dirname, '..', 'assignments.json')

// Ensure assignments file exists
if (!fs.existsSync(ASSIGNMENTS_FILE)) {
    fs.writeFileSync(ASSIGNMENTS_FILE, JSON.stringify([], null, 2))
}

// ============================================
// ASSIGNMENT HELPERS
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
router.post('/assignments', async (req, res) => {
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
                model: getCurrentModel(),
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
router.get('/assignments/:courseId', (req, res) => {
    const { courseId } = req.params
    const assignments = readAssignments().filter(a => a.courseId === String(courseId))
    res.json(assignments)
})

// API: Lấy chi tiết 1 bài tập
router.get('/assignment/:id', (req, res) => {
    const { id } = req.params
    const assignment = readAssignments().find(a => a.id === id)
    if (!assignment) return res.status(404).json({ error: 'Không tìm thấy bài tập' })
    res.json(assignment)
})

// API: Cập nhật Rubric (Giảng viên sửa tiêu chí)
router.put('/assignments/:id/rubric', (req, res) => {
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
router.post('/assignments/:id/submit', async (req, res) => {
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
            model: getCurrentModel(), // Dùng GPT-4o cho chấm điểm (chính xác)
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
router.get('/assignments/:id/submissions', (req, res) => {
    const { id } = req.params
    const assignment = readAssignments().find(a => a.id === id)
    if (!assignment) return res.status(404).json({ error: 'Không tìm thấy bài tập' })
    res.json(assignment.submissions || [])
})

export default router
