export type Role = "admin" | "teacher" | "student";
export type AcademicLevel = "UG" | "PG" | "PHD";

export const COLLEGE_EMAIL_DOMAIN = "mitsgwl.ac.in";

export interface DepartmentDTO {
  id: string;
  name: string;
  code: string;
}

export interface ProgramDTO {
  id: string;
  name: string;
  code: string;
  level: AcademicLevel;
  departmentId: string;
  departmentName: string;
  durationSemesters: number;
}

export interface AcademicSpaceDTO {
  id: string;
  level: AcademicLevel;
  departmentId: string;
  departmentName: string;
  programId: string;
  programName: string;
  semester: number;
  label: string;
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  enrollmentNo: string | null;
  role: Role;
  hasPassword: boolean;
  academicLevel: AcademicLevel | null;
  departmentId: string | null;
  programId: string | null;
  semester: number | null;
  active: boolean;
  createdAt: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  programId: string | null;
  semester: number | null;
}

export const LEVEL_LABEL: Record<AcademicLevel, string> = {
  UG: "Undergraduate",
  PG: "Postgraduate",
  PHD: "PhD",
};

export interface SubjectDTO {
  id: string;
  code: string;
  name: string;
  programId: string;
  programName?: string;
  semester: number;
  credits?: number;
  departmentId?: string;
  chapters?: string[];
}

export type DocumentType =
  | "unit_notes"
  | "chapter_notes"
  | "topic_notes"
  | "lab_manual"
  | "assignment"
  | "reference_material"
  | "practice_material"
  | "pyq"
  | "practice_question"
  | "book"
  | "other";

export interface AcademicDocumentDTO {
  id: string;
  title: string;
  description: string;
  documentType: DocumentType;
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  chapterName?: string;
  unitNo?: number;
  year?: number; // for PYQs
  fileUrl?: string;
  fileName: string;
  fileType: "pdf" | "docx" | "pptx" | "txt" | "link" | "other";
  fileSize?: string;
  contentText?: string; // extracted or provided text for AI grounding
  programId: string;
  programName?: string;
  semester: number;
  uploadedBy: string;
  uploaderName: string;
  createdAt: string;
  viewsCount?: number;
  downloadsCount?: number;
  isBookmarked?: boolean;
}

export type LibraryCategory =
  "Textbook" | "Reference Book" | "E-book" | "Lab Manual" | "Question Bank";

export interface LibraryBookDTO {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  category: LibraryCategory;
  departmentId?: string;
  departmentName?: string;
  programId?: string;
  programName?: string;
  semester?: number;
  subjectName?: string;
  edition?: string;
  pages?: number;
  fileUrl?: string;
  fileName?: string;
  description: string;
  isBookmarked?: boolean;
  recentlyViewedAt?: string;
}

export type QuestionType = "mcq" | "true_false" | "short_answer" | "subjective";

export interface QuizQuestionDTO {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[]; // for MCQ and true/false
  correctAnswer?: string | number; // option index or answer string
  marks: number;
  explanation?: string;
  groundedSource?: string;
}

export interface QuizDTO {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  chapterName?: string;
  programId: string;
  programName?: string;
  semester: number;
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  maxMarks: number;
  questionsCount: number;
  createdBy: string;
  authorName: string;
  isAiGenerated?: boolean;
  createdAt: string;
  hasAttempted?: boolean;
  lastAttemptScore?: number;
}

export interface QuizDetailDTO extends QuizDTO {
  questions: QuizQuestionDTO[];
}

export interface QuizAttemptDTO {
  id: string;
  quizId: string;
  quizTitle: string;
  subjectName: string;
  studentId: string;
  studentName: string;
  enrollmentNo: string | null;
  score: number;
  maxMarks: number;
  timeTakenSeconds: number;
  submittedAt: string;
  answers: Record<string, string | number>;
  feedback?: string;
}

export type ProjectDocumentType = "synopsis" | "report" | "ppt" | "documentation" | "final_project";

export interface ProjectDocumentDTO {
  id: string;
  type: ProjectDocumentType;
  title: string;
  fileUrl: string;
  fileName: string;
  submittedAt: string;
  status: "submitted" | "approved" | "changes_requested";
  remarks?: string;
}

export interface ProjectDTO {
  id: string;
  title: string;
  description: string;
  academicYear: string;
  departmentId: string;
  departmentName?: string;
  programId: string;
  programName?: string;
  facultyGuideId: string;
  facultyGuideName: string;
  studentIds: string[];
  studentNames: string[];
  studentEnrollments: string[];
  status: "in_progress" | "review_pending" | "approved" | "completed";
  progressPercentage: number;
  facultyFeedback?: string;
  documents: ProjectDocumentDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementDTO {
  id: string;
  title: string;
  content: string;
  type: "quiz" | "notes" | "assignment" | "deadline" | "academic";
  targetProgramId?: string;
  targetProgramName?: string;
  targetSemester?: number;
  authorName: string;
  authorRole: Role;
  createdAt: string;
}

export interface AICitation {
  title: string;
  category:
    "Notes" | "Study Material" | "PYQ" | "Practice Question" | "Digital Library" | "AI Knowledge";
  documentId?: string;
  chapterOrUnit?: string;
}

export interface AIChatMessageDTO {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: AICitation[];
  createdAt: string;
}

export interface AIChatConversationDTO {
  id: string;
  title: string;
  subjectId?: string;
  subjectName?: string;
  academicContext?: string;
  messagesCount: number;
  updatedAt: string;
}

export interface StudentProgressDTO {
  totalMaterialsRead: number;
  totalQuizzesAttempted: number;
  averageQuizScore: number;
  studyStreakDays: number;
  totalAIQueries: number;
  subjectProgress: {
    subjectId: string;
    subjectName: string;
    completedMaterials: number;
    totalMaterials: number;
    quizzesAttempted: number;
    averageScore: number;
    percentage: number;
  }[];
}
