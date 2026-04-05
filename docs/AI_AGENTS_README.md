# LMS AI Agents Overview

Tài liệu này tóm tắt chức năng và cấu trúc của các AI Agents (Trợ lý Trí tuệ Nhân tạo) được tích hợp trong hệ thống Quản lý Học tập (LMS). 

Hệ thống sử dụng **Google Gemini API** (Mô hình: `gemini-2.5-pro`, `gemini-2.5-flash`, `text-embedding-004`) để cung cấp các luồng suy luận, sinh nội dung và truy vấn dữ liệu từ tài liệu học tập thực tế.

---

## 🏗 Kiến trúc AI tổng quan

Hệ thống AI được chia thành hai phần chính:
1. **Frontend AI Prompts (`src/agents/prompts/`)**: Các System Prompt định hướng nhân cách và cấu trúc dữ liệu cho từng loại Agent chuyên biệt.
2. **Backend AI Services (`server/`)**: Xử lý logic kết nối Gemini, tính toán Vector Database (RAG) và tạo Caching.

---

## 🤖 Danh sách các AI Agent & Chức năng

### 1. 🎓 Tutor Chat Agent (`tutorChat.md` & `server/index.js`)
* **Vai trò**: Trợ lý giải đáp thắc mắc 1-1 cho sinh viên trong suốt quá trình học.
* **Cách hoạt động**:
  - Tích hợp kỹ thuật **RAG** (Retrieval-Augmented Generation).
  - Khi sinh viên đặt câu hỏi, hệ thống sẽ chui vào tài liệu PDF/Word đã Nạp (Vector DB) để móc ra các trang liên quan nhất.
  - Từ dữ liệu đó, Tutor Agent sẽ giải đáp, kèm theo trích dẫn chính xác trang tài liệu.
  - Agent này còn có khả năng tự code Mermaid (vẽ sơ đồ UML/Flowchart) và ECharts (vẽ biểu đồ dữ liệu) ngay trong khung chat nếu sinh viên yêu cầu.

### 2. 📝 Quiz Generator Agent (`quizGenerator.md` & `server/index.js`)
* **Vai trò**: Tự động sinh ra ngân hàng câu hỏi trắc nghiệm dựa vào tài liệu bài học.
* **Cách hoạt động**:
  - Đọc toàn bộ nội dung học hoặc tài liệu bài giảng.
  - Sử dụng sức mạnh suy luận logic sâu của `gemini-2.5-pro`.
  - Phân tích và sinh ra mảng JSON chứa các câu hỏi đa dạng (Multiple Choice, True/False) được phân cấp độ (Dễ, Trung bình, Khó) đi kèm giải thích đáp án cực kỳ chi tiết.

### 3. 📖 Immersive Text Agent (`server/index.js`)
* **Vai trò**: Chuyển đổi các tài liệu học thuật khô khan thành định dạng học "Immersive" sinh động, dễ tiếp thu.
* **Cách hoạt động**: 
  - Truy xuất text trực tiếp từ bài giảng/PDF gốc trong Vector DB.
  - Dùng `gemini-2.5-flash` để tóm tắt, diễn giải các thuật ngữ khó, thêm ví dụ thực tế và các emoji sinh động.
  - Cuối mỗi phần diễn giải, Agent sẽ đính kèm 1 câu hỏi kiểm tra nhanh (Micro-quiz).

### 4. 🧠 Mindmap Generator Agent (`server/index.js`)
* **Vai trò**: Phân tích toàn bộ bài học và biến nó thành Sơ đồ tư duy trực quan.
* **Cách hoạt động**:
  - Đọc text từ tài liệu gốc.
  - Phân tách cấu trúc thành các nhánh (Root -> Chủ đề chính -> Khái niệm con -> Chi tiết).
  - Trả về JSON chuẩn xác để giao diện SVG trên Frontend vẽ ra Mindmap lật mở nhiều màu sắc.

### 5. 🎯 Slide Interactor Agent (`slideInteractor.md`)
* **Vai trò**: Agent tạo các điểm neo tương tác (Micro-activities) nhúng rải rác trong bài giảng.
* **Cách hoạt động**: Phát sinh các câu hỏi Điền khuyết (Fill the blank) giúp sinh viên không bị buồn ngủ khi đang đọc tài liệu dài.

---

## ⚙️ Công cụ hỗ trợ AI (AI Infrastructure)

### 📚 RAG Knowledge Base (`server/ragService.js`)
Là "Bộ não ghi nhớ" của toàn bộ các Agents.
- **Tiền xử lý (Parsing)**: Đọc file PDF (pdf-parse), Word (mammoth).
- **Phân mảnh (Chunking)**: Chia nhỏ hàng nghìn trang sách thành các đoạn văn ngắn 800 ký tự (kèm số trang).
- **Nhúng (Embedding)**: Dùng `text-embedding-004` chuyển chữ thành Vector đa chiều không gian.
- **Lưu trữ vĩnh viễn**: Lưu tệp Vector tại `server/vector_db.json`. 
- **Tìm kiếm tóm gọn**: Sử dụng Cosine Similarity để đối chiếu câu hỏi của người dùng và lọc ra TOP 3 đoạn trích dẫn chuẩn nhất.

