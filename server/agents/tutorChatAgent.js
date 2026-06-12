// ==============================================
// Tutor Chat Agent
// Extracted from index.js lines 477-654
// Handles: AI Tutor Chat + Grading with Route-Based RAG and Function Calling
// ==============================================

import fs from 'fs'
import mammoth from 'mammoth'
import { ai, currentModel, TUTOR_CHAT_MODEL } from '../config/ai.js'
import { searchKnowledgeBase } from '../ragService.js'

/**
 * Trích xuất text từ file upload (.txt, .docx)
 * @param {string} filePath - Đường dẫn tuyệt đối tới file
 * @param {string} mimetype - MIME type của file
 * @param {string} originalname - Tên gốc của file
 * @returns {Promise<string|null>} Nội dung text hoặc null nếu không đọc được
 */
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

// ============================================
// FUNCTION CALLING (TOOLS) DEFINITION
// ============================================
const tools = [
    {
        type: "function",
        function: {
            name: "search_knowledge_base",
            description: "Tìm kiếm tài liệu bài giảng, giáo trình hoặc tài liệu môn học đã được tải lên hệ thống (RAG). Hãy gọi tool này khi sinh viên hỏi câu hỏi lý thuyết, câu hỏi chuyên môn, công thức hoặc cần giải thích một kiến thức cụ thể trong chương trình học.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "Từ khóa hoặc câu hỏi tóm tắt để tìm kiếm trong tài liệu bài giảng (ví dụ: 'giao thức HTTP là gì', 'các loại topo mạng')"
                    }
                },
                required: ["query"]
            }
        }
    }
]

// Tool handlers implementation
const toolHandlers = {
    search_knowledge_base: async ({ query }) => {
        try {
            console.log(`🔍 [Agent Tool Call] search_knowledge_base với query: "${query}"`)
            const relevantDocs = await searchKnowledgeBase(query, 3)
            if (relevantDocs && relevantDocs.length > 0) {
                console.log(`✅ [Agent Tool Call] Tìm thấy ${relevantDocs.length} đoạn kiến thức phù hợp!`)
                return '\n\nKIẾN THỨC BỔ SUNG TỪ TÀI LIỆU (KNOWLEDGE BASE):\n' +
                    relevantDocs.map((doc, i) => `[Tài liệu ${i + 1} - ${doc.filename} (Trang ${doc.page})]: ${doc.text}`).join('\n\n')
            }
            return "\n\nKhông tìm thấy thông tin phù hợp trong tài liệu của hệ thống."
        } catch (err) {
            console.error('❌ [Agent Tool Call Error] search_knowledge_base failed:', err.message)
            return `\n\nGặp lỗi khi tra cứu tài liệu: ${err.message}`
        }
    }
}

/**
 * Xử lý chat logic chung (dùng cho cả /api/chat, /api/chat-upload và /api/chat-stream)
 * Tích hợp Route-Based RAG làm fallback và Function Calling cho Agent tự chọn tool
 *
 * @param {Object} params
 * @param {Array} params.messages - Lịch sử chat [{role, content}]
 * @param {string} params.context - Context môn học
 * @param {string} [params.fileText] - Nội dung file text đính kèm
 * @param {string} [params.fileName] - Tên file đính kèm
 * @param {string} [params.imageBase64] - Ảnh dạng base64 data URI
 * @param {boolean} [params.stream=false] - Có stream response hay không
 * @returns {Promise<string|ReadableStream>} Phản hồi từ AI (hoặc stream)
 */
async function handleTutorChat({ messages, context, fileText, fileName, imageBase64, stream = false }) {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY is not configured')
    }

    // Format history for OpenRouter API
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

    // Tìm kiếm tài liệu RAG trước (chỉ dùng cho streaming hoặc làm fallback)
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
    }

    // Chọn model + system prompt theo intent
    let selectedModel = TUTOR_CHAT_MODEL
    let systemMessage = ''

    if (intent === 'GRADE') {
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
- Hãy khép lại bằng một lời nhắn tạo động lực: "Bạn thử sửa lại rồi gửi tôi xem nha!"

## KỸ NĂNG VẼ BIỂU ĐỒ:
- Flowchart, Mindmap, Sequence → dùng \`\`\`mermaid
- Biểu đồ Dữ liệu (Tròn, Cột, Line) → dùng \`\`\`echarts với JSON đúng chuẩn

---

Context môn học hiện tại: ${context || 'Không có dữ liệu ngữ cảnh cụ thể'}`

        // Nếu là streaming, chúng ta inject RAG context trực tiếp vì SSE không hỗ trợ tool calls phức tạp
        if (stream && intent === 'SEARCH' && ragContext) {
            systemMessage += `\n\nNội dung tham khảo từ tài liệu đã upload để trả lời:\n${ragContext}`
        }
    }

    const chat = ai.chats.create({
        model: selectedModel,
        config: {
            systemInstruction: systemMessage,
            temperature: intent === 'GRADE' ? 0.2 : 0.7,
        },
        history: history.length > 0 ? history : undefined,
    })

    const sendParams = { message: messageContent }

    // Nếu không phải streaming và không phải chấm điểm, kích hoạt Function Calling
    if (!stream && intent !== 'GRADE') {
        sendParams.tools = tools
        sendParams.toolHandlers = toolHandlers
    } else if (stream) {
        sendParams.stream = true
    }

    const result = await chat.sendMessage(sendParams)
    
    if (stream) {
        return result; // Trả về stream body
    }
    return result.text
}

export { handleTutorChat, extractTextFromFile }
