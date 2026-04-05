# CHƯƠNG X: TỔNG QUAN PHÂN LOẠI CÁC KIẾN TRÚC RAG (RETRIEVAL-AUGMENTED GENERATION) NÂNG CAO

*Ghi chú cho Báo cáo Đồ án: Chương này đóng vai trò cơ sở lý thuyết chuyên sâu, hệ thống hóa các kỹ thuật RAG từ cơ bản đến phức tạp nhất, minh chứng cho việc sinh viên có sự tìm tòi, nghiên cứu các công nghệ AI State-of-the-Art (SOTA).*

Hệ thống RAG (Retrieval-Augmented Generation) không chỉ dừng lại ở một kiến trúc đơn lẻ mà đã tiến hóa thành một họ các mẫu thiết kế (Design Patterns) đa dạng nhằm giải quyết các bài toán đặc thù trong truy xuất và xử lý ngôn ngữ tự nhiên. 

Dựa trên các nghiên cứu mới nhất về kỹ thuật máy học và trí tuệ nhân tạo, các kiến trúc RAG hiện đại được phân loại thành 16 mẫu thiết kế cốt lõi, chia thành 4 nhóm chính như sau:

---

## 1. NHÓM 1: CÁC KIẾN TRÚC RAG CỐT LÕI (CORE ARCHITECTURES)
Nhóm này bao gồm các luồng truy xuất dữ liệu từ cơ bản đến phức tạp dựa trên mức độ can thiệp vào hành vi của mô hình ngôn ngữ lớn (LLM).

*   **1.1. Standard RAG (RAG Tiêu chuẩn):**
    Đây là nền tảng cơ bản nhất với chu trình: *Truy xuất một lần -> Sinh văn bản một lần*. Mặc dù dễ triển khai, độ trễ cực thấp, nhưng kiến trúc này tồn tại giới hạn nghiêm trọng khi đối mặt với các câu hỏi phức tạp cần tổng hợp nhiều nguồn ngữ cảnh chéo nhau (Cross-context).
*   **1.2. Hybrid RAG (RAG Lai):**
    Khắc phục điểm yếu do "mù từ khóa" của Vector Search, Hybrid RAG kết hợp song song thuật toán Tìm kiếm ngữ nghĩa (Vector Embeddings) và Tìm kiếm từ khóa truyền thống (ví dụ: BM25/Elasticsearch). Kiến trúc này giúp tăng chỉ số Recall đáng kể và hiện đang là tiêu chuẩn mặc định trong các hệ thống Production của doanh nghiệp.
*   **1.3. Recursive RAG (RAG Đệ quy):**
    Thay vì truy xuất một lần, Recursive RAG thực hiện truy xuất theo chuỗi nhiều bước. Dựa trên kết quả suy luận của bước trước, Agent sẽ quyết định nội dung cần truy xuất ở bước tiếp theo. Cực kỳ hiệu quả đối với các bài toán điều tra hoặc tổng hợp dữ kiện logic mạch lạc.
*   **1.4. Self-RAG (RAG Tự phản tính):**
    Một kiến trúc mang tính đột phá khi trao quyền chủ động cho LLM. LLM sẽ tự đánh giá (Self-reflection) câu hỏi đầu vào để quyết định: (1) Có cần gọi RAG hay không? (2) Ngữ cảnh trả về có đủ liên quan không? (3) Câu trả lời sinh ra có bị ảo giác (Hallucination) không? 

## 2. NHÓM 2: TRUY XUẤT DỰA TRÊN CẤU TRÚC TRI THỨC (KNOWLEDGE-STRUCTURING)
Nhóm này hướng tới việc tái cấu trúc dữ liệu thô thành các dạng biểu diễn tri thức bậc cao trước khi tiến hành RAG.

*   **2.1. Graph-Augmented RAG (RAG Đồ thị tri thức):**
    Kết hợp RAG với Knowledge Graph (Đồ thị tri thức). Thay vì chỉ lưu văn bản dạng Vector, hệ thống trích xuất và lưu trữ các thực thể (Entities) cùng mối quan hệ giữa chúng (Nodes & Edges). Cho phép truy vấn sâu các mối quan hệ đa tầng (Multi-hop reasoning) - tính năng được các tổ chức tài chính và y tế cực kỳ ưa chuộng.
*   **2.2. Knowledge-Enhanced RAG:**
    Sử dụng Ontology (Bản thể luận) hoặc các quy tắc logic ràng buộc mang tính biểu tượng (Symbolic Rules) kết hợp vào hệ thống RAG để ép LLM trả lời nhất quán với quy định chuyên ngành. Thường thấy trong các hệ thống pháp lý hoặc tuân thủ nội bộ doanh nghiệp.
*   **2.3. Hierarchical RAG (RAG Cấp bậc):**
    Tổ chức dữ liệu theo dạng sơ đồ cây thay vì không gian phẳng. Hệ thống sẽ truy xuất ở mức độ tóm tắt tài liệu trước, sau đó mới đi sâu vào các Chunk chi tiết bên trong tài liệu đó, giải quyết bài toán RAG trên các cuốn sách hoặc kho chứa hàng chục ngàn trang.