### ⚡ AI Response Caching
Bảo vệ tốc độ và chi phí gọi API:
- Backend kết hợp module Caching cục bộ (lưu thành `.json` tại `server/ai-cache/`).
- Khi tính năng "Immersive" hoặc "Mindmap" đã được Agent tạo 1 lần cho Bài học X, nó sẽ được nhớ lại và gọi ra ngay lập tức ở lần kế tiếp.
- Cơ chế tự dọn dẹp (Clear): Khi Giáo viên tải lên tài liệu MỚI cho bài học X, Cache tự quét và xóa sạch những diễn giải cũ, ép AI phải đọc lại tài liệu mới nhất.

---

## 🛠 Phân tích Kỹ thuật Chuyên sâu (Dành cho Báo cáo Đồ án)

### 1. Phân tích RAG Pipeline (Retrieval-Augmented Generation)
Hệ thống AI Agent hiện tại KHÔNG sử dụng kiến thức chung chung có sẵn của mô hình ngôn ngữ (LLM), mà ứng dụng kiến trúc **RAG** để "ép" AI phải trả lời dựa trên tài liệu bài giảng gốc.

Quy trình RAG của hệ thống hoạt động theo 5 bước chuẩn mực:
1. **Data Load (Nạp dữ liệu)**: Text được trích xuất từ các định dạng file đa dạng tải lên (PDF, DOCX) thông qua các thư viện `pdf-parse`, `mammoth`.
2. **Chunking (Phân mảnh)**: Văn bản không được nhồi toàn bộ vào AI (do giới hạn ngữ cảnh - Context Window), mà được bộ Chunking cắt thành các đoạn nhỏ khoảng 1000 ký tự, có độ gối đầu (overlap) để không làm đứt gãy ý nghĩa câu.
3. **Embedding (Nhúng)**: Sử dụng mô hình `text-embedding-004` của Google. Mô hình này dịch mỗi đoạn văn bản Text thành một **Vector** (Một mảng số thực biểu diễn tọa độ định hướng trong không gian đa chiều). Các đoạn văn có ý nghĩa tương đồng sẽ có vị trí Vector gần nhau.
4. **Vector Storage (Lưu trữ)**: Tập hợp các Vector này được lưu trữ thành một "cơ sở dữ liệu Vector" (Knowledge Base) để tra cứu nhanh.
5. **Retrieval & Generation (Truy xuất & Sinh text)**: Khi User đặt câu hỏi, câu hỏi cũng được biến thành một Vector. Hệ thống dùng thuật toán **Cosine Similarity** quét trong CSDL để tìm ra `Top 3` đoạn văn bản có Vector nằm sát nhất với Vector câu hỏi. Cuối cùng, 3 đoạn văn bản này được kẹp chung với câu hỏi, gửi lên Gemini 2.5 Pro để sinh ra câu trả lời cuối cùng cực kỳ chính xác và có trích nguồn.

*\*Trong các phiên bản Advanced RAG tương lai, hệ thống có thể tích hợp thêm **Semantic Chunking** (Cắt theo cụm ngữ nghĩa) hoặc **Reranking** (Xếp hạng lại trọng số) để tăng tuyệt đối độ chính xác.*

### 2. Thiết kế Kiến trúc CSDL Lịch sử Chat & Vector: Vì sao là MongoDB Atlas?

Trong phiên bản Demo hiện tại, dữ liệu Vector đang được lưu tạm trên RAM hoặc ghi ra file `vector_db.json` (giống cơ chế của **FAISS**). Mặc dù FAISS cực nhanh để tra cứu cục bộ, nhưng nó đi kèm điểm yếu chết người khi Scale-up (Mở rộng): Toàn bộ Index phải được nạp lên RAM. Trăm ngàn file bài giảng sẽ làm máy chủ sập vì cạn RAM.

**Giải pháp đề xuất cho Production (Đưa vào Báo cáo): Chuyển đổi sang MongoDB Atlas**

Nếu triển khai nền tảng LMS này trên diện rộng cho hàng nghìn sinh viên của trường đại học, hệ thống **bắt buộc** phải sử dụng một CSDL NoSQL mạnh mẽ như **MongoDB Atlas**, vì 2 lý do cốt lõi:

*   **Lưu trữ Hội thoại (Chat History Memory)**: Agent cần có "Trí nhớ" để biết sinh viên đang chat nốt câu chuyện gì. Dữ liệu hội thoại cực kỳ rải rác, không có cấu trúc cố định và lượng Write (ghi log) diễn ra liên tục. MongoDB (BSON format) là nhà vô địch trong việc xử lý lưu chuỗi dữ liệu Chat linh hoạt này với tốc độ kinh ngạc so với SQL truyền thống (như MySQL).
*   **Atlas Vector Search**: MongoDB Atlas hiện đại đã tích hợp sẵn công cụ Search Vector. Điều này có nghĩa là ta không cần dựng thêm một server CSDL thứ 3 đắt đỏ (như Pinecone hay Qdrant). Dữ liệu người dùng, bài học, lịch sử chat và hàng vạn **Vector Embeddings** của file tài liệu đều được quy về lưu chung đồng nhất 1 chỗ trên MongoDB. Atlas sẽ tính toán Cosine Similarity trực tiếp trên ổ cứng rất tối ưu, giải phóng hoàn toàn gánh nặng RAM cho Server Node.js của chúng ta. 

