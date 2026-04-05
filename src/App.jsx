import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, createContext } from 'react'
import Layout from './components/Layout'
import BulletinBoard from './pages/BulletinBoard'
import Classes from './pages/Classes'
import CourseLearning from './pages/CourseLearning'
import QuizPage from './pages/QuizPage'
import QuizSelectPage from './pages/QuizSelectPage'
import Dashboard from './pages/Dashboard'
import UploadPage from './pages/UploadPage'
import './index.css'

export const AppContext = createContext()

// Mock data — danh sách lớp học phần
const COURSES = [
  { id: 1, name: 'Chuyển đổi số', code: 'K21E.CNTT.D1.K1.N05', weeks: '9/9', absences: 0, status: 'on_track' },
  { id: 2, name: 'Học máy', code: 'K21E.CNTT.D1.K1.N05', weeks: '9/9', absences: 0, status: 'on_track' },
  { id: 3, name: 'Lập trình cho thiết bị di động', code: 'K21E.CNTT.D1.K1.N05', weeks: '9/9', absences: 0, status: 'on_track' },
  { id: 4, name: 'Xử lý ảnh', code: 'K21E.CNTT.D1.K1.N05', weeks: '9/9', absences: 0, status: 'on_track' },
  { id: 5, name: 'Điện toán đám mây', code: 'K21E.CNTT.D1.K1.N05', weeks: '9/9', absences: 0, status: 'ontime' },
]