## 3. NHÓM 3: TỐI ƯU HÓA TRUY VẤN VÀ TRUY XUẤT (QUERY & RETRIEVAL OPTIMIZATION)
Tập trung vào khâu tiền xử lý câu hỏi của người dùng nhằm tăng độ "khớp" của Cosine Similarity.

*   **3.1. HyDE (Hypothetical Document Embeddings):**
    Thay vì Embeddings (nhúng) câu hỏi ngắn cộc lốc của người dùng để đi tìm trong CSDL, HyDE dùng LLM để... "tự tưởng tượng" ra một câu trả lời nháp (Hypothetical Answer). Sau đó, mang chính câu trả lời nháp này đi nhúng Vector. Kỹ thuật này trị tận gốc các truy vấn mơ hồ, sai chính tả hoặc cụt lủn.
*   **3.2. Query-Transforming RAG (Chuyển đổi truy vấn):**
    Sử dụng một LLM nhỏ chặn trước để Viết lại (Rewrite), Mở rộng (Expand) hoặc Phân rã (Decompose) một câu hỏi phức tạp thành nhiều câu hỏi nhỏ. Theo nhiều báo cáo, kỹ thuật này mang lại hiệu quả cải thiện RAG cao hơn việc đổ tiền rèn luyện (Fine-Tuning) một mô hình Embeddings mới.
*   **3.3. Multi-Query RAG:**
    Sinh ra nhiều biến thể của cùng một câu hỏi và thực hiện truy xuất đồng loạt. Sau đó, tập hợp tất cả ngữ cảnh (Docs) trả về, loại bỏ trùng lặp và tổng hợp kết quả cuối cùng.
*   **3.4. Small-to-Big Retrieval:**
    Cắt tài liệu thành các đoạn siêu nhỏ (Child-chunks) để Index Vector thật sự chính xác. Nhưng khi người dùng search trúng đoạn nhỏ đó, hệ thống lập tức mở rộng ngữ cảnh, trả về LLM toàn bộ đoạn lớn bọc ngoài (Parent-chunk).

## 4. NHÓM 4: BỘ NHỚ VÀ NGỮ CẢNH THEO THỜI GIAN (TEMPORAL & MEMORY CONTEXT)
Giải quyết khiếm khuyết về trí nhớ ngắn hạn và dữ liệu lỗi thời của mô hình GenAI.

*   **4.1. Memory-Augmented RAG:**
    Trang bị bộ nhớ ngoài (External Memory) cho LLM vượt quá giới hạn của Context Window (Cửa sổ ngữ cảnh) do prompt quy định. Kỹ thuật này thường được áp dụng cho các hệ thống Agentic AI (AI Tự trị), cho phép chúng "nhớ" lại sở thích, thói quen và lịch sử trò chuyện của người dùng xuyên suốt nhiều tháng trời.
*   **4.2. Streaming RAG:**
    Kiến trúc RAG tốc độ cao, được thiết kế để truy xuất trên nguồn dữ liệu thời gian thực (Log files, News Feeds, Social Media Stream). Sử dụng cơ chế Indexing dựa theo cửa sổ thời gian (Sliding Time-window Index), đảm bảo thông tin mớm cho AI luôn là tin tức "nóng" nhất tính từng giây.
*   **4.3. Conversational RAG:**
    Đặc thù hóa cho luồng Chatbot. Nó luôn luôn hợp nhất toàn bộ lịch sử trò chuyện phía trên với câu hỏi hiện tại trước khi mang đi tìm kiếm cơ sở dữ liệu.
*   **4.4. Route-based RAG:**
    Sử dụng bộ định tuyến (Semantic Router) ở ngay lớp cửa ngõ. Dựa vào ý định của người dùng, hệ thống quyết định luồng RAG nào sẽ chạy: Quét mạng nội bộ, Cào data từ Google Search, hay đơn giản gọi trực tiếp LLM không cần RAG.
*   **4.5. Pre-computed RAG:**
    Đóng gói trước (Cache) các cặp Câu hỏi - Context phổ biến trong tổ chức (Ví dụ: Câu hỏi FAQ của sinh viên về nội quy trường). Khi có truy vấn trùng lặp, tốc độ trả về đạt `O(1)`, giảm gánh nặng gọi API cho OpenAI hoặc Google.

---
**Nhận xét tích hợp Đồ án:** 
*Hệ thống LMS thông minh của chúng ta hiện đang triển khai kết hợp 3 mô hình từ danh sách trên bao gồm: **Standard RAG** (lõi cốt lõi trong `ragService.js`), **Conversational RAG** (luôn truyền Context History vào Chat Panel của `mainAgent`), và dấu ấn của **Self-RAG/Query-Transforming** thông qua các khối lệnh Prompt rẽ nhánh.*
