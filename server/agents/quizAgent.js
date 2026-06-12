// ==============================================
// Quiz Agent
// Extracted from index.js lines 712-912
// Handles: Quiz Question Bank generation, shuffling, random picking
// ==============================================

import fs from 'fs'
import { ai, currentModel } from '../config/ai.js'
import { readCache, writeCache, getCachePath } from '../services/cacheService.js'
import { getDocumentTextByLesson } from '../ragService.js'

/**
 * Fisher-Yates shuffle — xáo trộn mảng ngẫu nhiên
 * @param {Array} arr - Mảng cần xáo trộn
 * @returns {Array} Mảng đã xáo trộn (bản sao)
 */
function shuffleArray(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

/**
 * Pick câu hỏi ngẫu nhiên từ ngân hàng, đảm bảo đa dạng difficulty
 * Tỷ lệ: ~30% easy, ~45% medium, ~25% hard
 *
 * @param {Array} bank - Ngân hàng câu hỏi
 * @param {number} [maxPick=20] - Số câu tối đa cần lấy
 * @returns {{picked: Array, total: number, pickedCount: number}}
 */
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

/**
 * Quiz generation prompt template
 * @param {number} bankSize - Số câu hỏi cần tạo
 * @param {string} finalText - Nội dung bài giảng để tạo quiz
 * @returns {string} Prompt hoàn chỉnh
 */
function buildQuizPrompt(bankSize, finalText) {
    return `Bạn là Quiz Generator Agent chuyên tạo câu hỏi kiểm tra từ BÀI GIẢNG.

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
}

/**
 * Tạo ngân hàng câu hỏi quiz bằng AI, tự động xử lý RAG và cache kết quả
 *
 * @param {Object} params
 * @param {string} params.text - Dữ liệu văn bản fallback từ frontend
 * @param {string} params.courseId - ID khóa học
 * @param {string} params.metadataFile - Đường dẫn file metadata
 * @returns {Promise<{quizBank?: Array, error?: string, status?: number}>} Ngân hàng câu hỏi đã tạo
 */
async function generateQuizBank({ text, courseId, metadataFile }) {
    try {
        // === RAG: Lấy nội dung từ tài liệu đã upload ===
        let ragText = ''
        try {
            // Đọc metadata để tìm tất cả lessonId đã upload cho courseId này
            let metadata = []
            if (fs.existsSync(metadataFile)) {
                metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'))
            }

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
            return { error: 'Không có dữ liệu bài giảng để tạo quiz. Vui lòng upload tài liệu trước.', status: 400 }
        }

        // Tính số câu cần tạo
        const textLength = finalText.length
        let bankSize = 20
        if (textLength < 1000) bankSize = 10
        else if (textLength < 3000) bankSize = 15
        else if (textLength < 6000) bankSize = 20
        else bankSize = 25

        const prompt = buildQuizPrompt(bankSize, finalText)

        const response = await ai.models.generateContent({
            model: currentModel,
            contents: prompt,
            config: {
                temperature: 0.5,
                responseMimeType: 'application/json'
            }
        })

        // Parse JSON
        let quizBank = []
        try {
            quizBank = JSON.parse(response.text)
        } catch (e) {
            console.error("Lỗi parse JSON quiz bank:", response.text?.substring(0, 300))
            return { error: 'AI trả về định dạng sai', status: 500 }
        }

        if (!Array.isArray(quizBank) || quizBank.length === 0) {
            return { error: 'AI không tạo được câu hỏi', status: 500 }
        }

        // Đảm bảo mỗi câu có id duy nhất
        quizBank = quizBank.map((q, idx) => ({ ...q, id: idx + 1 }))

        return { quizBank }
    } catch (err) {
        console.error('❌ Lỗi Quiz Agent:', err)
        return { error: 'Lỗi hệ thống khi tạo quiz', status: 500 }
    }
}

export { shuffleArray, pickRandomQuestions, generateQuizBank }
