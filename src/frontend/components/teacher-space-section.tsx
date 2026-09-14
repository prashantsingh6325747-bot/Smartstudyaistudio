import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderTree,
  Upload,
  Plus,
  BookOpen,
  FileText,
  FileQuestion,
  HelpCircle,
  Sparkles,
  Trash2,
  CheckCircle,
  Loader2,
  ChevronRight,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

import {
  listSubjects,
  listAcademicDocuments,
  uploadAcademicDocument,
  deleteAcademicDocument,
} from "@/backend/academic-content.functions";
import { createTeacherQuiz } from "@/backend/quiz.functions";
import { listPrograms, listDepartments } from "@/backend/academics.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { AcademicDocumentDTO, DocumentType, SubjectDTO, UserDTO } from "@/shared/types";

export function TeacherSpaceSection({ user }: { user: UserDTO }) {
  const queryClient = useQueryClient();

  // 12. Hierarchical Academic Space Navigation: Course -> Department -> Program -> Semester -> Subject
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<number>(3);
  const [selectedSubject, setSelectedSubject] = useState<SubjectDTO | null>(null);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);

  // 14. Automatic Context Upload Form State (auto-locked from selectedSubject!)
  const [docType, setDocType] = useState<DocumentType>("unit_notes");
  const [docTitle, setDocTitle] = useState("");
  const [docDesc, setDocDesc] = useState("");
  const [docChapter, setDocChapter] = useState("");
  const [docUnitNo, setDocUnitNo] = useState<number>(1);
  const [docYear, setDocYear] = useState<number>(2025);
  const [docFileName, setDocFileName] = useState("");
  const [docContent, setDocContent] = useState("");

  // Quiz Creator Form State
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDuration, setQuizDuration] = useState(20);
  const [quizQuestionText, setQuizQuestionText] = useState("");
  const [quizOptionA, setQuizOptionA] = useState("");
  const [quizOptionB, setQuizOptionB] = useState("");
  const [quizOptionC, setQuizOptionC] = useState("");
  const [quizOptionD, setQuizOptionD] = useState("");
  const [quizCorrectAnswer, setQuizCorrectAnswer] = useState<number>(0);

  const deptsQuery = useQuery({
    queryKey: ["depts"],
    queryFn: () => listDepartments(),
  });

  const programsQuery = useQuery({
    queryKey: ["programs"],
    queryFn: () => listPrograms(),
  });

  const subjectsQuery = useQuery({
    queryKey: ["teacher-subjects", selectedProgramId, selectedSemester],
    queryFn: () =>
      listSubjects({
        data: {
          programId: selectedProgramId || undefined,
          semester: selectedSemester,
        },
      }),
  });

  const spaceDocsQuery = useQuery({
    queryKey: ["space-docs", selectedSubject?.id],
    enabled: Boolean(selectedSubject?.id),
    queryFn: () =>
      listAcademicDocuments({
        data: {
          subjectId: selectedSubject?.id,
          programId: selectedProgramId,
          semester: selectedSemester,
        },
      }),
  });

  const uploadMutation = useMutation({
    mutationFn: uploadAcademicDocument,
    onSuccess: () => {
      toast.success("Document published to academic space!");
      setShowUploadModal(false);
      setDocTitle("");
      setDocDesc("");
      setDocContent("");
      setDocFileName("");
      queryClient.invalidateQueries({ queryKey: ["space-docs"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["study-materials"] });
      queryClient.invalidateQueries({ queryKey: ["pyqs"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to upload document");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAcademicDocument,
    onSuccess: () => {
      toast.success("Document removed.");
      queryClient.invalidateQueries({ queryKey: ["space-docs"] });
    },
  });

  const createQuizMutation = useMutation({
    mutationFn: createTeacherQuiz,
    onSuccess: () => {
      toast.success("Faculty quiz published and assigned to students!");
      setShowQuizModal(false);
      setQuizTitle("");
      setQuizQuestionText("");
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to create quiz");
    },
  });

  const departments = deptsQuery.data ?? [];
  const programs = programsQuery.data ?? [];
  const subjects = subjectsQuery.data ?? [];
  const spaceDocs = spaceDocsQuery.data ?? [];

  // Auto-select first program if empty
  if (programs.length > 0 && !selectedProgramId) {
    setSelectedProgramId(programs[0].id);
  }

  return (
    <div className="space-y-6">
      {/* Teacher Academic Navigator Bar */}
      <Card className="border-border/80 bg-card/60 backdrop-blur shadow-sm">
        <CardHeader className="p-4 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <FolderTree className="size-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              Assigned Academic Space Navigator
            </CardTitle>
            <Badge variant="outline" className="text-[10px] ml-auto">
              Faculty Workspace
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Browse through Course &gt; Department &gt; Program &gt; Semester &gt; Subject to manage
            syllabus materials.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-muted-foreground">Department</Label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-muted-foreground">
              Program / Branch
            </Label>
            <select
              value={selectedProgramId}
              onChange={(e) => {
                setSelectedProgramId(e.target.value);
                setSelectedSubject(null);
              }}
              className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `${p.code} - ` : ""}
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-muted-foreground">Semester</Label>
            <select
              value={selectedSemester}
              onChange={(e) => {
                setSelectedSemester(Number(e.target.value));
                setSelectedSubject(null);
              }}
              className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-muted-foreground">Subject</Label>
            <select
              value={selectedSubject?.id ?? ""}
              onChange={(e) => {
                const s = subjects.find((sub) => sub.id === e.target.value);
                setSelectedSubject(s || null);
              }}
              className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground font-medium"
            >
              <option value="">-- Select Subject --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code ? `${s.code}: ` : ""}
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Selected Subject Management Workspace */}
      {selectedSubject ? (
        <div className="space-y-4">
          {/* Active Space Context Banner */}
          <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary text-primary-foreground font-semibold text-xs">
                  Active Academic Space
                </Badge>
                <span className="text-sm font-bold text-foreground">
                  {selectedSubject.code ? `${selectedSubject.code} - ` : ""}
                  {selectedSubject.name}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Semester {selectedSemester} ·{" "}
                {programs.find((p) => p.id === selectedProgramId)?.name} · Automatic context locked
                for all uploads.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground font-semibold"
                onClick={() => setShowUploadModal(true)}
              >
                <Upload className="size-3.5" /> Upload Material
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1.5"
                onClick={() => setShowQuizModal(true)}
              >
                <Plus className="size-3.5" /> Assign Quiz
              </Button>
            </div>
          </div>

          {/* List of current space documents */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Documents & Content in this Subject Space ({spaceDocs.length})
            </h4>

            {spaceDocsQuery.isLoading ? (
              <div className="space-y-2">
                <div className="h-16 rounded-xl border bg-muted/30 animate-pulse" />
                <div className="h-16 rounded-xl border bg-muted/30 animate-pulse" />
              </div>
            ) : spaceDocs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                No materials currently uploaded for {selectedSubject.name}. Click "Upload Material"
                to add lecture notes, lab manuals, or PYQs.
              </div>
            ) : (
              <div className="space-y-2">
                {spaceDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card/60 hover:bg-secondary/40 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-secondary flex items-center justify-center text-primary">
                        <FileText className="size-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{doc.title}</p>
                        <p className="text-muted-foreground text-[11px]">
                          {doc.chapterName || `Unit ${doc.unitNo ?? 1}`} · {doc.fileName} (
                          {doc.fileSize}) · Uploaded on{" "}
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {doc.documentType.replace("_", " ")}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate({ data: { id: doc.id } })}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-xs text-muted-foreground">
          Select a subject from the navigator above to manage its notes, assign quizzes, and upload
          syllabus resources.
        </div>
      )}

      {/* 13 & 14. Contextual Document Upload Dialog */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-lg p-6 sm:rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Upload Material to {selectedSubject?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Context is automatically set: Semester {selectedSemester},{" "}
              {programs.find((p) => p.id === selectedProgramId)?.name}.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedSubject) return;
              uploadMutation.mutate({
                data: {
                  title: docTitle,
                  description: docDesc,
                  documentType: docType,
                  subjectId: selectedSubject.id,
                  chapterName: docChapter || `Unit ${docUnitNo}`,
                  unitNo: docUnitNo,
                  year: docYear,
                  fileName: docFileName || `${docTitle.toLowerCase().replace(/\s+/g, "_")}.pdf`,
                  contentText: docContent,
                  programId: selectedProgramId,
                  semester: selectedSemester,
                },
              });
            }}
            className="space-y-3.5 pt-2"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Document Type</Label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
                className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
              >
                <option value="unit_notes">Unit Notes</option>
                <option value="chapter_notes">Chapter Notes</option>
                <option value="topic_notes">Topic Notes</option>
                <option value="lab_manual">Lab Manual</option>
                <option value="assignment">Assignment</option>
                <option value="pyq">Previous Year Question (PYQ)</option>
                <option value="practice_question">Practice Question Bank</option>
                <option value="reference_material">Reference Material</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Title</Label>
              <Input
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g. Unit 3: Dynamic Memory & Polymorphism Handout"
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Unit Number / Chapter</Label>
                <Input
                  value={docChapter}
                  onChange={(e) => setDocChapter(e.target.value)}
                  placeholder="e.g. Unit 3"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">File Name</Label>
                <Input
                  value={docFileName}
                  onChange={(e) => setDocFileName(e.target.value)}
                  placeholder="e.g. unit3_lecture.pdf"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Document Summary</Label>
              <Input
                value={docDesc}
                onChange={(e) => setDocDesc(e.target.value)}
                placeholder="Brief description of lecture coverage"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                Content Text (Used for AI Assistant Grounding)
              </Label>
              <textarea
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                placeholder="Paste key notes, definitions, or code examples for AI Grounding..."
                rows={3}
                className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground"
              />
            </div>

            <Button
              type="submit"
              disabled={uploadMutation.isPending}
              className="w-full text-xs h-9 bg-primary text-primary-foreground font-semibold"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Publish to Students"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Teacher Quiz Creator Dialog */}
      <Dialog open={showQuizModal} onOpenChange={setShowQuizModal}>
        <DialogContent className="max-w-lg p-6 sm:rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Assign Quiz for {selectedSubject?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign tests directly to Semester {selectedSemester} students with time limits.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedSubject) return;
              createQuizMutation.mutate({
                data: {
                  title: quizTitle,
                  subjectId: selectedSubject.id,
                  programId: selectedProgramId,
                  semester: selectedSemester,
                  durationMinutes: quizDuration,
                  questions: [
                    {
                      id: "q1",
                      type: "mcq",
                      text: quizQuestionText,
                      options: [quizOptionA, quizOptionB, quizOptionC, quizOptionD],
                      correctAnswer: quizCorrectAnswer,
                      marks: 5,
                      explanation: "Standard curriculum answer definition.",
                    },
                  ],
                },
              });
            }}
            className="space-y-3.5 pt-2"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Quiz Title</Label>
              <Input
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="e.g. Mid-Term Review Quiz: Units 1-3"
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Duration (Minutes)</Label>
              <Input
                type="number"
                value={quizDuration}
                onChange={(e) => setQuizDuration(Number(e.target.value))}
                min={5}
                max={180}
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Question 1 Text</Label>
              <Input
                value={quizQuestionText}
                onChange={(e) => setQuizQuestionText(e.target.value)}
                placeholder="Enter question text here..."
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                value={quizOptionA}
                onChange={(e) => setQuizOptionA(e.target.value)}
                placeholder="Option A"
                required
                className="text-xs"
              />
              <Input
                value={quizOptionB}
                onChange={(e) => setQuizOptionB(e.target.value)}
                placeholder="Option B"
                required
                className="text-xs"
              />
              <Input
                value={quizOptionC}
                onChange={(e) => setQuizOptionC(e.target.value)}
                placeholder="Option C"
                required
                className="text-xs"
              />
              <Input
                value={quizOptionD}
                onChange={(e) => setQuizOptionD(e.target.value)}
                placeholder="Option D"
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Correct Option</Label>
              <select
                value={quizCorrectAnswer}
                onChange={(e) => setQuizCorrectAnswer(Number(e.target.value))}
                className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
              >
                <option value={0}>Option A</option>
                <option value={1}>Option B</option>
                <option value={2}>Option C</option>
                <option value={3}>Option D</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={createQuizMutation.isPending}
              className="w-full text-xs h-9 bg-primary text-primary-foreground font-semibold"
            >
              {createQuizMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Publish & Assign Quiz"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