// Mock data — nội dung bài học
const LESSONS = {
  1: {
    courseName: 'Chuyển đổi số',
    courseCode: 'K21E.CNTT.D1.K1.N05',
    lessons: [
      { id: 'info', name: 'Thông tin chung', type: 'info' },
      {
        id: 'b1', name: 'Bài 1: Giới thiệu về Chuyển đổi số', completed: true, content: {
          title: 'Bài 1: Giới thiệu về Chuyển đổi số (Digital Transformation)',
          sections: [
            { heading: 'Chuyển đổi số là gì?', text: 'Chuyển đổi số (Digital Transformation) là quá trình thay đổi tổng thể và toàn diện của cá nhân, tổ chức về cách sống, cách làm việc và phương thức sản xuất dựa trên các công nghệ số. Chuyển đổi số không chỉ đơn thuần là số hóa (Digitization) hay tin học hóa (Digitalization), mà là sự thay đổi căn bản về mô hình hoạt động, văn hóa tổ chức và trải nghiệm khách hàng.' },
            { heading: 'Phân biệt Số hóa, Tin học hóa và Chuyển đổi số', list: ['Số hóa (Digitization): Chuyển đổi thông tin từ dạng vật lý sang dạng kỹ thuật số. Ví dụ: quét tài liệu giấy thành file PDF', 'Tin học hóa (Digitalization): Sử dụng công nghệ số để cải thiện quy trình hiện có. Ví dụ: dùng phần mềm quản lý thay vì sổ sách', 'Chuyển đổi số (Digital Transformation): Thay đổi toàn diện mô hình kinh doanh và tổ chức dựa trên công nghệ số. Ví dụ: xây dựng nền tảng thương mại điện tử'] },
            { heading: 'Tại sao Chuyển đổi số lại cần thiết?', list: ['Nâng cao hiệu quả hoạt động và năng suất lao động', 'Tạo ra trải nghiệm tốt hơn cho khách hàng/người dùng', 'Tăng khả năng cạnh tranh trong bối cảnh cách mạng công nghiệp 4.0', 'Thích ứng với sự thay đổi nhanh chóng của thị trường', 'Giảm chi phí vận hành và tối ưu hóa quy trình'] },
            { heading: 'Các công nghệ nền tảng của Chuyển đổi số', list: ['Trí tuệ nhân tạo (AI): Máy tính có khả năng học hỏi và ra quyết định', 'Internet vạn vật (IoT): Kết nối các thiết bị vật lý qua mạng internet', 'Dữ liệu lớn (Big Data): Thu thập, lưu trữ và phân tích lượng dữ liệu khổng lồ', 'Điện toán đám mây (Cloud Computing): Cung cấp tài nguyên CNTT qua internet', 'Blockchain: Công nghệ sổ cái phân tán, đảm bảo tính minh bạch và bảo mật'] },
          ],
          interactionPoints: [
            { id: 'cds_ip1', sectionIdx: 0, type: 'fill_blank', question: 'Chuyển đổi số (Digital _____) là quá trình thay đổi tổng thể dựa trên các công nghệ số', answer: 'Transformation', hint: 'Từ tiếng Anh', feedbackCorrect: 'Chính xác! 🎯 Digital Transformation!', feedbackIncorrect: 'Đáp án là "Transformation" — Digital Transformation 💡' },
            { id: 'cds_ip2', sectionIdx: 1, type: 'multiple_choice', question: 'Quét tài liệu giấy thành file PDF là ví dụ của quá trình nào?', options: ['Chuyển đổi số', 'Số hóa (Digitization)', 'Tin học hóa (Digitalization)', 'Tự động hóa'], correctIdx: 1, feedbackCorrect: '🎯 Đúng! Số hóa là chuyển thông tin từ vật lý sang kỹ thuật số!', feedbackIncorrect: 'Đây là Số hóa (Digitization) — chỉ chuyển dạng thông tin 📄' },
            { id: 'cds_ip3', sectionIdx: 3, type: 'true_false', question: 'IoT là viết tắt của Internet of Things (Internet vạn vật)', answer: true, feedbackCorrect: 'Đúng rồi! ✅ IoT = Internet of Things!', feedbackIncorrect: 'IoT chính là Internet of Things — Internet vạn vật 🌐' },
          ]
        }
      },
      {
        id: 'b2', name: 'Bài 2: CĐS trong doanh nghiệp', completed: true, content: {
          title: 'Bài 2: Chuyển đổi số trong doanh nghiệp',
          sections: [
            { heading: 'CĐS doanh nghiệp là gì?', text: 'Chuyển đổi số trong doanh nghiệp là việc tích hợp công nghệ kỹ thuật số vào tất cả các lĩnh vực, thay đổi căn bản cách thức hoạt động và cung cấp giá trị cho khách hàng.' },
            { heading: 'Các trụ cột của CĐS doanh nghiệp', list: ['Trải nghiệm khách hàng: Cá nhân hóa, đa kênh (omnichannel)', 'Quy trình hoạt động: Tự động hóa, tối ưu hóa', 'Mô hình kinh doanh: Đổi mới sáng tạo, nền tảng số', 'Văn hóa tổ chức: Tư duy số, học hỏi liên tục', 'Dữ liệu và phân tích: Ra quyết định dựa trên dữ liệu'] },
            { heading: 'Các giai đoạn CĐS doanh nghiệp', list: ['1. Khởi đầu: Nhận thức và lập chiến lược', '2. Thử nghiệm: Thí điểm các giải pháp số', '3. Mở rộng: Triển khai rộng các sáng kiến thành công', '4. Chuyển đổi: Thay đổi toàn diện mô hình hoạt động', '5. Tối ưu: Liên tục cải tiến và đổi mới'] },
          ],
          interactionPoints: [
            { id: 'cds_ip4', sectionIdx: 1, type: 'multiple_choice', question: 'Đâu KHÔNG phải trụ cột CĐS doanh nghiệp?', options: ['Trải nghiệm khách hàng', 'Quy trình hoạt động', 'Mua sắm phần cứng', 'Mô hình kinh doanh'], correctIdx: 2, feedbackCorrect: '🎯 Mua sắm phần cứng không phải trụ cột CĐS!', feedbackIncorrect: 'CĐS tập trung vào quy trình, trải nghiệm và mô hình 💡' },
          ]
        }
      },
      {
        id: 'b3', name: 'Bài 3: CĐS trong giáo dục', completed: true, content: {
          title: 'Bài 3: Chuyển đổi số trong giáo dục',
          sections: [
            { heading: 'CĐS giáo dục là gì?', text: 'Chuyển đổi số trong giáo dục là ứng dụng công nghệ số để thay đổi phương thức giảng dạy, học tập, quản lý nhằm nâng cao chất lượng và hiệu quả giáo dục.' },
            { heading: 'Các hình thức học tập số', list: ['E-learning: Học trực tuyến qua nền tảng web/app', 'Blended Learning: Kết hợp học trực tiếp và trực tuyến', 'MOOC: Khóa học mở trực tuyến quy mô lớn', 'Micro-learning: Học theo từng phần nhỏ, ngắn gọn', 'Gamification: Ứng dụng yếu tố trò chơi vào giảng dạy'] },
            { heading: 'Công nghệ hỗ trợ CĐS giáo dục', list: ['LMS (Learning Management System)', 'AI Tutor: Trợ lý ảo hỗ trợ học tập cá nhân hóa', 'VR/AR: Thực tế ảo/tăng cường', 'Learning Analytics: Phân tích dữ liệu học tập'] },
          ],
          interactionPoints: [
            { id: 'cds_ip6', sectionIdx: 2, type: 'multiple_choice', question: 'LMS là viết tắt của gì?', options: ['Learning Management System', 'Live Meeting Software', 'Library Management System', 'Local Messaging Service'], correctIdx: 0, feedbackCorrect: '🎯 Learning Management System!', feedbackIncorrect: 'LMS = Learning Management System — chính hệ thống bạn đang dùng! 🏫' },
          ]
        }
      },
      {
        id: 'b4', name: 'Bài 4: Trí tuệ nhân tạo (AI)', completed: true, content: {
          title: 'Bài 4: Trí tuệ nhân tạo và ứng dụng trong CĐS',
          sections: [
            { heading: 'AI là gì?', text: 'Trí tuệ nhân tạo (Artificial Intelligence) là lĩnh vực khoa học máy tính phát triển các hệ thống có khả năng thực hiện các nhiệm vụ đòi hỏi trí thông minh: nhận dạng hình ảnh, xử lý ngôn ngữ, ra quyết định, học hỏi từ kinh nghiệm.' },
            { heading: 'Các nhánh chính của AI', list: ['Machine Learning: Hệ thống tự học từ dữ liệu', 'Deep Learning: Mạng nơ-ron nhiều tầng', 'NLP: Xử lý ngôn ngữ tự nhiên', 'Computer Vision: Nhận dạng hình ảnh', 'Robotics: Robot thông minh'] },
            { heading: 'Ứng dụng AI trong CĐS', list: ['Chatbot & Trợ lý ảo: Hỗ trợ khách hàng 24/7', 'Phân tích dữ liệu: Dự đoán xu hướng kinh doanh', 'Tự động hóa quy trình (RPA)', 'Nhận dạng khuôn mặt: Bảo mật sinh trắc học', 'Y tế: Chẩn đoán bệnh qua hình ảnh'] },
          ],
          interactionPoints: [
            { id: 'cds_ip8', sectionIdx: 0, type: 'fill_blank', question: 'AI là viết tắt của Artificial _____', answer: 'Intelligence', hint: 'Trí tuệ', feedbackCorrect: 'Chính xác! 🎯 Artificial Intelligence!', feedbackIncorrect: 'AI = Artificial Intelligence — Trí tuệ nhân tạo 🤖' },
            { id: 'cds_ip9', sectionIdx: 1, type: 'true_false', question: 'Deep Learning là một nhánh con của Machine Learning', answer: true, feedbackCorrect: 'Đúng rồi! ✅ Deep Learning dùng neural networks nhiều lớp!', feedbackIncorrect: 'Deep Learning là nhánh con của ML 🧠' },
          ]
        }
      },
      {
        id: 'b5', name: 'Bài 5: Internet vạn vật (IoT)', completed: true, content: {
          title: 'Bài 5: Internet vạn vật (IoT)',
          sections: [
            { heading: 'IoT là gì?', text: 'Internet vạn vật (Internet of Things) là mạng lưới các thiết bị vật lý được gắn cảm biến, phần mềm và kết nối internet để thu thập và trao đổi dữ liệu.' },
            { heading: 'Kiến trúc IoT', list: ['Tầng Thiết bị: Cảm biến, bộ truyền động', 'Tầng Kết nối: Wi-Fi, Bluetooth, 5G, LoRaWAN', 'Tầng Nền tảng: Xử lý, lưu trữ trên cloud', 'Tầng Ứng dụng: Dashboard, điều khiển, phân tích'] },
            { heading: 'Ứng dụng IoT', list: ['Smart Home: Điều khiển đèn, điều hòa từ xa', 'Smart City: Đèn giao thông, bãi đỗ xe thông minh', 'Nông nghiệp thông minh: Cảm biến độ ẩm, tưới tự động', 'Công nghiệp 4.0: Giám sát máy móc, bảo trì dự đoán'] },
          ],
          interactionPoints: [
            { id: 'cds_ip10', sectionIdx: 0, type: 'fill_blank', question: 'IoT là viết tắt của Internet of _____', answer: 'Things', hint: 'Vạn vật', feedbackCorrect: 'Chính xác! 🎯 Internet of Things!', feedbackIncorrect: 'IoT = Internet of Things 🌐' },
          ]
        }
      },
      {
        id: 'b6', name: 'Bài 6: Dữ liệu lớn (Big Data)', completed: true, content: {
          title: 'Bài 6: Dữ liệu lớn (Big Data)',
          sections: [
            { heading: 'Big Data là gì?', text: 'Dữ liệu lớn là tập hợp dữ liệu có khối lượng cực lớn, tốc độ sinh ra nhanh và đa dạng, vượt quá khả năng xử lý của các công cụ truyền thống.' },
            { heading: 'Mô hình 5V', list: ['Volume: Khối lượng rất lớn (TB, PB)', 'Velocity: Tốc độ tạo ra và xử lý nhanh', 'Variety: Đa dạng dạng dữ liệu', 'Veracity: Độ chính xác, tin cậy', 'Value: Giá trị kinh doanh'] },
            { heading: 'Ứng dụng Big Data', list: ['Marketing: Phân tích hành vi khách hàng', 'Tài chính: Phát hiện gian lận', 'Y tế: Dự đoán dịch bệnh', 'Giáo dục: Phân tích kết quả học tập'] },
          ],
          interactionPoints: [
            { id: 'cds_ip12', sectionIdx: 1, type: 'multiple_choice', question: 'Chữ V nào KHÔNG thuộc 5V của Big Data?', options: ['Volume', 'Velocity', 'Vision', 'Veracity'], correctIdx: 2, feedbackCorrect: '🎯 Vision không thuộc 5V!', feedbackIncorrect: '5V: Volume, Velocity, Variety, Veracity, Value 📊' },
          ]
        }
      },
      {
        id: 'b7', name: 'Bài 7: Điện toán đám mây', completed: true, content: {
          title: 'Bài 7: Điện toán đám mây (Cloud Computing)',
          sections: [
            { heading: 'Cloud Computing là gì?', text: 'Điện toán đám mây là mô hình cung cấp tài nguyên CNTT (máy chủ, lưu trữ, mạng, phần mềm) qua internet theo yêu cầu, trả phí theo mức sử dụng.' },
            { heading: 'Các mô hình dịch vụ', list: ['IaaS: Cung cấp hạ tầng — máy ảo, lưu trữ. VD: AWS EC2', 'PaaS: Nền tảng phát triển ứng dụng. VD: Heroku', 'SaaS: Phần mềm qua internet. VD: Google Workspace, Zoom'] },
            { heading: 'Các mô hình triển khai', list: ['Public Cloud: Đám mây công cộng', 'Private Cloud: Đám mây riêng', 'Hybrid Cloud: Kết hợp public và private', 'Multi-Cloud: Nhiều nhà cung cấp'] },
          ],
          interactionPoints: [
            { id: 'cds_ip14', sectionIdx: 1, type: 'multiple_choice', question: 'Google Workspace, Zoom là mô hình Cloud nào?', options: ['IaaS', 'PaaS', 'SaaS', 'DaaS'], correctIdx: 2, feedbackCorrect: '🎯 SaaS — Software as a Service!', feedbackIncorrect: 'Đây là SaaS — phần mềm qua internet ☁️' },
          ]
        }
      },
      {
        id: 'b8', name: 'Bài 8: An toàn thông tin', completed: true, content: {
          title: 'Bài 8: An toàn thông tin trong CĐS',
          sections: [
            { heading: 'An toàn thông tin là gì?', text: 'An toàn thông tin là việc bảo vệ thông tin và hệ thống khỏi các mối đe dọa: truy cập trái phép, sử dụng sai mục đích, phá hoại, sửa đổi.' },
            { heading: 'Ba trụ cột CIA', list: ['Confidentiality (Bí mật): Chỉ người có quyền được truy cập', 'Integrity (Toàn vẹn): Không bị sửa đổi trái phép', 'Availability (Sẵn sàng): Luôn sẵn sàng khi cần'] },
            { heading: 'Các mối đe dọa', list: ['Phishing: Lừa đảo qua email/web giả mạo', 'Malware: Phần mềm độc hại (virus, ransomware)', 'DDoS: Tấn công từ chối dịch vụ', 'Data Breach: Rò rỉ dữ liệu'] },
          ],
          interactionPoints: [
            { id: 'cds_ip16', sectionIdx: 1, type: 'fill_blank', question: 'Ba trụ cột an toàn thông tin gọi là mô hình _____', answer: 'CIA', hint: 'Confidentiality, Integrity, Availability', feedbackCorrect: 'Chính xác! 🎯 CIA!', feedbackIncorrect: 'CIA = Confidentiality, Integrity, Availability 🔒' },
          ]
        }
      },
      {
        id: 'b9', name: 'Bài 9: Chính phủ số và xã hội số', completed: true, content: {
          title: 'Bài 9: Chính phủ số và xã hội số',
          sections: [
            { heading: 'Chính phủ số là gì?', text: 'Chính phủ số là chính phủ hoạt động dựa trên dữ liệu và công nghệ số, cung cấp dịch vụ công trực tuyến, minh bạch và hiệu quả.' },
            { heading: 'Các cấp độ Chính phủ số', list: ['Chính phủ điện tử: Tin học hóa thủ tục hành chính', 'Chính phủ mở: Dữ liệu mở, minh bạch', 'Chính phủ số: Dịch vụ số hóa toàn diện', 'Chính phủ thông minh: AI, tự động hóa, dự đoán'] },
            { heading: 'Xã hội số', list: ['Công dân số: Kỹ năng sử dụng công nghệ', 'Kinh tế số: Thương mại điện tử, fintech', 'Y tế số: Khám bệnh từ xa, hồ sơ sức khỏe điện tử', 'Giáo dục số: Học trực tuyến, thư viện số'] },
            { heading: 'CĐS tại Việt Nam', list: ['Chương trình CĐS quốc gia đến 2025, tầm nhìn 2030', 'Mục tiêu: Kinh tế số chiếm 20% GDP', 'Dịch vụ công trực tuyến mức 4', 'Cơ sở dữ liệu quốc gia về dân cư'] },
          ],
          interactionPoints: [
            { id: 'cds_ip18', sectionIdx: 1, type: 'multiple_choice', question: 'Cấp độ cao nhất của Chính phủ số?', options: ['Chính phủ điện tử', 'Chính phủ mở', 'Chính phủ số', 'Chính phủ thông minh'], correctIdx: 3, feedbackCorrect: '🎯 Chính phủ thông minh — sử dụng AI!', feedbackIncorrect: 'Smart Government là cấp cao nhất 🏛️' },
          ]
        }
      },
      { id: 'exam', name: 'Đề kiểm tra thực hành', type: 'exam' },
    ]
  },
  2: {
    courseName: 'Học máy',
    courseCode: 'K21E.CNTT.D1.K1.N05',
    lessons: [
      { id: 'info', name: 'Thông tin chung', type: 'info' },
      {
        id: 'b1', name: 'Bài 1: Giới thiệu Học máy', completed: true, content: {
          title: 'Bài 1: Giới thiệu về Học máy (Machine Learning)',
          sections: [
            { heading: 'Machine Learning là gì?', text: 'Machine Learning (Học máy) là một nhánh của Trí tuệ nhân tạo (AI), tập trung vào việc xây dựng các hệ thống có khả năng tự động học hỏi và cải thiện từ kinh nghiệm mà không cần được lập trình một cách rõ ràng.' },
            { heading: 'Các loại Học máy', list: ['Supervised Learning (Học có giám sát): Mô hình được huấn luyện trên dữ liệu có nhãn', 'Unsupervised Learning (Học không giám sát): Mô hình tìm cấu trúc ẩn trong dữ liệu không có nhãn', 'Reinforcement Learning (Học tăng cường): Agent học cách hành động tối ưu trong môi trường'] },
            { heading: 'Ứng dụng của Machine Learning', list: ['Nhận dạng giọng nói và hình ảnh', 'Hệ thống gợi ý (Recommendation Systems)', 'Xe tự hành (Self-driving Cars)', 'Phát hiện gian lận (Fraud Detection)', 'Xử lý ngôn ngữ tự nhiên (NLP)'] },
            { heading: 'Quy trình Machine Learning', list: ['1. Thu thập dữ liệu (Data Collection)', '2. Tiền xử lý dữ liệu (Data Preprocessing)', '3. Chọn mô hình (Model Selection)', '4. Huấn luyện mô hình (Training)', '5. Đánh giá mô hình (Evaluation)', '6. Triển khai (Deployment)'] },
          ],
          interactionPoints: [
            { id: 'ip1', sectionIdx: 0, type: 'fill_blank', question: 'Machine Learning là một nhánh của _____ _____ (AI)', answer: 'Trí tuệ nhân tạo', hint: 'Viết tắt là AI', feedbackCorrect: 'Chính xác! 🎯 Machine Learning là nhánh quan trọng nhất của AI!', feedbackIncorrect: 'Đáp án là "Trí tuệ nhân tạo" (Artificial Intelligence) 💡' },
            { id: 'ip2', sectionIdx: 1, type: 'true_false', question: 'Trong Supervised Learning, mô hình được huấn luyện trên dữ liệu KHÔNG có nhãn', answer: false, feedbackCorrect: 'Đúng rồi! ✅ Supervised Learning dùng dữ liệu CÓ nhãn!', feedbackIncorrect: 'Sai rồi 😊 Supervised Learning dùng dữ liệu CÓ nhãn, Unsupervised mới dùng dữ liệu KHÔNG nhãn!' },
            { id: 'ip3', sectionIdx: 3, type: 'multiple_choice', question: 'Bước đầu tiên trong quy trình Machine Learning là gì?', options: ['Chọn mô hình', 'Thu thập dữ liệu', 'Huấn luyện mô hình', 'Đánh giá mô hình'], correctIdx: 1, feedbackCorrect: 'Xuất sắc! 🎯 Thu thập dữ liệu luôn là bước đầu tiên!', feedbackIncorrect: 'Bước đầu tiên là Thu thập dữ liệu (Data Collection) vì không có dữ liệu thì không thể làm gì! 📊' },
          ]
        }
      },
      {
        id: 'b2', name: 'Bài 2: Hồi quy tuyến tính', completed: true, content: {
          title: 'Bài 2: Hồi quy tuyến tính (Linear Regression)',
          sections: [
            { heading: 'Hồi quy tuyến tính là gì?', text: 'Hồi quy tuyến tính là một phương pháp thống kê được sử dụng để mô hình hóa mối quan hệ tuyến tính giữa biến phụ thuộc (y) và một hoặc nhiều biến độc lập (x).' },
            { heading: 'Công thức', text: 'y = β₀ + β₁x₁ + β₂x₂ + ... + βₙxₙ + ε\n\nTrong đó:\n• y: biến phụ thuộc (target)\n• x₁, x₂, ..., xₙ: biến độc lập (features)\n• β₀: hệ số chặn (intercept)\n• β₁, β₂, ..., βₙ: hệ số hồi quy\n• ε: sai số' },
            { heading: 'Hàm mất mát (Loss Function)', text: 'Mean Squared Error (MSE) = (1/n) × Σ(yᵢ - ŷᵢ)²\n\nMục tiêu: Tìm các hệ số β sao cho MSE nhỏ nhất.' },
            { heading: 'Gradient Descent', text: 'Gradient Descent là thuật toán tối ưu hóa dùng để tìm giá trị tối ưu của hàm mất mát bằng cách cập nhật tham số theo hướng ngược gradient.' },
          ],
          interactionPoints: [
            { id: 'ip4', sectionIdx: 1, type: 'fill_blank', question: 'Trong công thức hồi quy tuyến tính, β₀ được gọi là hệ số _____', answer: 'chặn', hint: 'intercept', feedbackCorrect: 'Chính xác! 🎯 β₀ là hệ số chặn (intercept)!', feedbackIncorrect: 'Đáp án là "chặn" (intercept) — đây là giá trị của y khi tất cả x = 0 💡' },
            { id: 'ip5', sectionIdx: 2, type: 'multiple_choice', question: 'MSE là viết tắt của gì?', options: ['Mean Standard Error', 'Mean Squared Error', 'Maximum Squared Error', 'Minimum Squared Error'], correctIdx: 1, feedbackCorrect: '🎯 Mean Squared Error — trung bình bình phương sai số!', feedbackIncorrect: 'MSE = Mean Squared Error (Trung bình bình phương sai số) 📐' },
          ]
        }
      },
      { id: 'b3', name: 'Bài 3: Phân loại', completed: true, content: {
          title: 'Bài 3: Phân loại (Classification)',
          sections: [
            { heading: 'Phân loại là gì?', text: 'Phân loại là bài toán Supervised Learning, dự đoán nhãn rời rạc cho dữ liệu đầu vào. Ví dụ: phân loại email spam/không spam, nhận diện chữ số viết tay.' },
            { heading: 'Logistic Regression', text: 'Logistic Regression sử dụng hàm sigmoid σ(z) = 1/(1+e⁻ᶻ) để ước lượng xác suất thuộc lớp dương. Ngưỡng quyết định (threshold) thường là 0.5.' },
            { heading: 'Đánh giá mô hình phân loại', list: ['Accuracy: Tỷ lệ dự đoán đúng trên tổng số mẫu', 'Precision: Trong số dự đoán dương, bao nhiêu thực sự dương', 'Recall: Trong số thực sự dương, bao nhiêu được dự đoán đúng', 'F1-Score: Trung bình điều hòa của Precision và Recall', 'Confusion Matrix: Ma trận nhầm lẫn TP, TN, FP, FN'] },
            { heading: 'Phân loại đa lớp', list: ['One-vs-Rest (OvR): Huấn luyện N bộ phân loại nhị phân', 'One-vs-One (OvO): Huấn luyện N(N-1)/2 bộ phân loại', 'Softmax Regression: Mở rộng Logistic cho nhiều lớp'] },
          ],
          interactionPoints: [
            { id: 'ml_ip6', sectionIdx: 2, type: 'multiple_choice', question: 'F1-Score là trung bình điều hòa của?', options: ['Accuracy và Recall', 'Precision và Recall', 'Precision và Accuracy', 'Recall và Loss'], correctIdx: 1, feedbackCorrect: '🎯 F1 = 2 × (P×R)/(P+R)!', feedbackIncorrect: 'F1-Score = trung bình điều hòa của Precision và Recall 📊' },
          ]
        }
      },
      { id: 'b4', name: 'Bài 4: Cây quyết định', completed: true, content: {
          title: 'Bài 4: Cây quyết định (Decision Tree)',
          sections: [
            { heading: 'Decision Tree là gì?', text: 'Cây quyết định là mô hình học máy chia dữ liệu thành các nhánh dựa trên các điều kiện (feature). Mỗi node nội bộ là một câu hỏi, mỗi nhánh là câu trả lời, mỗi lá là nhãn dự đoán.' },
            { heading: 'Tiêu chí chia nhánh', list: ['Entropy: Đo độ hỗn loạn thông tin, H(S) = -Σ pᵢ log₂(pᵢ)', 'Information Gain: Lượng thông tin thu được khi chia theo feature', 'Gini Impurity: Xác suất phân loại sai, G = 1 - Σ pᵢ²', 'Gain Ratio: Information Gain chia cho Split Information'] },
            { heading: 'Ưu và nhược điểm', list: ['Ưu: Dễ hiểu, trực quan, không cần chuẩn hóa dữ liệu', 'Ưu: Xử lý được cả dữ liệu số và phân loại', 'Nhược: Dễ overfitting nếu cây quá sâu', 'Nhược: Nhạy cảm với thay đổi nhỏ trong dữ liệu'] },
            { heading: 'Ensemble Methods', list: ['Random Forest: Kết hợp nhiều cây quyết định, giảm overfitting', 'Gradient Boosting: XGBoost, LightGBM — xây dựng cây tuần tự', 'Bagging: Lấy mẫu ngẫu nhiên để huấn luyện nhiều cây'] },
          ],
          interactionPoints: [
            { id: 'ml_ip7', sectionIdx: 1, type: 'fill_blank', question: 'Entropy đo độ _____ thông tin của tập dữ liệu', answer: 'hỗn loạn', hint: 'Disorder', feedbackCorrect: '🎯 Entropy đo độ hỗn loạn!', feedbackIncorrect: 'Entropy đo độ hỗn loạn (disorder) của thông tin 📐' },
          ]
        }
      },
      { id: 'b5', name: 'Bài 5: SVM', completed: true, content: {
          title: 'Bài 5: Máy vector hỗ trợ (SVM)',
          sections: [
            { heading: 'SVM là gì?', text: 'Support Vector Machine (SVM) là thuật toán phân loại tìm siêu phẳng (hyperplane) tối ưu để phân tách các lớp dữ liệu với lề (margin) lớn nhất.' },
            { heading: 'Các khái niệm chính', list: ['Hyperplane: Mặt phẳng phân tách dữ liệu trong không gian n chiều', 'Support Vectors: Các điểm gần nhất với hyperplane, quyết định vị trí', 'Margin: Khoảng cách từ hyperplane tới support vectors gần nhất', 'Kernel Trick: Ánh xạ dữ liệu lên không gian cao hơn'] },
            { heading: 'Các loại Kernel', list: ['Linear Kernel: K(x,y) = xᵀy — dữ liệu phân tách tuyến tính', 'Polynomial Kernel: K(x,y) = (xᵀy + c)ᵈ', 'RBF (Gaussian) Kernel: K(x,y) = exp(-γ||x-y||²) — phổ biến nhất', 'Sigmoid Kernel: K(x,y) = tanh(αxᵀy + c)'] },
          ],
          interactionPoints: [
            { id: 'ml_ip8', sectionIdx: 0, type: 'true_false', question: 'SVM tìm hyperplane với margin nhỏ nhất', answer: false, feedbackCorrect: '✅ SVM tìm margin LỚN nhất!', feedbackIncorrect: 'SVM tìm hyperplane với margin LỚN nhất để phân tách tốt nhất 📏' },
          ]
        }
      },
      { id: 'b6', name: 'Bài 6: Neural Networks', completed: true, content: {
          title: 'Bài 6: Mạng nơ-ron nhân tạo (Neural Networks)',
          sections: [
            { heading: 'Neural Network là gì?', text: 'Mạng nơ-ron nhân tạo (ANN) mô phỏng cách hoạt động của não người, gồm các nơ-ron kết nối thành các lớp. Mỗi kết nối có trọng số (weight) được học từ dữ liệu.' },
            { heading: 'Cấu trúc mạng', list: ['Input Layer: Nhận dữ liệu đầu vào', 'Hidden Layers: Các lớp ẩn xử lý thông tin', 'Output Layer: Đưa ra kết quả dự đoán', 'Weights & Biases: Tham số được học trong quá trình huấn luyện'] },
            { heading: 'Hàm kích hoạt (Activation Functions)', list: ['Sigmoid: σ(x) = 1/(1+e⁻ˣ), output [0,1]', 'ReLU: f(x) = max(0,x) — phổ biến nhất', 'Tanh: f(x) = (eˣ-e⁻ˣ)/(eˣ+e⁻ˣ), output [-1,1]', 'Softmax: Cho xác suất đa lớp, tổng = 1'] },
            { heading: 'Backpropagation', text: 'Lan truyền ngược (Backpropagation) tính gradient của loss theo từng trọng số bằng chain rule, sau đó cập nhật trọng số theo hướng giảm loss.' },
          ],
          interactionPoints: [
            { id: 'ml_ip9', sectionIdx: 2, type: 'multiple_choice', question: 'Hàm kích hoạt phổ biến nhất trong hidden layers?', options: ['Sigmoid', 'ReLU', 'Tanh', 'Softmax'], correctIdx: 1, feedbackCorrect: '🎯 ReLU đơn giản và hiệu quả!', feedbackIncorrect: 'ReLU = max(0,x) — phổ biến nhất vì tính toán nhanh và giảm vanishing gradient 🧠' },
          ]
        }
      },
      { id: 'b7', name: 'Bài 7: Deep Learning', completed: true, content: {
          title: 'Bài 7: Học sâu (Deep Learning)',
          sections: [
            { heading: 'Deep Learning là gì?', text: 'Deep Learning là nhánh con của Machine Learning sử dụng mạng nơ-ron nhiều lớp (deep neural networks) để tự động học biểu diễn dữ liệu ở nhiều mức trừu tượng.' },
            { heading: 'Tại sao Deep Learning hiệu quả?', list: ['Tự động trích xuất đặc trưng từ dữ liệu thô', 'Hiệu quả với lượng dữ liệu rất lớn', 'GPU tăng tốc tính toán song song', 'Transfer Learning: Tái sử dụng mô hình đã huấn luyện'] },
            { heading: 'Các framework phổ biến', list: ['TensorFlow: Framework của Google, hỗ trợ production', 'PyTorch: Framework của Meta, phổ biến trong nghiên cứu', 'Keras: API cấp cao, dễ sử dụng, chạy trên TensorFlow', 'JAX: Framework mới của Google, tối ưu hóa tốc độ'] },
            { heading: 'Các kỹ thuật huấn luyện', list: ['Batch Normalization: Chuẩn hóa đầu vào mỗi lớp', 'Dropout: Tắt ngẫu nhiên neuron để giảm overfitting', 'Data Augmentation: Tăng cường dữ liệu huấn luyện', 'Learning Rate Scheduling: Điều chỉnh tốc độ học'] },
          ],
          interactionPoints: [
            { id: 'ml_ip10', sectionIdx: 2, type: 'multiple_choice', question: 'Framework nào phổ biến nhất trong nghiên cứu AI?', options: ['TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn'], correctIdx: 1, feedbackCorrect: '🎯 PyTorch được giới nghiên cứu ưa chuộng!', feedbackIncorrect: 'PyTorch phổ biến nhất trong nghiên cứu nhờ tính linh hoạt 🔬' },
          ]
        }
      },
      { id: 'b8', name: 'Bài 8: CNN', completed: true, content: {
          title: 'Bài 8: Mạng nơ-ron tích chập (CNN)',
          sections: [
            { heading: 'CNN là gì?', text: 'Convolutional Neural Network (CNN) là kiến trúc mạng nơ-ron chuyên xử lý dữ liệu có cấu trúc lưới như hình ảnh. CNN tự động học các đặc trưng thị giác từ thấp đến cao.' },
            { heading: 'Các lớp trong CNN', list: ['Convolutional Layer: Áp dụng filter/kernel để trích xuất đặc trưng', 'Pooling Layer: Giảm kích thước, giữ thông tin quan trọng (Max, Average)', 'Fully Connected Layer: Kết nối đầy đủ cho phân loại cuối cùng', 'Flatten Layer: Chuyển tensor 2D thành vector 1D'] },
            { heading: 'Kiến trúc nổi tiếng', list: ['LeNet-5: Kiến trúc CNN đầu tiên (1998)', 'AlexNet: Đột phá ImageNet 2012', 'VGGNet: Mạng rất sâu 16-19 lớp', 'ResNet: Residual connections, hàng trăm lớp', 'EfficientNet: Cân bằng depth/width/resolution'] },
          ],
          interactionPoints: [
            { id: 'ml_ip11', sectionIdx: 1, type: 'fill_blank', question: 'Lớp _____ trong CNN giúp giảm kích thước không gian', answer: 'Pooling', hint: 'Max hoặc Average', feedbackCorrect: '🎯 Pooling Layer giảm kích thước!', feedbackIncorrect: 'Pooling Layer (Max/Average) giảm kích thước không gian 🖼️' },
          ]
        }
      },
      { id: 'b9', name: 'Bài 9: RNN & NLP', completed: true, content: {
          title: 'Bài 9: Mạng hồi quy & Xử lý ngôn ngữ tự nhiên',
          sections: [
            { heading: 'RNN là gì?', text: 'Recurrent Neural Network (RNN) là mạng nơ-ron có bộ nhớ, xử lý dữ liệu tuần tự bằng cách truyền trạng thái ẩn (hidden state) từ bước trước sang bước sau.' },
            { heading: 'Các biến thể RNN', list: ['LSTM (Long Short-Term Memory): Giải quyết vanishing gradient với cell state', 'GRU (Gated Recurrent Unit): Phiên bản đơn giản hơn LSTM', 'Bidirectional RNN: Xử lý chuỗi theo cả 2 hướng', 'Attention Mechanism: Tập trung vào phần quan trọng'] },
            { heading: 'NLP — Xử lý ngôn ngữ tự nhiên', list: ['Tokenization: Tách văn bản thành token', 'Word Embedding: Word2Vec, GloVe chuyển từ thành vector', 'Transformers: Kiến trúc hiện đại nhất (BERT, GPT)', 'Các bài toán: Dịch máy, Tóm tắt, Chatbot, Phân tích cảm xúc'] },
          ],
          interactionPoints: [
            { id: 'ml_ip12', sectionIdx: 1, type: 'multiple_choice', question: 'LSTM giải quyết vấn đề gì của RNN?', options: ['Overfitting', 'Vanishing Gradient', 'Underfitting', 'Slow Training'], correctIdx: 1, feedbackCorrect: '🎯 LSTM dùng cell state để giữ thông tin dài hạn!', feedbackIncorrect: 'LSTM giải quyết vanishing gradient bằng cơ chế gate 🔗' },
          ]
        }
      },
      { id: 'exam', name: 'Đề kiểm tra thực hành', type: 'exam' },
    ]
  },
  3: {
    courseName: 'Lập trình cho thiết bị di động',
    courseCode: 'K21E.CNTT.D1.K1.N05',
    lessons: [
      { id: 'info', name: 'Thông tin chung', type: 'info' },
      { id: 'b1', name: 'Bài 1: Giới thiệu lập trình di động', completed: true, content: {
          title: 'Bài 1: Giới thiệu lập trình cho thiết bị di động',
          sections: [
            { heading: 'Lập trình di động là gì?', text: 'Lập trình di động là việc phát triển ứng dụng chạy trên các thiết bị di động (smartphone, tablet). Hai nền tảng chính: Android (Google) và iOS (Apple).' },
            { heading: 'Các phương pháp phát triển', list: ['Native: Dùng ngôn ngữ gốc (Kotlin/Java cho Android, Swift cho iOS)', 'Cross-platform: Một codebase cho nhiều nền tảng (Flutter, React Native)', 'Hybrid: Web app đóng gói native (Ionic, Cordova)', 'Progressive Web App (PWA): Website hoạt động như app'] },
            { heading: 'Hệ sinh thái Android vs iOS', list: ['Android: Mã nguồn mở, đa dạng thiết bị, Google Play Store', 'iOS: Hệ sinh thái khép kín, hiệu suất cao, App Store', 'Thị phần: Android ~72%, iOS ~27% toàn cầu', 'Ngôn ngữ: Kotlin/Java (Android), Swift/Obj-C (iOS)'] },
          ],
          interactionPoints: [
            { id: 'mob_ip1', sectionIdx: 1, type: 'multiple_choice', question: 'Flutter thuộc phương pháp phát triển nào?', options: ['Native', 'Cross-platform', 'Hybrid', 'PWA'], correctIdx: 1, feedbackCorrect: '🎯 Flutter là framework cross-platform của Google!', feedbackIncorrect: 'Flutter là cross-platform — 1 codebase cho cả Android và iOS 📱' },
          ]
        }
      },
      { id: 'b2', name: 'Bài 2: Android Studio & Kotlin', completed: true, content: {
          title: 'Bài 2: Môi trường Android Studio & Kotlin',
          sections: [
            { heading: 'Android Studio', text: 'Android Studio là IDE chính thức cho phát triển Android, dựa trên IntelliJ IDEA. Tích hợp emulator, layout editor, profiler và nhiều công cụ.' },
            { heading: 'Kotlin cơ bản', list: ['Null Safety: Hệ thống kiểu an toàn với nullable types', 'Data Classes: Tự động tạo equals, hashCode, toString', 'Extension Functions: Thêm hàm mới cho class có sẵn', 'Coroutines: Lập trình bất đồng bộ dễ dàng', 'Lambda: Hàm ẩn danh ngắn gọn'] },
            { heading: 'Cấu trúc project Android', list: ['AndroidManifest.xml: Khai báo thông tin app', 'res/: Tài nguyên (layout, drawable, values)', 'src/: Mã nguồn Kotlin/Java', 'build.gradle: Cấu hình build, dependencies'] },
          ],
          interactionPoints: [
            { id: 'mob_ip2', sectionIdx: 1, type: 'true_false', question: 'Kotlin có tính năng Null Safety giúp tránh NullPointerException', answer: true, feedbackCorrect: '✅ Null Safety là điểm mạnh của Kotlin!', feedbackIncorrect: 'Kotlin có Null Safety — giúp tránh lỗi NullPointerException 🛡️' },
          ]
        }
      },
      { id: 'b3', name: 'Bài 3: Activity & Layout', completed: true, content: {
          title: 'Bài 3: Activity và Layout trong Android',
          sections: [
            { heading: 'Activity là gì?', text: 'Activity là thành phần cơ bản của Android, đại diện cho một màn hình giao diện người dùng. Mỗi Activity có vòng đời riêng: onCreate → onStart → onResume → onPause → onStop → onDestroy.' },
            { heading: 'Các loại Layout', list: ['LinearLayout: Sắp xếp theo hàng hoặc cột', 'RelativeLayout: Vị trí tương đối với nhau', 'ConstraintLayout: Linh hoạt nhất, dùng ràng buộc', 'FrameLayout: Xếp chồng các view', 'RecyclerView: Danh sách cuộn hiệu quả'] },
            { heading: 'XML vs Jetpack Compose', list: ['XML: Cách truyền thống, khai báo layout bằng XML', 'Jetpack Compose: UI toolkit hiện đại, khai báo bằng Kotlin', 'Compose ưu điểm: Ít code, preview nhanh, reactive'] },
          ],
          interactionPoints: [
            { id: 'mob_ip3', sectionIdx: 1, type: 'multiple_choice', question: 'Layout linh hoạt nhất trên Android?', options: ['LinearLayout', 'RelativeLayout', 'ConstraintLayout', 'FrameLayout'], correctIdx: 2, feedbackCorrect: '🎯 ConstraintLayout linh hoạt nhất!', feedbackIncorrect: 'ConstraintLayout dùng ràng buộc, linh hoạt và hiệu năng tốt nhất 📐' },
          ]
        }
      },
      { id: 'b4', name: 'Bài 4: Intent & Navigation', completed: true, content: {
          title: 'Bài 4: Intent và Navigation',
          sections: [
            { heading: 'Intent là gì?', text: 'Intent là cơ chế giao tiếp giữa các thành phần Android. Explicit Intent chỉ định rõ Activity đích, Implicit Intent khai báo hành động cần thực hiện.' },
            { heading: 'Truyền dữ liệu', list: ['putExtra: Gửi dữ liệu đơn giản qua Intent', 'Bundle: Gói nhiều dữ liệu gửi cùng lúc', 'Serializable/Parcelable: Gửi object phức tạp', 'ViewModel: Chia sẻ dữ liệu giữa Fragment'] },
            { heading: 'Navigation Component', list: ['NavGraph: Sơ đồ chuyển màn hình', 'NavController: Điều khiển navigation', 'Safe Args: Truyền dữ liệu type-safe giữa destinations', 'Deep Links: Mở trực tiếp màn hình cụ thể'] },
          ],
          interactionPoints: [
            { id: 'mob_ip4', sectionIdx: 0, type: 'fill_blank', question: 'Có 2 loại Intent: Explicit và _____', answer: 'Implicit', hint: 'Ngầm định', feedbackCorrect: '🎯 Explicit và Implicit Intent!', feedbackIncorrect: 'Implicit Intent không chỉ rõ Activity đích 🔗' },
          ]
        }
      },
      { id: 'b5', name: 'Bài 5: RecyclerView & Adapter', completed: true, content: {
          title: 'Bài 5: RecyclerView và Adapter Pattern',
          sections: [
            { heading: 'RecyclerView là gì?', text: 'RecyclerView hiển thị danh sách dữ liệu lớn hiệu quả bằng cách tái sử dụng (recycle) các view item đã cuộn khỏi màn hình.' },
            { heading: 'Các thành phần', list: ['Adapter: Kết nối dữ liệu với view', 'ViewHolder: Giữ tham chiếu đến các view trong item', 'LayoutManager: Quyết định cách sắp xếp (Linear, Grid, Staggered)', 'ItemDecoration: Thêm divider, spacing', 'DiffUtil: So sánh hiệu quả để cập nhật danh sách'] },
          ],
          interactionPoints: [
            { id: 'mob_ip5', sectionIdx: 0, type: 'true_false', question: 'RecyclerView tái sử dụng các view item để tiết kiệm bộ nhớ', answer: true, feedbackCorrect: '✅ Đó là lý do gọi là RecyclerView!', feedbackIncorrect: 'RecyclerView recycle view items, tiết kiệm bộ nhớ ♻️' },
          ]
        }
      },
      { id: 'b6', name: 'Bài 6: Lưu trữ dữ liệu', completed: true, content: {
          title: 'Bài 6: Lưu trữ dữ liệu trên Android',
          sections: [
            { heading: 'Các phương thức lưu trữ', list: ['SharedPreferences: Dữ liệu key-value đơn giản (settings)', 'Internal Storage: File riêng của app', 'External Storage: Bộ nhớ ngoài, chia sẻ được', 'SQLite/Room: Cơ sở dữ liệu quan hệ cục bộ', 'DataStore: Thay thế SharedPreferences hiện đại'] },
            { heading: 'Room Database', list: ['Entity: Đại diện bảng trong CSDL', 'DAO: Định nghĩa các truy vấn', 'Database: Kết nối các Entity và DAO', 'Live Data: Tự động cập nhật UI khi dữ liệu thay đổi'] },
          ],
          interactionPoints: [
            { id: 'mob_ip6', sectionIdx: 0, type: 'multiple_choice', question: 'SharedPreferences lưu dữ liệu dạng gì?', options: ['Bảng quan hệ', 'Key-Value', 'File nhị phân', 'JSON'], correctIdx: 1, feedbackCorrect: '🎯 SharedPreferences dùng key-value!', feedbackIncorrect: 'SharedPreferences lưu dạng key-value đơn giản 🔑' },
          ]
        }
      },
      { id: 'b7', name: 'Bài 7: Networking & API', completed: true, content: {
          title: 'Bài 7: Kết nối mạng và gọi API',
          sections: [
            { heading: 'HTTP & REST API', text: 'REST API dùng HTTP methods (GET, POST, PUT, DELETE) để giao tiếp client-server. Dữ liệu thường ở dạng JSON.' },
            { heading: 'Thư viện phổ biến', list: ['Retrofit: HTTP client type-safe, phổ biến nhất', 'OkHttp: HTTP client nền tảng', 'Gson/Moshi: Parse JSON thành Kotlin objects', 'Coroutines: Xử lý bất đồng bộ khi gọi API'] },
          ],
          interactionPoints: [
            { id: 'mob_ip7', sectionIdx: 1, type: 'fill_blank', question: 'Thư viện HTTP client phổ biến nhất trên Android là _____', answer: 'Retrofit', hint: 'Type-safe HTTP client', feedbackCorrect: '🎯 Retrofit — thư viện HTTP phổ biến nhất!', feedbackIncorrect: 'Retrofit là HTTP client phổ biến và type-safe nhất 🌐' },
          ]
        }
      },
      { id: 'b8', name: 'Bài 8: MVVM Architecture', completed: true, content: {
          title: 'Bài 8: Kiến trúc MVVM',
          sections: [
            { heading: 'MVVM là gì?', text: 'Model-View-ViewModel tách biệt giao diện (View) khỏi logic nghiệp vụ (ViewModel) và dữ liệu (Model). Google khuyến nghị cho Android.' },
            { heading: 'Các thành phần', list: ['Model: Dữ liệu và business logic', 'View: Activity/Fragment hiển thị UI', 'ViewModel: Xử lý logic, giữ state qua rotation', 'Repository: Trung gian giữa ViewModel và data sources', 'LiveData/StateFlow: Observable data holder'] },
          ],
          interactionPoints: [
            { id: 'mob_ip8', sectionIdx: 0, type: 'multiple_choice', question: 'MVVM là viết tắt của?', options: ['Model-View-Manager', 'Model-View-ViewModel', 'Main-View-Version', 'Model-Visual-ViewModel'], correctIdx: 1, feedbackCorrect: '🎯 Model-View-ViewModel!', feedbackIncorrect: 'MVVM = Model-View-ViewModel 🏗️' },
          ]
        }
      },
      { id: 'b9', name: 'Bài 9: Đóng gói & Phát hành', completed: true, content: {
          title: 'Bài 9: Đóng gói và phát hành ứng dụng',
          sections: [
            { heading: 'Build & Sign APK', list: ['Debug build: Để kiểm thử', 'Release build: Tối ưu cho phát hành', 'Signing: Ký số APK/AAB bằng keystore', 'ProGuard/R8: Thu gọn và obfuscate code'] },
            { heading: 'Google Play Store', list: ['Tạo tài khoản Developer ($25 phí một lần)', 'Chuẩn bị listing: mô tả, screenshots, icon', 'Upload AAB (Android App Bundle)', 'Review process: 1-7 ngày duyệt', 'Theo dõi: Crash reports, ratings, installs'] },
          ],
          interactionPoints: [
            { id: 'mob_ip9', sectionIdx: 0, type: 'true_false', question: 'AAB (Android App Bundle) là định dạng mới thay thế APK trên Play Store', answer: true, feedbackCorrect: '✅ Google ưu tiên AAB từ 2021!', feedbackIncorrect: 'AAB là định dạng chính thức cho Play Store từ 2021 📦' },
          ]
        }
      },
      { id: 'exam', name: 'Đề kiểm tra thực hành', type: 'exam' },
    ]
  },
  4: {
    courseName: 'Xử lý ảnh',
    courseCode: 'K21E.CNTT.D1.K1.N05',
    lessons: [
      { id: 'info', name: 'Thông tin chung', type: 'info' },
      { id: 'b1', name: 'Bài 1: Giới thiệu Xử lý ảnh', completed: true, content: {
          title: 'Bài 1: Giới thiệu về Xử lý ảnh số',
          sections: [
            { heading: 'Xử lý ảnh số là gì?', text: 'Xử lý ảnh số (Digital Image Processing) là lĩnh vực sử dụng thuật toán máy tính để xử lý, phân tích và hiểu ảnh số. Ứng dụng rộng rãi trong y tế, an ninh, viễn thám, tự động hóa.' },
            { heading: 'Biểu diễn ảnh số', list: ['Pixel: Phần tử nhỏ nhất của ảnh', 'Ảnh xám (Grayscale): Mỗi pixel có giá trị 0-255', 'Ảnh màu (RGB): Mỗi pixel có 3 kênh Red, Green, Blue', 'Độ phân giải: Số pixel (width × height)', 'Bit depth: Số bit biểu diễn mỗi pixel (8-bit, 16-bit)'] },
            { heading: 'Thư viện OpenCV', text: 'OpenCV (Open Source Computer Vision) là thư viện xử lý ảnh phổ biến nhất, hỗ trợ Python, C++, Java. Cung cấp hàng trăm thuật toán xử lý ảnh và thị giác máy tính.' },
          ],
          interactionPoints: [
            { id: 'img_ip1', sectionIdx: 1, type: 'multiple_choice', question: 'Ảnh màu RGB có bao nhiêu kênh?', options: ['1', '2', '3', '4'], correctIdx: 2, feedbackCorrect: '🎯 RGB = Red, Green, Blue — 3 kênh!', feedbackIncorrect: 'RGB = 3 kênh: Red, Green, Blue 🎨' },
          ]
        }
      },
      { id: 'b2', name: 'Bài 2: Biến đổi mức xám', completed: true, content: {
          title: 'Bài 2: Biến đổi mức xám và Histogram',
          sections: [
            { heading: 'Biến đổi mức xám', list: ['Negative: Đảo ngược giá trị pixel (255-pixel)', 'Log Transform: Tăng sáng vùng tối', 'Power-Law (Gamma): Điều chỉnh gamma', 'Thresholding: Phân ngưỡng nhị phân'] },
            { heading: 'Histogram', list: ['Histogram: Biểu đồ phân bố mức xám', 'Histogram Equalization: Cân bằng histogram, tăng contrast', 'CLAHE: Cân bằng histogram thích ứng cục bộ'] },
          ],
          interactionPoints: [
            { id: 'img_ip2', sectionIdx: 1, type: 'fill_blank', question: 'Kỹ thuật cân bằng _____ giúp tăng độ tương phản của ảnh', answer: 'histogram', hint: 'Biểu đồ phân bố', feedbackCorrect: '🎯 Histogram Equalization!', feedbackIncorrect: 'Histogram Equalization cân bằng phân bố mức xám 📊' },
          ]
        }
      },
      { id: 'b3', name: 'Bài 3: Lọc ảnh không gian', completed: true, content: {
          title: 'Bài 3: Lọc ảnh trong miền không gian',
          sections: [
            { heading: 'Convolution (Tích chập)', text: 'Tích chập là phép toán cơ bản, trượt kernel (ma trận nhỏ) qua ảnh để tạo ảnh kết quả. Đây là nền tảng của nhiều thuật toán lọc.' },
            { heading: 'Lọc làm mịn (Smoothing)', list: ['Mean Filter: Trung bình các pixel lân cận', 'Gaussian Filter: Trọng số Gaussian, kết quả tự nhiên hơn', 'Median Filter: Hiệu quả nhất với nhiễu muối-tiêu', 'Bilateral Filter: Làm mịn giữ biên'] },
            { heading: 'Lọc làm sắc (Sharpening)', list: ['Laplacian: Đạo hàm bậc 2, phát hiện biên', 'Unsharp Masking: Tăng chi tiết bằng cách trừ ảnh blur', 'High-pass Filter: Giữ tần số cao (chi tiết)'] },
          ],
          interactionPoints: [
            { id: 'img_ip3', sectionIdx: 1, type: 'multiple_choice', question: 'Bộ lọc nào hiệu quả nhất với nhiễu muối-tiêu?', options: ['Mean Filter', 'Gaussian Filter', 'Median Filter', 'Laplacian'], correctIdx: 2, feedbackCorrect: '🎯 Median Filter loại nhiễu muối-tiêu tốt nhất!', feedbackIncorrect: 'Median Filter thay pixel bằng giá trị trung vị — hiệu quả nhất với salt-and-pepper noise 🧂' },
          ]
        }
      },
      { id: 'b4', name: 'Bài 4: Phát hiện biên', completed: true, content: {
          title: 'Bài 4: Phát hiện biên (Edge Detection)',
          sections: [
            { heading: 'Edge Detection là gì?', text: 'Phát hiện biên tìm ranh giới giữa các vùng ảnh dựa trên sự thay đổi đột ngột của mức xám (gradient).' },
            { heading: 'Các toán tử phát hiện biên', list: ['Sobel: Tính gradient theo x và y, phổ biến', 'Prewitt: Tương tự Sobel nhưng đơn giản hơn', 'Canny: Thuật toán nhiều bước, chính xác nhất', 'Laplacian of Gaussian (LoG): Kết hợp Gaussian và Laplacian'] },
            { heading: 'Canny Edge Detector', list: ['1. Lọc Gaussian giảm nhiễu', '2. Tính gradient (Sobel)', '3. Non-Maximum Suppression: Giữ pixel biên mạnh nhất', '4. Double Thresholding: Phân ngưỡng kép', '5. Hysteresis: Kết nối biên yếu với biên mạnh'] },
          ],
          interactionPoints: [
            { id: 'img_ip4', sectionIdx: 1, type: 'multiple_choice', question: 'Thuật toán phát hiện biên chính xác nhất?', options: ['Sobel', 'Prewitt', 'Canny', 'Roberts'], correctIdx: 2, feedbackCorrect: '🎯 Canny — thuật toán nhiều bước, chính xác nhất!', feedbackIncorrect: 'Canny Edge Detector có 5 bước, cho kết quả tốt nhất 🔍' },
          ]
        }
      },
      { id: 'b5', name: 'Bài 5: Phân đoạn ảnh', completed: true, content: {
          title: 'Bài 5: Phân đoạn ảnh (Image Segmentation)',
          sections: [
            { heading: 'Phân đoạn ảnh là gì?', text: 'Phân đoạn chia ảnh thành các vùng có ý nghĩa. Là bước quan trọng trong nhận dạng đối tượng và phân tích ảnh.' },
            { heading: 'Các phương pháp', list: ['Thresholding: Otsu tự động chọn ngưỡng tối ưu', 'Region Growing: Phát triển vùng từ điểm seed', 'Watershed: Chia vùng dựa trên gradient (đường phân thủy)', 'K-Means: Phân cụm pixel theo màu sắc', 'GrabCut: Phân đoạn foreground/background tương tác'] },
          ],
          interactionPoints: [
            { id: 'img_ip5', sectionIdx: 1, type: 'fill_blank', question: 'Thuật toán _____ tự động chọn ngưỡng tối ưu để phân ngưỡng ảnh', answer: 'Otsu', hint: 'Tên nhà toán học Nhật Bản', feedbackCorrect: '🎯 Otsu thresholding!', feedbackIncorrect: 'Otsu — phương pháp phân ngưỡng tự động tối ưu 📊' },
          ]
        }
      },
      { id: 'b6', name: 'Bài 6: Biến đổi tần số', completed: true, content: {
          title: 'Bài 6: Xử lý ảnh trong miền tần số',
          sections: [
            { heading: 'Biến đổi Fourier', text: 'Discrete Fourier Transform (DFT) chuyển ảnh từ miền không gian sang miền tần số. Tần số thấp = vùng mịn, tần số cao = chi tiết và biên.' },
            { heading: 'Lọc trong miền tần số', list: ['Low-pass Filter: Giữ tần số thấp → làm mịn ảnh', 'High-pass Filter: Giữ tần số cao → phát hiện biên', 'Band-pass Filter: Giữ dải tần số cụ thể', 'Ideal, Butterworth, Gaussian: Các loại đáp ứng bộ lọc'] },
          ],
          interactionPoints: [
            { id: 'img_ip6', sectionIdx: 0, type: 'true_false', question: 'Tần số cao trong ảnh tương ứng với các chi tiết và biên', answer: true, feedbackCorrect: '✅ Đúng! Tần số cao = biên và chi tiết!', feedbackIncorrect: 'Tần số cao trong ảnh tương ứng biên, chi tiết, nhiễu 📡' },
          ]
        }
      },
      { id: 'b7', name: 'Bài 7: Hình thái học', completed: true, content: {
          title: 'Bài 7: Xử lý hình thái học (Morphology)',
          sections: [
            { heading: 'Morphological Operations', text: 'Phép toán hình thái học xử lý hình dạng trong ảnh nhị phân, sử dụng structuring element (kernel) để thay đổi hình dạng đối tượng.' },
            { heading: 'Các phép toán cơ bản', list: ['Erosion (Co): Thu nhỏ đối tượng, loại nhiễu nhỏ', 'Dilation (Giãn): Mở rộng đối tượng, lấp lỗ nhỏ', 'Opening: Erosion → Dilation, loại nhiễu', 'Closing: Dilation → Erosion, lấp lỗ trống'] },
          ],
          interactionPoints: [
            { id: 'img_ip7', sectionIdx: 1, type: 'multiple_choice', question: 'Phép Opening thực hiện theo thứ tự?', options: ['Dilation → Erosion', 'Erosion → Dilation', 'Dilation → Dilation', 'Erosion → Erosion'], correctIdx: 1, feedbackCorrect: '🎯 Opening = Erosion rồi Dilation!', feedbackIncorrect: 'Opening = Erosion → Dilation — loại nhiễu giữ kích thước 🔬' },
          ]
        }
      },
      { id: 'b8', name: 'Bài 8: Trích xuất đặc trưng', completed: true, content: {
          title: 'Bài 8: Trích xuất đặc trưng ảnh',
          sections: [
            { heading: 'Feature Extraction', text: 'Trích xuất đặc trưng rút ra thông tin quan trọng từ ảnh để nhận dạng, đối sánh và phân loại đối tượng.' },
            { heading: 'Các phương pháp', list: ['SIFT: Scale-Invariant Feature Transform, bất biến tỉ lệ', 'SURF: Speeded Up Robust Features, nhanh hơn SIFT', 'ORB: Oriented FAST and Rotated BRIEF, miễn phí', 'HOG: Histogram of Oriented Gradients, phát hiện người', 'Haar Cascades: Phát hiện khuôn mặt nhanh'] },
          ],
          interactionPoints: [
            { id: 'img_ip8', sectionIdx: 1, type: 'fill_blank', question: 'HOG là viết tắt của Histogram of Oriented _____', answer: 'Gradients', hint: 'Đạo hàm', feedbackCorrect: '🎯 HOG = Histogram of Oriented Gradients!', feedbackIncorrect: 'HOG = Histogram of Oriented Gradients — đặc trưng hướng gradient 📐' },
          ]
        }
      },
      { id: 'b9', name: 'Bài 9: Deep Learning cho ảnh', completed: true, content: {
          title: 'Bài 9: Ứng dụng Deep Learning trong Xử lý ảnh',
          sections: [
            { heading: 'CNN trong xử lý ảnh', text: 'Mạng CNN đã cách mạng hóa xử lý ảnh, vượt trội các phương pháp truyền thống trong nhận dạng, phân đoạn và tạo ảnh.' },
            { heading: 'Các bài toán', list: ['Image Classification: Phân loại ảnh (ResNet, EfficientNet)', 'Object Detection: Phát hiện vật thể (YOLO, SSD)', 'Semantic Segmentation: Phân đoạn ngữ nghĩa (U-Net, DeepLab)', 'Image Generation: Tạo ảnh (GAN, Diffusion Models)', 'Super Resolution: Tăng độ phân giải (ESRGAN)'] },
          ],
          interactionPoints: [
            { id: 'img_ip9', sectionIdx: 1, type: 'multiple_choice', question: 'YOLO dùng cho bài toán nào?', options: ['Image Classification', 'Object Detection', 'Image Generation', 'Super Resolution'], correctIdx: 1, feedbackCorrect: '🎯 YOLO = You Only Look Once — phát hiện vật thể real-time!', feedbackIncorrect: 'YOLO là thuật toán Object Detection nổi tiếng 🎯' },
          ]
        }
      },
      { id: 'exam', name: 'Đề kiểm tra thực hành', type: 'exam' },
    ]
  },
  5: {
    courseName: 'Điện toán đám mây',
    courseCode: 'K21E.CNTT.D1.K1.N05',
    lessons: [
      { id: 'info', name: 'Thông tin chung', type: 'info' },
      { id: 'b1', name: 'Bài 1: Giới thiệu Cloud Computing', completed: true, content: {
          title: 'Bài 1: Giới thiệu Điện toán đám mây',
          sections: [
            { heading: 'Cloud Computing là gì?', text: 'Điện toán đám mây là mô hình cung cấp tài nguyên CNTT (tính toán, lưu trữ, mạng) qua internet theo nhu cầu, trả phí theo mức sử dụng (pay-as-you-go).' },
            { heading: '5 đặc điểm theo NIST', list: ['On-demand self-service: Tự phục vụ theo yêu cầu', 'Broad network access: Truy cập qua mạng rộng', 'Resource pooling: Gộp tài nguyên phục vụ nhiều người', 'Rapid elasticity: Co giãn nhanh chóng', 'Measured service: Đo lường và tính phí chính xác'] },
            { heading: 'Lợi ích', list: ['Giảm chi phí đầu tư hạ tầng (CAPEX → OPEX)', 'Mở rộng linh hoạt theo nhu cầu', 'Triển khai nhanh chóng', 'Độ sẵn sàng và tin cậy cao', 'Tập trung vào kinh doanh cốt lõi'] },
          ],
          interactionPoints: [
            { id: 'cloud_ip1', sectionIdx: 1, type: 'multiple_choice', question: 'Theo NIST, Cloud Computing có bao nhiêu đặc điểm thiết yếu?', options: ['3', '4', '5', '6'], correctIdx: 2, feedbackCorrect: '🎯 NIST định nghĩa 5 đặc điểm thiết yếu!', feedbackIncorrect: 'NIST: 5 đặc điểm thiết yếu của Cloud Computing ☁️' },
          ]
        }
      },
      { id: 'b2', name: 'Bài 2: Mô hình dịch vụ', completed: true, content: {
          title: 'Bài 2: Các mô hình dịch vụ Cloud',
          sections: [
            { heading: 'IaaS - Infrastructure as a Service', text: 'Cung cấp hạ tầng ảo hóa: máy ảo, lưu trữ, mạng. Người dùng quản lý OS trở lên. VD: AWS EC2, Azure VMs, Google Compute Engine.' },
            { heading: 'PaaS - Platform as a Service', text: 'Cung cấp nền tảng để phát triển, triển khai ứng dụng. Không cần quản lý OS, middleware. VD: Heroku, Google App Engine, Azure App Service.' },
            { heading: 'SaaS - Software as a Service', text: 'Phần mềm sẵn dùng qua internet, không cần cài đặt. VD: Gmail, Zoom, Salesforce, Microsoft 365.' },
            { heading: 'Các mô hình mới', list: ['FaaS: Functions as a Service (Serverless) — AWS Lambda', 'CaaS: Containers as a Service — Kubernetes', 'DBaaS: Database as a Service — Amazon RDS', 'BaaS: Backend as a Service — Firebase'] },
          ],
          interactionPoints: [
            { id: 'cloud_ip2', sectionIdx: 3, type: 'fill_blank', question: 'AWS Lambda là ví dụ của mô hình _____ (Functions as a Service)', answer: 'FaaS', hint: 'Serverless', feedbackCorrect: '🎯 FaaS — Functions as a Service!', feedbackIncorrect: 'AWS Lambda thuộc mô hình FaaS — Serverless computing ⚡' },
          ]
        }
      },
      { id: 'b3', name: 'Bài 3: Mô hình triển khai', completed: true, content: {
          title: 'Bài 3: Các mô hình triển khai Cloud',
          sections: [
            { heading: 'Public Cloud', text: 'Tài nguyên được chia sẻ công khai, quản lý bởi nhà cung cấp (AWS, Azure, GCP). Chi phí thấp, mở rộng dễ, bảo mật phụ thuộc provider.' },
            { heading: 'Private Cloud', text: 'Hạ tầng cloud dành riêng cho một tổ chức. Kiểm soát cao, bảo mật tốt nhưng chi phí đầu tư lớn. VD: OpenStack, VMware vSphere.' },
            { heading: 'Hybrid Cloud', text: 'Kết hợp Public và Private Cloud, cho phép di chuyển workload linh hoạt. Dữ liệu nhạy cảm giữ Private, workload scale trên Public.' },
            { heading: 'Multi-Cloud', list: ['Sử dụng nhiều nhà cung cấp Cloud cùng lúc', 'Tránh vendor lock-in', 'Tận dụng dịch vụ tốt nhất mỗi nhà cung cấp', 'Tăng tính sẵn sàng và giảm rủi ro'] },
          ],
          interactionPoints: [
            { id: 'cloud_ip3', sectionIdx: 2, type: 'true_false', question: 'Hybrid Cloud kết hợp Public Cloud và Private Cloud', answer: true, feedbackCorrect: '✅ Hybrid = Public + Private!', feedbackIncorrect: 'Hybrid Cloud kết hợp cả 2 mô hình Public và Private ☁️' },
          ]
        }
      },
      { id: 'b4', name: 'Bài 4: Ảo hóa (Virtualization)', completed: true, content: {
          title: 'Bài 4: Công nghệ ảo hóa',
          sections: [
            { heading: 'Ảo hóa là gì?', text: 'Ảo hóa tạo phiên bản ảo của tài nguyên vật lý (server, storage, network). Giúp chạy nhiều OS trên một máy vật lý, tối ưu tài nguyên.' },
            { heading: 'Các loại ảo hóa', list: ['Server Virtualization: Máy ảo (VM) chạy trên hypervisor', 'Container: Ảo hóa ở mức OS (Docker, Podman)', 'Network Virtualization: SDN, virtual switches', 'Storage Virtualization: SAN, NAS ảo hóa'] },
            { heading: 'VM vs Container', list: ['VM: Full OS, nặng (GB), boot chậm, isolation cao', 'Container: Chia sẻ kernel, nhẹ (MB), khởi động nhanh', 'Docker: Nền tảng container phổ biến nhất', 'Kubernetes: Orchestration cho containers ở scale lớn'] },
          ],
          interactionPoints: [
            { id: 'cloud_ip4', sectionIdx: 2, type: 'multiple_choice', question: 'Container nhẹ hơn VM vì?', options: ['Có nhiều RAM hơn', 'Chia sẻ kernel với host OS', 'Không cần CPU', 'Chạy trên cloud'], correctIdx: 1, feedbackCorrect: '🎯 Container chia sẻ kernel, không cần full OS!', feedbackIncorrect: 'Container chia sẻ kernel với host OS nên nhẹ hơn VM rất nhiều 🐳' },
          ]
        }
      },
      { id: 'b5', name: 'Bài 5: AWS cơ bản', completed: true, content: {
          title: 'Bài 5: Amazon Web Services cơ bản',
          sections: [
            { heading: 'AWS là gì?', text: 'Amazon Web Services là nền tảng cloud lớn nhất thế giới với hơn 200 dịch vụ. Chiếm khoảng 31% thị phần cloud infrastructure toàn cầu.' },
            { heading: 'Dịch vụ core', list: ['EC2: Máy chủ ảo (Elastic Compute Cloud)', 'S3: Object Storage — lưu trữ file không giới hạn', 'RDS: Managed Database (MySQL, PostgreSQL)', 'Lambda: Serverless functions', 'VPC: Virtual Private Cloud — mạng ảo riêng'] },
            { heading: 'Bảo mật AWS', list: ['IAM: Quản lý truy cập (Identity and Access Management)', 'Security Groups: Tường lửa cho EC2', 'KMS: Mã hóa dữ liệu', 'CloudTrail: Ghi log hoạt động'] },
          ],
          interactionPoints: [
            { id: 'cloud_ip5', sectionIdx: 1, type: 'fill_blank', question: 'S3 là viết tắt của Simple Storage _____', answer: 'Service', hint: 'Dịch vụ', feedbackCorrect: '🎯 S3 = Simple Storage Service!', feedbackIncorrect: 'S3 = Simple Storage Service — lưu trữ object trên cloud ☁️' },
          ]
        }
      },
      { id: 'b6', name: 'Bài 6: Docker & Container', completed: true, content: {
          title: 'Bài 6: Docker và Container hóa',
          sections: [
            { heading: 'Docker là gì?', text: 'Docker là nền tảng mã nguồn mở để đóng gói, phân phối và chạy ứng dụng trong container. Đảm bảo ứng dụng chạy nhất quán trên mọi môi trường.' },
            { heading: 'Các khái niệm', list: ['Image: Template chỉ đọc để tạo container', 'Container: Instance đang chạy của image', 'Dockerfile: Script xây dựng image', 'Docker Compose: Quản lý nhiều container', 'Docker Hub: Registry chia sẻ images'] },
          ],
          interactionPoints: [
            { id: 'cloud_ip6', sectionIdx: 1, type: 'multiple_choice', question: 'Dockerfile dùng để?', options: ['Chạy container', 'Xây dựng image', 'Quản lý mạng', 'Lưu trữ data'], correctIdx: 1, feedbackCorrect: '🎯 Dockerfile = script xây dựng Docker image!', feedbackIncorrect: 'Dockerfile là script chứa lệnh để build Docker image 📋' },
          ]
        }
      },
      { id: 'b7', name: 'Bài 7: Kubernetes', completed: true, content: {
          title: 'Bài 7: Kubernetes (K8s)',
          sections: [
            { heading: 'Kubernetes là gì?', text: 'Kubernetes (K8s) là hệ thống mã nguồn mở điều phối container ở quy mô lớn. Tự động triển khai, mở rộng và quản lý ứng dụng container hóa.' },
            { heading: 'Kiến trúc K8s', list: ['Pod: Đơn vị nhỏ nhất, chứa 1+ containers', 'Service: Expose Pod ra mạng, load balancing', 'Deployment: Quản lý việc triển khai và rollback', 'Node: Máy vật lý hoặc ảo chạy Pods', 'Cluster: Tập hợp các Nodes'] },
          ],
          interactionPoints: [
            { id: 'cloud_ip7', sectionIdx: 1, type: 'fill_blank', question: 'Đơn vị nhỏ nhất trong Kubernetes là _____', answer: 'Pod', hint: 'Chứa 1 hoặc nhiều containers', feedbackCorrect: '🎯 Pod là đơn vị nhỏ nhất!', feedbackIncorrect: 'Pod là đơn vị nhỏ nhất trong K8s, chứa 1+ containers 📦' },
          ]
        }
      },
      { id: 'b8', name: 'Bài 8: CI/CD & DevOps', completed: true, content: {
          title: 'Bài 8: CI/CD và DevOps trên Cloud',
          sections: [
            { heading: 'DevOps là gì?', text: 'DevOps là phương pháp kết hợp Development và Operations, tự động hóa toàn bộ vòng đời phát triển phần mềm từ code đến production.' },
            { heading: 'CI/CD Pipeline', list: ['CI (Continuous Integration): Tự động build và test khi push code', 'CD (Continuous Delivery): Tự động deploy lên staging', 'CD (Continuous Deployment): Tự động deploy lên production', 'Công cụ: GitHub Actions, Jenkins, GitLab CI, AWS CodePipeline'] },
          ],
          interactionPoints: [
            { id: 'cloud_ip8', sectionIdx: 1, type: 'true_false', question: 'CI là viết tắt của Continuous Integration', answer: true, feedbackCorrect: '✅ CI = Continuous Integration!', feedbackIncorrect: 'CI = Continuous Integration — tích hợp liên tục 🔄' },
          ]
        }
      },
      { id: 'b9', name: 'Bài 9: Bảo mật Cloud', completed: true, content: {
          title: 'Bài 9: Bảo mật trên Cloud',
          sections: [
            { heading: 'Shared Responsibility Model', text: 'Trách nhiệm bảo mật được chia sẻ giữa nhà cung cấp Cloud (bảo vệ hạ tầng) và khách hàng (bảo vệ dữ liệu, ứng dụng, access control).' },
            { heading: 'Best Practices', list: ['Principle of Least Privilege: Cấp quyền tối thiểu cần thiết', 'MFA: Xác thực đa yếu tố cho mọi tài khoản', 'Encryption: Mã hóa dữ liệu at-rest và in-transit', 'Monitoring: Giám sát liên tục hoạt động bất thường', 'Backup: Sao lưu định kỳ, test khôi phục'] },
          ],
          interactionPoints: [
            { id: 'cloud_ip9', sectionIdx: 0, type: 'multiple_choice', question: 'Trong Shared Responsibility Model, ai chịu trách nhiệm bảo vệ dữ liệu?', options: ['Nhà cung cấp Cloud', 'Khách hàng', 'Cả hai', 'Không ai'], correctIdx: 1, feedbackCorrect: '🎯 Khách hàng chịu trách nhiệm bảo vệ dữ liệu!', feedbackIncorrect: 'Khách hàng chịu trách nhiệm bảo vệ dữ liệu, ứng dụng và access control 🔐' },
          ]
        }
      },
      { id: 'exam', name: 'Đề kiểm tra thực hành', type: 'exam' },
    ]
  }
}

