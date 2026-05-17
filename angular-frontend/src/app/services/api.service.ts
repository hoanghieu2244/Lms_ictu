import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  // Chat
  chat(messages: any[], context: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/chat`, { messages, context });
  }

  chatUpload(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/chat-upload`, formData);
  }

  // AI Models
  getAIModels(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/ai-models`);
  }

  setAIModel(model: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/ai-model`, { model });
  }

  // Quiz
  generateQuiz(text: string, courseId: string, mode: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/generate-quiz`, { text, courseId, mode });
  }

  getQuizHistory(courseId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/quiz-history/${courseId}`);
  }

  saveQuizHistory(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/quiz-history`, data);
  }

  // Upload
  uploadFiles(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/upload`, formData);
  }

  getUploads(params: any): Observable<any> {
    const queryParams = new URLSearchParams();
    if (params.courseId) queryParams.set('courseId', params.courseId);
    if (params.lessonId) queryParams.set('lessonId', params.lessonId);
    const qs = queryParams.toString();
    return this.http.get(`${this.baseUrl}/api/uploads${qs ? '?' + qs : ''}`);
  }

  // Immersive Text
  getImmersiveText(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/ai/immersive-text`, data);
  }

  // Course Source (AI Extracted Syllabus)
  getCourseSource(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/ai/course-source`, data);
  }

  // Mindmap
  getMindmap(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/ai/mindmap`, data);
  }
}
