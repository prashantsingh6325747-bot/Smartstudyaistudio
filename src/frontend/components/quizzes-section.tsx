import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  HelpCircle,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Loader2,
  Calendar,
  CheckCircle,
  XCircle,
  BarChart2,
} from "lucide-react";
import { toast } from "sonner";

import {
  listQuizzes,
  getQuizDetails,
  submitQuizAttempt,
  listQuizAttempts,
} from "@/backend/quiz.functions";
import { generateAIQuiz } from "@/backend/ai-assistant.functions";
import { listSubjects } from "@/backend/academic-content.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { QuizDTO, QuizDetailDTO, QuizQuestionDTO, UserDTO } from "@/shared/types";

export function QuizzesSection({ user }: { user: UserDTO }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"assigned" | "ai_generator" | "history">("assigned");

  // AI Quiz Generator State
  const [aiSubjectId, setAiSubjectId] = useState<string>("");
  const [aiSelectedChapters, setAiSelectedChapters] = useState<string[]>([]);
  const [aiCount, setAiCount] = useState<number>(5);
  const [aiDifficulty, setAiDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [aiType, setAiType] = useState<"mcq" | "true_false" | "short_answer">("mcq");

  // Active Taking Quiz State
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<QuizDetailDTO | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string | number>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [quizFinishedResult, setQuizFinishedResult] = useState<{
    score: number;
    maxMarks: number;
    feedback: string;
  } | null>(null);

  const subjectsQuery = useQuery({
    queryKey: ["subjects", user.programId, user.semester],
    queryFn: () => listSubjects({ data: {} }),
  });

  const quizzesQuery = useQuery({
    queryKey: ["quizzes", user.programId, user.semester],
    queryFn: () => listQuizzes({ data: {} }),
  });

  const attemptsQuery = useQuery({
    queryKey: ["quiz-attempts"],
    queryFn: () => listQuizAttempts({ data: {} }),
  });

  const generateMutation = useMutation({
    mutationFn: (data: {
      subjectId: string;
      chapterNames: string[];
      questionCount: number;
      difficulty: "Easy" | "Medium" | "Hard";
      quizType: "mcq" | "true_false" | "short_answer";
    }) => generateAIQuiz({ data }),
    onSuccess: (res) => {
      toast.success("AI Quiz generated successfully!");
      // Launch as playable quiz
      setActiveQuiz({
        id: "ai-" + Date.now(),
        title: res.title,
        subjectId: aiSubjectId,
        subjectName: "AI Practice Exam",
        programId: user.programId || "",
        semester: user.semester || 1,
        durationMinutes: Math.max(5, res.questions.length * 2),
        maxMarks: res.questions.reduce((a, q) => a + q.marks, 0),
        questionsCount: res.questions.length,
        createdBy: "ai",
        authorName: "MITS AI Study Tutor",
        createdAt: new Date().toISOString(),
        hasAttempted: false,
        questions: res.questions,
      });
      setActiveQuizId("ai-" + Date.now());
      setCurrentQuestionIndex(0);
      setStudentAnswers({});
      setTimeLeftSeconds(Math.max(5, res.questions.length * 2) * 60);
      setQuizFinishedResult(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to generate AI quiz");
    },
  });

  const startQuizMutation = useMutation({
    mutationFn: (id: string) => getQuizDetails({ data: { id } }),
    onSuccess: (details) => {
      setActiveQuiz(details);
      setActiveQuizId(details.id);
      setCurrentQuestionIndex(0);
      setStudentAnswers({});
      setTimeLeftSeconds((details.durationMinutes || 15) * 60);
      setQuizFinishedResult(null);
    },
  });

  const submitMutation = useMutation({
    mutationFn: (data: {
      quizId: string;
      answers: Record<string, string | number>;
      timeTakenSeconds: number;
    }) => submitQuizAttempt({ data }),
    onSuccess: (res) => {
      setQuizFinishedResult(res);
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["quiz-attempts"] });
      queryClient.invalidateQueries({ queryKey: ["student-progress"] });
      toast.success("Quiz submitted successfully!");
    },
  });

  // Countdown timer when quiz is running
  useEffect(() => {
    if (!activeQuiz || quizFinishedResult || timeLeftSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds((t) => {
        if (t <= 1) {
          clearInterval(interval);
          // auto submit
          void handleFinalSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeQuiz, quizFinishedResult, timeLeftSeconds]);

  const handleFinalSubmit = () => {
    if (!activeQuiz) return;
    const totalTime = (activeQuiz.durationMinutes || 15) * 60;
    const timeTaken = Math.max(1, totalTime - timeLeftSeconds);

    if (activeQuiz.id.startsWith("ai-")) {
      // Local scoring for AI practice
      let score = 0;
      let maxMarks = 0;
      for (const q of activeQuiz.questions) {
        maxMarks += q.marks;
        if (String(studentAnswers[q.id]) === String(q.correctAnswer)) {
          score += q.marks;
        }
      }
      setQuizFinishedResult({
        score,
        maxMarks,
        feedback:
          score >= maxMarks * 0.7
            ? "Great performance on your AI generated practice quiz!"
            : "Review the chapter notes for questions you missed.",
      });
    } else {
      submitMutation.mutate({
        quizId: activeQuiz.id,
        answers: studentAnswers,
        timeTakenSeconds: timeTaken,
      });
    }
  };

  const subjects = subjectsQuery.data ?? [];
  const quizzes = quizzesQuery.data ?? [];
  const attempts = attemptsQuery.data ?? [];

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Header and Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">Examinations & Quizzes</h3>
            <Badge
              variant="outline"
              className="text-xs bg-primary/10 text-primary border-primary/20"
            >
              Auto-Graded
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Faculty assigned term tests, plus AI-generated practice tests grounded on syllabus
            notes.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-secondary/80 p-1 rounded-lg">
          <Button
            variant={activeTab === "assigned" ? "default" : "ghost"}
            size="sm"
            className="text-xs h-8"
            onClick={() => setActiveTab("assigned")}
          >
            Assigned Quizzes ({quizzes.length})
          </Button>
          <Button
            variant={activeTab === "ai_generator" ? "default" : "ghost"}
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={() => setActiveTab("ai_generator")}
          >
            <Sparkles className="size-3 text-primary" /> AI Generator
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "ghost"}
            size="sm"
            className="text-xs h-8"
            onClick={() => setActiveTab("history")}
          >
            My Attempts ({attempts.length})
          </Button>
        </div>
      </div>

      {/* Mode 1: Assigned Faculty Quizzes */}
      {activeTab === "assigned" && (
        <div className="space-y-4">
          {quizzesQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-44 rounded-xl border border-border/60 bg-muted/30 animate-pulse"
                />
              ))}
            </div>
          ) : quizzes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <HelpCircle className="size-8 mx-auto text-muted-foreground/60 mb-2" />
              <p className="text-sm font-medium text-foreground">No active quizzes assigned</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Your professors have not assigned any active tests for your semester group yet. Try
                generating your own practice quiz using the AI Generator tab!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {quizzes.map((q) => (
                <Card
                  key={q.id}
                  className="flex flex-col justify-between border-border/70 hover:border-primary/50 transition-all shadow-sm"
                >
                  <CardHeader className="p-4 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {q.subjectName}
                      </Badge>
                      {q.hasAttempted ? (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        >
                          <CheckCircle2 className="size-3 mr-1" />
                          Scored: {q.lastAttemptScore}/{q.maxMarks}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Pending Attempt
                        </Badge>
                      )}
                    </div>

                    <CardTitle className="text-sm font-semibold line-clamp-2 mt-2">
                      {q.title}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Assigned by {q.authorName} · {q.questionsCount} Questions
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2.5">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3 text-muted-foreground" />
                        {q.durationMinutes} Minutes
                      </span>
                      <span>Max Marks: {q.maxMarks}</span>
                    </div>

                    <Button
                      size="sm"
                      className="w-full text-xs h-8"
                      onClick={() => startQuizMutation.mutate(q.id)}
                    >
                      {q.hasAttempted ? (
                        <>
                          <RotateCcw className="size-3.5 mr-1.5" /> Re-attempt / Review
                        </>
                      ) : (
                        <>
                          <Play className="size-3.5 mr-1.5" /> Start Quiz
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mode 2: AI Quiz Generator */}
      {activeTab === "ai_generator" && (
        <Card className="border-border/80 shadow-sm max-w-3xl mx-auto">
          <CardHeader className="p-5 border-b border-border/60 bg-secondary/20">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <CardTitle className="text-base font-semibold">
                Generate Custom Syllabus Quiz
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Select specific subjects and chapters. The system will retrieve your uploaded lecture
              notes, PYQs, and books to synthesize grounded questions.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">1. Select Subject</Label>
              <select
                value={aiSubjectId}
                onChange={(e) => {
                  setAiSubjectId(e.target.value);
                  const sub = subjects.find((s) => s.id === e.target.value);
                  setAiSelectedChapters(sub?.chapters?.slice(0, 1) ?? ["Unit 1: Core Principles"]);
                }}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Choose Subject from Academic Space --</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code ? `${s.code} - ` : ""}
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {aiSubjectId && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">2. Target Chapters & Units</Label>
                <div className="flex flex-wrap gap-2">
                  {["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5"].map((unit) => {
                    const isChecked = aiSelectedChapters.includes(unit);
                    return (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setAiSelectedChapters((prev) => prev.filter((u) => u !== unit));
                          } else {
                            setAiSelectedChapters((prev) => [...prev, unit]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          isChecked
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary/60 hover:bg-secondary border-border/70 text-foreground"
                        }`}
                      >
                        {unit}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3 pt-1">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Number of Questions</Label>
                <select
                  value={aiCount}
                  onChange={(e) => setAiCount(Number(e.target.value))}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground"
                >
                  <option value={3}>3 Questions (Quick)</option>
                  <option value={5}>5 Questions (Standard)</option>
                  <option value={10}>10 Questions (Comprehensive)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Difficulty Level</Label>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value as "Easy" | "Medium" | "Hard")}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground"
                >
                  <option value="Easy">Easy (Conceptual)</option>
                  <option value="Medium">Medium (Application)</option>
                  <option value="Hard">Hard (Analytical)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Quiz Format</Label>
                <select
                  value={aiType}
                  onChange={(e) =>
                    setAiType(e.target.value as "mcq" | "true_false" | "short_answer")
                  }
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground"
                >
                  <option value="mcq">Multiple Choice (MCQ)</option>
                  <option value="true_false">True / False</option>
                  <option value="short_answer">Short Answer</option>
                </select>
              </div>
            </div>

            <Button
              disabled={!aiSubjectId || generateMutation.isPending}
              onClick={() =>
                generateMutation.mutate({
                  subjectId: aiSubjectId,
                  chapterNames: aiSelectedChapters.length > 0 ? aiSelectedChapters : ["Unit 1"],
                  questionCount: aiCount,
                  difficulty: aiDifficulty,
                  quizType: aiType,
                })
              }
              className="w-full h-10 text-xs bg-primary text-primary-foreground font-semibold gap-2 mt-2"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Grounding on College Notes &
                  Generating Quiz...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Synthesize Grounded Quiz
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Mode 3: Student Attempts History */}
      {activeTab === "history" && (
        <div className="space-y-3">
          {attempts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <BarChart2 className="size-8 mx-auto text-muted-foreground/60 mb-2" />
              <p className="text-sm font-medium text-foreground">No attempts recorded yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Complete an assigned quiz or generate an AI quiz to track your scores.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {attempts.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card/60 hover:bg-secondary/40 transition-colors text-xs"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-foreground text-sm">{att.quizTitle}</p>
                    <p className="text-muted-foreground">
                      {att.subjectName} · Submitted on{" "}
                      {new Date(att.submittedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-sm text-foreground">
                        {att.score} / {att.maxMarks}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {Math.round((att.score / (att.maxMarks || 1)) * 100)}% Score
                      </p>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        att.score >= att.maxMarks * 0.7
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      }`}
                    >
                      {att.score >= att.maxMarks * 0.7 ? "Passed" : "Needs Review"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Interactive Quiz Runner Modal */}
      <Dialog
        open={Boolean(activeQuiz)}
        onOpenChange={(open) => {
          if (!open && !quizFinishedResult) {
            if (
              confirm("Are you sure you want to exit the quiz? Current progress will not be saved.")
            ) {
              setActiveQuiz(null);
            }
          } else if (!open) {
            setActiveQuiz(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden sm:rounded-xl">
          {activeQuiz && (
            <>
              {/* Quiz Header with Timer */}
              <div className="p-4 border-b border-border bg-secondary/30 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{activeQuiz.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}
                  </p>
                </div>

                {!quizFinishedResult && (
                  <div className="flex items-center gap-2 bg-background border border-border px-3 py-1.5 rounded-lg text-xs font-mono font-semibold text-primary">
                    <Clock className="size-3.5" />
                    {formatTimer(timeLeftSeconds)}
                  </div>
                )}
              </div>

              {/* Quiz Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                {quizFinishedResult ? (
                  <div className="py-8 text-center space-y-4">
                    <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                      <CheckCircle2 className="size-8" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-lg font-bold text-foreground">Quiz Completed!</h4>
                      <p className="text-2xl font-black text-primary">
                        {quizFinishedResult.score} / {quizFinishedResult.maxMarks} Marks
                      </p>
                      <p className="text-xs text-muted-foreground">
                        (
                        {Math.round(
                          (quizFinishedResult.score / (quizFinishedResult.maxMarks || 1)) * 100,
                        )}
                        % Accuracy)
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-secondary/60 border border-border max-w-md mx-auto text-xs text-foreground/90">
                      {quizFinishedResult.feedback}
                    </div>

                    <div className="pt-2 flex justify-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveQuiz(null);
                          setQuizFinishedResult(null);
                        }}
                      >
                        Close & View Dashboard
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const q = activeQuiz.questions[currentQuestionIndex];
                      if (!q) return null;
                      const selectedVal = studentAnswers[q.id];

                      return (
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Question {currentQuestionIndex + 1} ({q.marks} Marks)
                            </span>
                            {q.groundedSource && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-primary/5 text-primary"
                              >
                                Source: {q.groundedSource}
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm font-semibold text-foreground leading-relaxed">
                            {q.text}
                          </p>

                          {/* Options */}
                          {q.type === "mcq" || q.type === "true_false" ? (
                            <div className="space-y-2 pt-2">
                              {q.options?.map((opt, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() =>
                                    setStudentAnswers((prev) => ({ ...prev, [q.id]: idx }))
                                  }
                                  className={`w-full p-3 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                                    selectedVal === idx
                                      ? "border-primary bg-primary/10 text-foreground font-semibold"
                                      : "border-border hover:bg-secondary/60 text-foreground/90"
                                  }`}
                                >
                                  <span>{opt}</span>
                                  <div
                                    className={`size-4 rounded-full border flex items-center justify-center ${
                                      selectedVal === idx
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border"
                                    }`}
                                  >
                                    {selectedVal === idx && (
                                      <div className="size-1.5 rounded-full bg-white" />
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="pt-2">
                              <textarea
                                value={String(selectedVal ?? "")}
                                onChange={(e) =>
                                  setStudentAnswers((prev) => ({
                                    ...prev,
                                    [q.id]: e.target.value,
                                  }))
                                }
                                placeholder="Type your academic solution here..."
                                rows={4}
                                className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* Navigation Footer */}
              {!quizFinishedResult && (
                <div className="p-4 border-t border-border bg-card flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                  >
                    Previous
                  </Button>

                  <div className="flex items-center gap-2">
                    {currentQuestionIndex < activeQuiz.questions.length - 1 ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          setCurrentQuestionIndex((i) =>
                            Math.min(activeQuiz.questions.length - 1, i + 1),
                          )
                        }
                      >
                        Next Question
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleFinalSubmit}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={submitMutation.isPending}
                      >
                        {submitMutation.isPending ? (
                          <Loader2 className="size-4 animate-spin mr-1" />
                        ) : null}
                        Submit Examination
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
