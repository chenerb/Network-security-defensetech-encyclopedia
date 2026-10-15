export type DocumentKind = 'lesson' | 'question' | 'answer' | 'reference';
export type ExamKind = 'section' | 'chapter' | 'challenge' | 'interview';
export type ChoiceKey = 'A' | 'B' | 'C' | 'D';

export interface Chapter {
  id: string;
  title: string;
  summary: string;
  lessonIds: string[];
  examIds: string[];
}
export interface Lesson {
  id: string;
  chapterId: string;
  title: string;
  path: string;
  description: string;
  minutes: number;
}
export interface Exam {
  id: string;
  chapterId: string;
  title: string;
  kind: ExamKind;
  lessonId: string | null;
  questionPath: string;
  answerPath: string;
  questionCount: number;
}
export interface DocumentEntry {
  path: string;
  title: string;
  kind: DocumentKind;
  chapterId: string | null;
  lessonId: string | null;
  examId: string | null;
}
export interface Catalog {
  version: 1;
  chapters: Chapter[];
  lessons: Lesson[];
  exams: Exam[];
  documents: DocumentEntry[];
}
export interface ExamQuestion {
  number: number;
  title: string;
  prompt: string;
  options: { key: ChoiceKey; label: string }[];
  answer: ChoiceKey | null;
  points: number;
  explanation: string;
  type: 'choice' | 'open';
}
export interface ExamPaper {
  id: string;
  title: string;
  kind: ExamKind;
  questionPath: string;
  answerPath: string;
  questions: ExamQuestion[];
}
export interface SearchEntry {
  path: string;
  title: string;
  text: string;
  kind: DocumentKind;
  chapterId: string | null;
}
export interface SearchResult {
  entry: SearchEntry;
  snippet: string;
  score: number;
}
export interface ExamAttempt {
  choices: Record<number, ChoiceKey>;
  notes: Record<number, string>;
  revealed: number[];
  submitted: boolean;
  updatedAt: string;
}
export interface LearningProgress {
  version: 1;
  completed: string[];
  bookmarks: string[];
  lastPath: string | null;
  attempts: Record<string, ExamAttempt>;
}
