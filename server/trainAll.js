import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { GoogleGenAI } from '@google/genai'
import dotenv from 'dotenv'
import { initVectorDB, processDocument, getDocumentTextByLesson, deleteVectorsByLesson } from './ragService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

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
            if (!res.ok) throw new Error(data.error?.message || 'OpenRouter Error');
            return { text: data.choices[0].message.content };
        }
    }
};

const UPLOADS_DIR = path.join(__dirname, 'uploads')
const METADATA_FILE = path.join(UPLOADS_DIR, 'metadata.json')
const CACHE_DIR = path.join(__dirname, 'ai-cache')

const pdfParse = require('pdf-parse')
const mammoth = require('mammoth')

async function extractFullText(filePath, mimeType) {
    let fullText = ''
    
    if (mimeType === 'application/pdf') {
        const dataBuffer = fs.readFileSync(filePath)
        const data = await pdfParse(dataBuffer)
        fullText = data.text
    } else if (mimeType.includes('word') || filePath.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ path: filePath })
        fullText = result.value
    }
    
    return fullText.replace(/\s+/g, ' ').trim()
}

async function trainImmersiveText(courseId, lessonId, title, fullText) {
    console.log(`\n  📖 Training Immersive Text...`)
    
    const prompt = `Bạn là AI chuyên gia sư phạm với khả năng ĐỌC HIỂU SÂU tài liệu.

## NHIỆM VỤ: PHÂN TÍCH VÀ TRÍCH XUẤT KIẾN THỨC

### BƯỚC 1: PHÂN TÍCH CẤU TRÚC TÀI LIỆU
Đọc toàn bộ tài liệu và xác định:
- Cấu trúc chương/mục (nếu có)
- Các heading/section chính
- Mục lục (nếu có)

### BƯỚC 2: TRÍCH XUẤT KIẾN THỨC CỐT LÕI
Tìm và trích xuất:

1. **KHÁI NIỆM CHÍNH** (định nghĩa, giải thích)
   - Tên khái niệm
   - Định nghĩa chính xác từ tài liệu
   - Giải thích đơn giản

2. **PHÂN LOẠI** (nếu có)
   - Tiêu chí phân loại
   - Các loại/kinds
   - Đặc điểm mỗi loại

3. **ƯU ĐIỂM / NHƯỢC ĐIỂM** (nếu có)
   
4. **QUY TRÌNH / CÁC BƯỚC** (nếu có)
   - Các bước tuần tự
   - Điều kiện, yêu cầu

5. **CÔNG THỨC** (nếu có)
   - Công thức
   - Giải thích các thành phần

6. **VÍ DỤ MINH HỌA** (nếu có trong tài liệu)

### BƯỚC 3: CHAIN OF THOUGHT - LIỆT KÊ ĐẦU MỤC
Liệt kê TẤT CẢ các chủ đề/khái niệm tìm thấy (đánh số):
1. [Chủ đề 1]
2. [Chủ đề 2]
...

### BƯỚC 4: TẠO IMMERSIVE TEXT
- Mỗi chủ đề = 1 section
- Nội dung diễn giải dễ hiểu
- Thêm quiz cho mỗi section

---

## TÀI LIỆU CẦN PHÂN TÍCH:
Tiêu đề: ${title}
====================
${fullText}
====================

## ĐỊNH DẠNG TRẢ VỀ (JSON):
{
  "analysis": {
    "structure": ["Mục 1", "Mục 2", ...],
    "keyConcepts": ["Khái niệm A", "Khái niệm B", ...],
    "classifications": [...],
    "formulas": [...],
    "examples": [...]
  },
  "chainOfThought": {
    "summary": "Tóm tắt 2-3 câu về nội dung chính",
    "topics": [
      "1. Tên chủ đề thứ nhất",
      "2. Tên chủ đề thứ hai",
      "3. ..."
    ],
    "totalTopics": 5
  },
  "title": "Tiêu đề bài học",
  "sections": [
    {
      "heading": "Tên section (khớp với topics)",
      "content": "Nội dung chi tiết đã diễn giải (markdown: **bold**, - list)\n\nĐủ dài và chi tiết.",
      "keyPoints": ["Ý chính 1", "Ý chính 2"],
      "quiz": {
        "question": "Câu hỏi kiểm tra?",
        "options": ["A", "B", "C", "D"],
        "correctIdx": 0,
        "explanation": "Giải thích"
      }
    }
  ]
}

LƯU Ý QUAN TRỌNG:
- CHỈ trích xuất nội dung CÓ TRONG tài liệu, KHÔNG bịa thêm
- Nếu tài liệu không có phần nào (VD: không có công thức) → để mảng rỗng []
- Đảm bảo số sections KHỚP với số topics trong chainOfThought
- Ưu tiên chất lượng hơn số lượng`

    const response = await ai.models.generateContent({
        model: 'google/gemini-2.5-pro',
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
        console.error('  ❌ Lỗi parse JSON:', response.text?.substring(0, 200))
        throw new Error('AI trả về JSON không hợp lệ')
    }

    return result
}

async function trainMindmap(courseId, lessonId, title, fullText, immersiveData) {
    console.log(`  🧠 Training Mindmap...`)
    
    const topicsContext = immersiveData?.chainOfThought?.topics?.join('\n') || ''
    
    const prompt = `Bạn là AI chuyên tạo sơ đồ tư duy.

## NHIỆM VỤ: TẠO MINDMAP TỪ TÀI LIỆU

### CHAIN OF THOUGHT (dựa trên phân tích đã có):
${topicsContext}

### YÊU CẦU:
1. Node gốc: Tên bài học
2. Nhánh cấp 1: Các chủ đề chính (khớp với chain of thought)
3. Nhánh cấp 2: Khái niệm con, phân loại
4. Nhánh cấp 3+: Chi tiết, ví dụ (nếu có)

---

## TÀI LIỆU:
${fullText.substring(0, 8000)}

## ĐỊNH DẠNG TRẢ VỀ (JSON):
{
  "chainOfThought": {
    "summary": "Tóm tắt ngắn",
    "topics": ["1. Chủ đề 1", "2. Chủ đề 2", ...]
  },
  "root": {
    "label": "Tên bài",
    "children": [
      {
        "label": "Chủ đề 1",
        "children": [
          { "label": "Khái niệm A", "children": [{ "label": "Chi tiết" }] },
          { "label": "Khái niệm B" }
        ]
      }
    ]
  }
}`

    const response = await ai.models.generateContent({
        model: 'google/gemini-2.5-pro',
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
        throw new Error('AI trả về JSON không hợp lệ')
    }

    return result
}

async function trainOneFile(file) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📄 Training: ${file.originalName}`)
    console.log(`   Course: ${file.courseName}`)
    console.log(`   Lesson: ${file.lessonName}`)
    console.log(`${'='.repeat(60)}`)

    let filePath = file.path
    if (!fs.existsSync(filePath)) {
        filePath = path.join(UPLOADS_DIR, file.courseId, file.lessonId, file.storedName)
        if (!fs.existsSync(filePath)) {
            console.log(`  ⚠️ File không tồn tại, bỏ qua`)
            return { success: false, error: 'File not found' }
        }
    }

    try {
        console.log(`  📝 Đọc nội dung file...`)
        const fullText = await extractFullText(filePath, file.mimetype)
        
        if (fullText.length < 50) {
            console.log(`  ⚠️ Nội dung quá ngắn (${fullText.length} chars), bỏ qua`)
            return { success: false, error: 'Content too short' }
        }
        console.log(`  ✅ Đọc được ${fullText.length} ký tự`)

        console.log(`  🔢 Vector hóa vào DB...`)
        await deleteVectorsByLesson(file.courseId, file.lessonId)
        const chunks = await processDocument(filePath, file.originalName, file.mimetype, file.courseId, file.lessonId)
        console.log(`  ✅ Đã vector hóa ${chunks} chunks`)

        const immersiveData = await trainImmersiveText(file.courseId, file.lessonId, file.lessonName, fullText)
        console.log(`  ✅ Immersive: ${immersiveData.sections?.length || 0} sections`)
        
        const cachePath = path.join(CACHE_DIR, `immersive_${file.courseId}_${file.lessonId}.json`)
        fs.writeFileSync(cachePath, JSON.stringify(immersiveData, null, 2))
        console.log(`  💾 Saved: ${cachePath}`)

        const mindmapData = await trainMindmap(file.courseId, file.lessonId, file.lessonName, fullText, immersiveData)
        console.log(`  ✅ Mindmap: ${mindmapData.root?.children?.length || 0} nhánh chính`)
        
        const mindmapPath = path.join(CACHE_DIR, `mindmap_${file.courseId}_${file.lessonId}.json`)
        fs.writeFileSync(mindmapPath, JSON.stringify(mindmapData, null, 2))
        console.log(`  💾 Saved: ${mindmapPath}`)

        console.log(`  🎉 HOÀN THÀNH!`)
        return { success: true, chunks, sections: immersiveData.sections?.length }

    } catch (err) {
        console.error(`  ❌ Lỗi: ${err.message}`)
        return { success: false, error: err.message }
    }
}

async function main() {
    console.log('\n')
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║          🤖 AI TRAINING PIPELINE - LMS ICTU               ║')
    console.log('║                                                            ║')
    console.log('║  Quy trình:                                                ║')
    console.log('║  1. Đọc PDF/Doc → Vector DB (embedding)                   ║')
    console.log('║  2. Phân tích cấu trúc & trích xuất kiến thức             ║')
    console.log('║  3. Tạo Immersive Text (Chain of Thought)                 ║')
    console.log('║  4. Tạo Mindmap                                           ║')
    console.log('║  5. Cache để sinh viên đọc instant                        ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log('\n')

    await initVectorDB()

    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true })
    }

    if (!fs.existsSync(METADATA_FILE)) {
        console.log('❌ Không tìm thấy metadata.json')
        process.exit(1)
    }

    const metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'))
    
    const pdfFiles = metadata.filter(f => 
        f.mimetype === 'application/pdf' || 
        f.originalName?.endsWith('.docx')
    )

    console.log(`📊 Thống kê:`)
    console.log(`   - Tổng file trong metadata: ${metadata.length}`)
    console.log(`   - File cần train (PDF/Doc): ${pdfFiles.length}`)
    console.log('')

    const results = {
        total: pdfFiles.length,
        success: 0,
        failed: 0,
        details: []
    }

    for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i]
        console.log(`\n[${i + 1}/${pdfFiles.length}]`,)
        
        const result = await trainOneFile(file)
        results.details.push({
            file: file.originalName,
            course: file.courseName,
            lesson: file.lessonName,
            ...result
        })
        
        if (result.success) results.success++
        else results.failed++
    }

    console.log('\n')
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║                    📊 KẾT QUẢ TRAINING                     ║')
    console.log('╠════════════════════════════════════════════════════════════╣')
    console.log(`║  ✅ Thành công: ${results.success}/${results.total}                                      ║`)
    console.log(`║  ❌ Thất bại: ${results.failed}                                           ║`)
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log('\nChi tiết:')
    results.details.forEach((d, i) => {
        const status = d.success ? '✅' : '❌'
        console.log(`  ${status} [${i+1}] ${d.file} - ${d.course}/${d.lesson}`)
        if (d.success) {
            console.log(`      → ${d.chunks} chunks, ${d.sections} sections`)
        } else {
            console.log(`      → Error: ${d.error}`)
        }
    })
}

main().catch(console.error)
