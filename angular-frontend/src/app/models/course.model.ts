export interface Course {
  id: number;
  name: string;
  code: string;
  weeks: string;
  absences: number;
  status: string;
  teacher?: string;
  phone?: string;
  credits?: number;
  semester?: string;
  progress?: number;
}

export interface Section {
  heading: string;
  text?: string;
  list?: string[];
}

export interface InteractionPoint {
  id: string;
  sectionIdx: number;
  type: 'fill_blank' | 'true_false' | 'multiple_choice';
  question: string;
  answer?: any;
  correctIdx?: number;
  options?: string[];
  hint?: string;
  feedbackCorrect: string;
  feedbackIncorrect: string;
}

export interface LessonContent {
  title: string;
  sections: Section[];
  interactionPoints?: InteractionPoint[];
}

export interface Lesson {
  id: string;
  name: string;
  type?: string;
  completed?: boolean;
  content?: LessonContent;
}

export interface CourseData {
  courseName: string;
  courseCode: string;
  lessons: Lesson[];
}

export interface QuizQuestion {
  id?: number;
  type: 'multiple_choice' | 'true_false';
  difficulty?: string;
  question: string;
  options?: string[];
  correctIdx?: number;
  answer?: boolean;
  explanation: string;
}

export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}

export interface QuizHistoryEntry {
  courseId: string;
  courseName: string;
  score: number;
  total: number;
  percent: number;
  timeTaken: number;
  date: string;
}

export interface UploadedFile {
  id: string;
  originalName: string;
  storedName: string;
  size: number;
  mimetype: string;
  courseId: string;
  courseName: string;
  lessonId: string;
  lessonName: string;
  uploadedAt: string;
  downloadUrl?: string;
}

export interface AIModel {
  id: string;
  name: string;
  desc: string;
}

export interface GradeEntry {
  stt: number;
  courseName: string;
  credits: number;
  semester: string;
  diemCC: number;
  diemTBCTN: number;
  tx1: number;
  tx2: number;
  tx3: number;
  tx4?: number;
  diemTBC: number;
  bkThiKTHP: string;
}
