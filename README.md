# AI Tutor LMS

Hệ thống quản lý học tập tích hợp Trợ giảng AI Agent (AI Tutor LMS) hỗ trợ học tập cá nhân hóa cho sinh viên.

## Cấu trúc dự án

- `/server`: Node.js Backend Server (sử dụng Express, MongoDB và tích hợp API Gemini thông qua SDK `@google/generative-ai` chính thức).
- `/angular-frontend`: Angular Frontend Client (sử dụng Angular 18+, Standalone Components, Signals và RxJS để quản lý State bất đồng bộ).

## Hướng dẫn cài đặt & Khởi chạy nhanh

### 1. Khởi chạy Backend Server
1. Truy cập thư mục server: 
   ```bash
   cd server
   ```
2. Tạo tệp `.env` dựa theo mẫu `.env.example` và điền khóa API:
   - `GEMINI_API_KEY`: API Key của Google Gemini.
   - `MONGODB_URI`: URL kết nối cơ sở dữ liệu MongoDB.
   - `OPENROUTER_API_KEY`: API Key của OpenRouter (nếu có dùng mô hình ngoài).
3. Cài đặt thư viện:
   ```bash
   npm install
   ```
4. Khởi chạy server:
   ```bash
   npm start
   ```
   *Server sẽ chạy tại: `http://localhost:3001`*

### 2. Khởi chạy Angular Frontend
1. Truy cập thư mục frontend:
   ```bash
   cd angular-frontend
   ```
2. Cài đặt thư viện:
   ```bash
   npm install
   ```
3. Khởi chạy client:
   ```bash
   npm start
   ```
   *Ứng dụng sẽ chạy tại: `http://localhost:4200`*
