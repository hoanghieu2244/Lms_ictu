// ==============================================
// Immersive Agent
// Extracted from index.js lines 1026-1191
// Handles: Course Source generation, Immersive Text generation,
//          and the immersive prompt builder
// ==============================================

import { ai, currentModel } from '../config/ai.js'
import { readCache, writeCache } from '../services/cacheService.js'
import { getDocumentTextByLesson } from '../ragService.js'

/**
 * Tạo và cache Course Source (tóm tắt cấu trúc bài học) từ tài liệu upload
 *
 * @param {string} courseId - ID khóa học
 * @param {string} lessonId - ID bài học
 * @param {string} title - Tiêu đề bài học
 * @returns {Promise<Object|null>} Course Source JSON hoặc null
 */
async function generateAndCacheCourseSource(courseId, lessonId, title) {
    const cached = readCache('source', courseId, lessonId)
    if (cached) return cached

    if (!process.env.OPENROUTER_API_KEY) {
        console.error('❌ OPENROUTER_API_KEY chưa cấu hình')
        return null
    }

    const realDocumentText = await getDocumentTextByLesson(courseId, lessonId)
    if (!realDocumentText) {
        console.log(`⚠️ Chưa có document text cho ${courseId}/${lessonId}`)
        return null
    }

    const prompt = `Vai trò: Bạn là giảng viên đại học. Nhiệm vụ của bạn là đọc nội dung bài giảng dưới đây và tóm tắt lại thành cấu trúc Source bài học bao gồm: Mục tiêu bài học, Chuẩn đầu ra, và Nội dung giảng dạy.
KHÔNG sinh thêm kiến thức ngoài. Phải lấy từ nội dung bài giảng gốc.
Định dạng output là JSON STRICTLY MATCHING schema này:
{
  "title": "Tên bài học (dựa theo tiêu đề bài giảng)",
  "sections": [
    {
      "heading": "Tiêu đề phần (ví dụ: Mục tiêu bài học, Chuẩn đầu ra, Nội dung giảng dạy...)",
      "text": "Nội dung văn bản (có thể xuống dòng bằng \\n). Có thể rỗng nếu dùng list.",
      "list": ["mục 1", "mục 2"]
    }
  ]
}

NỘI DUNG BÀI GIẢNG GỐC:
${realDocumentText}`

    try {
        console.log(`🚀 Đang tạo Course Source cho ${courseId}/${lessonId}...`)
        const response = await ai.models.generateContent({
            model: currentModel,
            contents: prompt,
            config: {
                temperature: 0.3,
                responseMimeType: 'application/json'
            }
        })
        const result = JSON.parse(response.text)
        writeCache('source', courseId, lessonId, result)
        console.log(`✅ Đã tạo & cache Course Source cho ${courseId}/${lessonId}`)
        return result
    } catch (err) {
        console.error(`❌ Lỗi tạo Course Source:`, err.message)
        return null
    }
}

/**
 * Tạo và cache Immersive Text (nội dung học tập sinh động) từ tài liệu upload
 * Sử dụng buildImmersivePrompt() để tạo prompt
 *
 * @param {string} courseId - ID khóa học
 * @param {string} lessonId - ID bài học
 * @param {string} title - Tiêu đề bài học
 * @returns {Promise<Object|null>} Immersive Text JSON hoặc null
 */
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

/**
 * Build prompt dùng chung cho Immersive Text generation
 * Chuyển đổi tài liệu học thuật → nội dung Immersive sinh động
 *
 * @param {string} sourceDataNote - Nội dung bài giảng gốc đã format
 * @returns {string} Prompt hoàn chỉnh
 */
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

export { generateAndCacheCourseSource, generateAndCacheImmersiveText, buildImmersivePrompt }