// Quiz mock data
const QUIZ_DATA = [
  { id: 1, type: 'multiple_choice', difficulty: 'easy', question: 'Machine Learning là một nhánh của:', options: ['Khoa học dữ liệu', 'Trí tuệ nhân tạo', 'Lập trình web', 'Mạng máy tính'], correctIdx: 1, explanation: 'Machine Learning (Học máy) là một nhánh quan trọng của Trí tuệ nhân tạo (AI).' },
  { id: 2, type: 'true_false', difficulty: 'easy', question: 'Supervised Learning sử dụng dữ liệu có nhãn để huấn luyện mô hình.', answer: true, explanation: 'Đúng! Supervised Learning (Học có giám sát) sử dụng dữ liệu đã được gán nhãn.' },
  { id: 3, type: 'multiple_choice', difficulty: 'medium', question: 'Phương pháp nào sau đây thuộc Unsupervised Learning?', options: ['Linear Regression', 'K-Means Clustering', 'Decision Tree', 'Logistic Regression'], correctIdx: 1, explanation: 'K-Means Clustering là một thuật toán phân cụm thuộc Unsupervised Learning.' },
  { id: 4, type: 'multiple_choice', difficulty: 'medium', question: 'Hàm mất mát MSE được tính bằng công thức nào?', options: ['Trung bình giá trị tuyệt đối sai số', 'Trung bình bình phương sai số', 'Tổng bình phương sai số', 'Căn bậc hai trung bình sai số'], correctIdx: 1, explanation: 'MSE = Mean Squared Error = (1/n) × Σ(yᵢ - ŷᵢ)²' },
  { id: 5, type: 'true_false', difficulty: 'hard', question: 'Gradient Descent luôn tìm được giá trị tối ưu toàn cục (global optimum).', answer: false, explanation: 'Sai! Gradient Descent có thể bị mắc kẹt ở cực tiểu cục bộ (local minimum), đặc biệt với các hàm không lồi.' },
  { id: 6, type: 'multiple_choice', difficulty: 'easy', question: 'Trong hồi quy tuyến tính y = β₀ + β₁x, β₀ được gọi là:', options: ['Hệ số góc', 'Hệ số chặn', 'Sai số', 'Biến phụ thuộc'], correctIdx: 1, explanation: 'β₀ là hệ số chặn (intercept) — giá trị của y khi x = 0.' },
  { id: 7, type: 'multiple_choice', difficulty: 'medium', question: 'Overfitting xảy ra khi:', options: ['Mô hình quá đơn giản', 'Mô hình quá phức tạp, học thuộc dữ liệu train', 'Dữ liệu quá nhiều', 'Learning rate quá nhỏ'], correctIdx: 1, explanation: 'Overfitting xảy ra khi mô hình quá phức tạp, "học thuộc" dữ liệu huấn luyện nhưng không tổng quát hóa được.' },
  { id: 8, type: 'true_false', difficulty: 'medium', question: 'Reinforcement Learning sử dụng cơ chế reward/punishment để huấn luyện agent.', answer: true, explanation: 'Đúng! RL sử dụng phần thưởng và hình phạt để agent học cách tối ưu hành động.' },
  { id: 9, type: 'multiple_choice', difficulty: 'hard', question: 'Kỹ thuật nào giúp giảm Overfitting?', options: ['Tăng số epoch', 'Regularization (L1/L2)', 'Giảm dữ liệu train', 'Tăng learning rate'], correctIdx: 1, explanation: 'Regularization (L1/L2) thêm penalty vào hàm mất mát để giảm độ phức tạp mô hình.' },
  { id: 10, type: 'multiple_choice', difficulty: 'easy', question: 'Bước đầu tiên trong quy trình ML là gì?', options: ['Chọn mô hình', 'Huấn luyện', 'Thu thập dữ liệu', 'Đánh giá'], correctIdx: 2, explanation: 'Thu thập dữ liệu (Data Collection) luôn là bước đầu tiên trong pipeline ML.' },
]

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const user = { name: 'Sinh viên', id: 'SV001', email: 'sinhvien@ictu.edu.vn' }

  const contextValue = {
    courses: COURSES,
    lessons: LESSONS,
    quizData: QUIZ_DATA,
    sidebarCollapsed,
    setSidebarCollapsed,
    chatOpen,
    setChatOpen,
    user,
  }

  return (
    <AppContext.Provider value={contextValue}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard/bulletin-board" replace />} />
            <Route path="dashboard/bulletin-board" element={<BulletinBoard />} />
            <Route path="dashboard/classes" element={<Classes />} />
            <Route path="dashboard/classes/learning/:courseId" element={<CourseLearning />} />
            <Route path="dashboard/quiz" element={<QuizSelectPage />} />
            <Route path="dashboard/quiz/:courseId" element={<QuizPage />} />
            <Route path="dashboard/results" element={<Dashboard />} />
            <Route path="dashboard/upload" element={<UploadPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  )
}

export default App
