// ==============================================
// Mindmap Agent
// Extracted from index.js lines 1345-1466
// Handles: Mindmap prompt creation, generation, and caching
// ==============================================

import { ai, currentModel } from '../config/ai.js'
import { readCache, writeCache } from '../services/cacheService.js'
import { getDocumentTextByLesson } from '../ragService.js'

/**
 * Tạo và cache sơ đồ tư duy (mindmap) cho bài học
 *
 * @param {Object} params
 * @param {string} params.courseId - ID khóa học
 * @param {string} params.lessonId - ID bài học
 * @param {string} params.title - Tiêu đề bài học
 * @param {Array} params.sections - Cấu trúc các chương/phần từ frontend
 * @returns {Promise<{data?: Object, error?: string, status?: number}>}
 */
async function generateAndCacheMindmap({ courseId, lessonId, title, sections }) {
    try {
        const cached = readCache('mindmap', courseId, lessonId)
        if (cached) {
            console.log(`📦 Cache hit: mindmap for ${courseId}/${lessonId}`)
            return { data: cached }
        }

        if (!process.env.OPENROUTER_API_KEY) {
            return { error: 'OPENROUTER_API_KEY is not configured', status: 500 }
        }

        const sectionsText = sections.map(s => {
            let content = `## ${s.heading}\n`
            if (s.text) content += s.text + '\n'
            if (s.list) content += s.list.map(item => `- ${item}`).join('\n') + '\n'
            return content
        }).join('\n')

        // Tự động kiểm tra xem bài học này có tài liệu upload trong hệ thống chưa
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
            return { error: 'AI trả về định dạng sai', status: 500 }
        }

        // Cache the result
        writeCache('mindmap', courseId, lessonId, result)
        console.log(`🧠 Generated mindmap for ${courseId}/${lessonId}`)

        return { data: result }
    } catch (err) {
        console.error('❌ Lỗi Mindmap Generator:', err)
        return { error: 'Lỗi trong quá trình tạo mindmap', status: 500 }
    }
}

export { generateAndCacheMindmap }
