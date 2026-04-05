# Hướng dẫn Tách & Tích hợp (Migration) AI Agent vào Website Chính thức

Tài liệu này hướng dẫn bạn cách "bứng" hệ thống AI Agent từ source code Demo hiện tại sang ghép vào một hệ thống Website chính thức (có thể đang code bằng PHP/Laravel, Java/Spring, Python/Django, hoặc React/Vue.js khác).

Hệ thống AI này vốn đã được thiết kế phân tách rõ ràng (Decoupled), nên việc tái sử dụng là cực kỳ dễ dàng. Bạn chia làm hai mảng độc lập: Server API (Bộ Não) và Frontend (Khung Giao tiếp).

---

## PHẦN 1: BÊ PHẦN BACKEND (BỘ NÃO AI + RAG)

Backend hiện tại (Node.js + CSDL Vector) là thứ quan trọng nhất. Nó không phụ thuộc vào giao diện hiển thị là trang web hay app di động.

### 📦 Bước 1.1: Những file cần copy
Hãy nhặt các file/thư mục sau từ dự án `lms-master` ném chung vào một góc trong server hệ thống chính của bạn (hoặc tạo một Micro-service riêng chạy Port riêng chỉ dành cho AI):

1. `server/ragService.js` (Trái tim của hệ thống đọc tài liệu RAG).
2. `server/index.js` (Chỉ cần copy các block code liên quan đến API AI, xem chi tiết bên dưới).
3. Thư mục `server/uploads/` và `server/ai-cache/` (Nơi chứa file thật và file cache sinh lời giải).
4. File `server/vector_db.json` (Nơi lưu bộ não dữ liệu).
5. File `.env` chứa `GEMINI_API_KEY`.
6. File `package.json` (Để hệ thống mới biết cài thư viện gì).

### ⚙️ Bước 1.2: Cài đặt thư viện trên Server chính
Vào thư mục server của bạn chạy:
```bash
npm install express cors multer pdf-parse mammoth @google/genai dotenv
```

### 🔗 Bước 1.3: Cắt các API quan trọng ghép vào file Routing của bạn
Server chính của bạn (không quan tâm viết bằng ngôn ngữ gì, miễn là gọi đến được Node.js AI Service này) cần duy trì 3 nhóm Endpoint sau:

**1. API Nạp tài liệu (Để Giáo viên Upload PDF/Word):**
Copy đoạn `app.post('/api/upload')`
*Chức năng:* Lưu file -> Bắn vào `processDocument` của `ragService.js` để nhúng (embed) vào hệ thống -> Xóa Cache nếu có bản mới.

**2. API Cho Tutor Chat Panel:**
Copy đoạn `app.post('/api/chat')` 
*Chức năng:* Sinh viên chat -> Server tìm RAG Context `searchKnowledgeBase()` -> Gọi Gemini Chat -> Trả về Markdown (kèm hình Mermaid/Echarts).

**3. API Tạo nội dung tự động (Immersive, Mindmap, Quizzes):**
Copy các đoạn:
- `app.post('/api/ai/immersive-text')`
- `app.post('/api/ai/mindmap')`
- `app.post('/api/generate-quiz')`
*Chức năng:* Lấy text từ Vector DB dựa theo Course/Lesson ID -> Tạo Prompt -> Trả về chuẩn JSON để Frontend tự động Parse.

> **💡 MẸO KIẾN TRÚC:**
> Nếu website chính thức của bạn viết bằng PHP, Java hay C#, thì tốt nhất hãy CỨ GIỮ NGUYÊN cụm Node.js này chạy song song thành một **Micro-service** (ví dụ chạy trên port 3001). Website chính của bạn (ví dụ port 80) chỉ cần gọi HTTP Request (RESTFul API) chọc sang port 3001 này để giao tiếp lấy dữ liệu là an toàn và xịn nhất. 

---

## PHẦN 2: BÊ PHẦN FRONTEND (GIAO DIỆN HIỂN THỊ)

Frontend là nơi sinh viên bấm nút và đọc chữ. Mảng này được viết bằng React.js. Nếu trang web chính của bạn cũng là Node/React hoặc Vue/Angular, chỉ cần lấy các Component thả vào. 

### 📦 Bước 2.1: Các Component thiết yếu cần bê sang

1. **`src/components/ChatPanel.jsx`**: Đây là cái Cửa sổ Chat góc phải dưới. Nó cực kỳ độc lập. Bê nguyên con này thả vào file Layout/Master template của hệ thống chính.
2. Nhanh chóng cài thư viện hiển thị tin nhắn AI (Markdown & Biểu đồ):
   ```bash
   npm install react-markdown remark-gfm echarts-for-react echarts mermaid
   ```
3. **`src/components/ImmersiveText.jsx`**: Trình xem văn bản động có chèn Emoji và giải thích thuật ngữ.
4. **`src/components/MindmapView.jsx`**: Code xịn vẽ Mindmap bằng component cây SVG.
5. **`src/pages/QuizPage.jsx`**: Component bài trắc nghiệm nảy form đẹp mắt.

### 🔗 Bước 2.2: Sửa Code để Liên kết dữ liệu thật (Cực kỳ quan trọng)

Hiện tại, Demo đang fetch API tới địa chỉ `http://localhost:3001`. Khi bạn mang qua hệ thống thật, bạn phải sửa lại `API_URL`.

*   Tìm trong tất cả các file React vừa copy (`ChatPanel.jsx`, `UploadPage.jsx`, ...), đổi dòng:
    `const API_URL = 'http://localhost:3001'` 
    Thành địa chỉ Domain thật của môi trường Production (ví dụ: `https://ai.truongdaihoc.edu.vn/api`).

*   **Truyền ID Môn Học và Bài Học thật:**
    Trong Demo, chúng ta đang truyền cứng các khóa học ID=1 (Chuyển đổi số), LessonID='b1'. 
    Khi gắp sang web thật, Website của bạn chắc chắn có cục State quản lý User đang xem bài nào. Bạn chỉ việc gắp đè cái ID đó (Prop) truyền thẳng vào các Component.
    ```jsx
    // Ví dụ trong trang học tập chính của Website bạn ráp Component của tôi vào:
    <ImmersiveText courseId={currentCourse.id} lessonId={currentLesson.id} />
    <ChatPanel courseId={currentCourse.id} lessonId={currentLesson.id} user={currentUser} />
    ```

---

## TÓM LƯỢC QUY TRÌNH DEPLOY CHO BẠN

1. Code cũ của web hệ thống chính **CỨ ĐỂ NGUYÊN**, đừng đụng chạm gì cả.
2. Bê nguyên thư mục Backend AI chạy lên Server thành 1 cái **Service API độc lập (Port riêng)**.
3. Bê cái khung Chat AI (`ChatPanel.jsx`) và khung bài học sinh động (`ImmersiveText`, `Mindmap`) nhúng đè vào giao diện Học tập của Sinh viên trên Web chính.
4. Trỏ URL fetch từ React thẳng tới Server API AI vừa dựng ở bước 2 kèm thông tin ID của giáo trình (ID Bài 1, ID Môn X).
5. Giáo viên cứ việc Upload PDF, phía sau server AI tự đọc, tự băm Vector và lưu lại. Sinh viên mở web lên học, gọi API AI làm việc bình thường. Hết bài!
