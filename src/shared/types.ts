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
  enrollmentNo?: string | null;
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
  programName?: string | undefined;
  semester: number;
  credits?: number | undefined;
  departmentId?: string | undefined;
  chapters?: string[] | undefined;
  batch?: string | undefined; // e.g. "2022-2026", "Batch A", "Section 1"
  assignedTeacherId?: string | null | undefined;
  assignedTeacherName?: string | null | undefined;
  assignedTeacherEmail?: string | null | undefined;
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
  subjectCode?: string | undefined;
  chapterName?: string | undefined;
  unitNo?: number | undefined;
  year?: number | undefined; // for PYQs
  fileUrl?: string | undefined;
  fileName: string;
  fileType: "pdf" | "docx" | "pptx" | "txt" | "link" | "other";
  fileSize?: string | undefined;
  contentText?: string | undefined; // extracted or provided text for AI grounding
  programId: string;
  programName?: string | undefined;
  semester: number;
  uploadedBy: string;
  uploaderName: string;
  createdAt: string;
  viewsCount?: number | undefined;
  downloadsCount?: number | undefined;
  isBookmarked?: boolean | undefined;
}

export type LibraryCategory =
  "Textbook" | "Reference Book" | "E-book" | "Lab Manual" | "Question Bank";

export interface LibraryBookDTO {
  id: string;
  title: string;
  author: string;
  isbn?: string | undefined;
  category: LibraryCategory;
  departmentId?: string | undefined;
  departmentName?: string | undefined;
  programId?: string | undefined;
  programName?: string | undefined;
  semester?: number | undefined;
  subjectName?: string | undefined;
  edition?: string | undefined;
  pages?: number | undefined;
  fileUrl?: string | undefined;
  fileName?: string | undefined;
  description: string;
  isBookmarked?: boolean | undefined;
  recentlyViewedAt?: string | undefined;
}

export type QuestionType = "mcq" | "true_false" | "short_answer" | "subjective";

export interface QuizQuestionDTO {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[] | undefined; // for MCQ and true/false
  correctAnswer?: string | number | undefined; // option index or answer string
  marks: number;
  explanation?: string | undefined;
  groundedSource?: string | undefined;
}

export interface QuizDTO {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  chapterName?: string | undefined;
  programId: string;
  programName?: string | undefined;
  semester: number;
  startTime?: string | undefined;
  endTime?: string | undefined;
  durationMinutes: number;
  maxMarks: number;
  questionsCount: number;
  createdBy: string;
  authorName: string;
  isAiGenerated?: boolean | undefined;
  createdAt: string;
  hasAttempted?: boolean | undefined;
  lastAttemptScore?: number | undefined;
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
  feedback?: string | undefined;
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
  remarks?: string | undefined;
}

export interface ProjectDTO {
  id: string;
  title: string;
  description: string;
  academicYear: string;
  departmentId: string;
  departmentName?: string | undefined;
  programId: string;
  programName?: string | undefined;
  facultyGuideId: string;
  facultyGuideName: string;
  studentIds: string[];
  studentNames: string[];
  studentEnrollments: string[];
  status: "in_progress" | "review_pending" | "approved" | "completed";
  progressPercentage: number;
  facultyFeedback?: string | undefined;
  documents: ProjectDocumentDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementDTO {
  id: string;
  title: string;
  content: string;
  type: "quiz" | "notes" | "assignment" | "deadline" | "academic";
  targetProgramId?: string | undefined;
  targetProgramName?: string | undefined;
  targetSemester?: number | undefined;
  authorName: string;
  authorRole: Role;
  createdAt: string;
}

export interface AICitation {
  title: string;
  category:
    "Notes" | "Study Material" | "PYQ" | "Practice Question" | "Digital Library" | "AI Knowledge";
  documentId?: string | undefined;
  chapterOrUnit?: string | undefined;
}

export interface AIChatMessageDTO {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: AICitation[] | undefined;
  createdAt: string;
}

export interface AIChatConversationDTO {
  id: string;
  title: string;
  subjectId?: string | undefined;
  subjectName?: string | undefined;
  academicContext?: string | undefined;
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
