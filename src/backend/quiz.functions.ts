import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { collection, COLLECTIONS, ObjectId } from "@/backend/mongo.server";
import { getMe, requireAuth } from "@/authentication/auth.server";
import type { QuizAttemptDTO, QuizDetailDTO, QuizDTO, QuizQuestionDTO } from "@/shared/types";

export const listQuizzes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        programId: z.string().optional(),
        semester: z.number().optional(),
        subjectId: z.string().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<QuizDTO[]> => {
    const user = await requireAuth();
    const quizzesCol = await collection(COLLECTIONS.quizzes);
    const attemptsCol = await collection(COLLECTIONS.quizAttempts);
    const programsCol = await collection(COLLECTIONS.programs);

    const filter: Record<string, unknown> = {};

    // 23. Strict Backend Access Control: Eligible students only
    if (user.role === "student") {
      if (!user.programId || !user.semester) return [];
      filter["programId"] = user.programId;
      filter["semester"] = user.semester;
    } else {
      if (data.programId) filter["programId"] = data.programId;
      if (data.semester) filter["semester"] = data.semester;
    }

    if (data.subjectId) filter["subjectId"] = data.subjectId;

    const docs = await quizzesCol.find(filter).sort({ createdAt: -1 }).toArray();

    // Check attempts for the current student
    const studentAttempts = await attemptsCol.find({ studentId: user.id }).toArray();
    const attemptMap = new Map<string, { score: number; maxMarks: number }>();
    for (const a of studentAttempts) {
      attemptMap.set(String(a["quizId"]), {
        score: Number(a["score"]),
        maxMarks: Number(a["maxMarks"]),
      });
    }

    const programs = await programsCol.find({}).toArray();
    const progMap = new Map(programs.map((p) => [p._id.toString(), String(p["name"])]));

    return docs.map((q) => {
      const qId = q._id.toString();
      const attempt = attemptMap.get(qId);
      const questions = Array.isArray(q["questions"]) ? (q["questions"] as unknown[]) : [];

      return {
        id: qId,
        title: String(q["title"]),
        subjectId: String(q["subjectId"] ?? ""),
        subjectName: String(q["subjectName"] ?? "General"),
        chapterName: q["chapterName"] ? String(q["chapterName"]) : undefined,
        programId: String(q["programId"] ?? ""),
        programName: progMap.get(String(q["programId"] ?? "")) ?? "General",
        semester: Number(q["semester"] ?? 1),
        startTime: q["startTime"] ? new Date(q["startTime"] as Date).toISOString() : undefined,
        endTime: q["endTime"] ? new Date(q["endTime"] as Date).toISOString() : undefined,
        durationMinutes: Number(q["durationMinutes"] ?? 15),
        maxMarks: Number(q["maxMarks"] ?? 20),
        questionsCount: questions.length,
        createdBy: String(q["createdBy"] ?? ""),
        authorName: String(q["authorName"] ?? "Faculty"),
        isAiGenerated: Boolean(q["isAiGenerated"]),
        createdAt: q["createdAt"]
          ? new Date(q["createdAt"] as Date).toISOString()
          : new Date().toISOString(),
        hasAttempted: attemptMap.has(qId),
        lastAttemptScore: attempt?.score,
      };
    });
  });

export const getQuizDetails = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(async ({ data }): Promise<QuizDetailDTO> => {
    const user = await requireAuth();
    const quizzesCol = await collection(COLLECTIONS.quizzes);
    const attemptsCol = await collection(COLLECTIONS.quizAttempts);

    const doc = await quizzesCol.findOne({ _id: new ObjectId(data.id) });
    if (!doc) throw new Error("Quiz not found.");

    // Strict access control for students
    if (
      user.role === "student" &&
      (String(doc["programId"]) !== user.programId || Number(doc["semester"]) !== user.semester)
    ) {
      throw new Error("You are not eligible to access this quiz.");
    }

    const previousAttempt = await attemptsCol.findOne({ quizId: data.id, studentId: user.id });
    const rawQuestions = Array.isArray(doc["questions"])
      ? (doc["questions"] as Record<string, unknown>[])
      : [];

    // Redact correct answers if student hasn't submitted yet!
    const isTeacherOrAdmin = user.role === "teacher" || user.role === "admin";
    const canSeeAnswers = isTeacherOrAdmin || Boolean(previousAttempt);

    const questions: QuizQuestionDTO[] = rawQuestions.map((q) => ({
      id: String(q["id"]),
      type: (q["type"] ?? "mcq") as QuizQuestionDTO["type"],
      text: String(q["text"]),
      options: Array.isArray(q["options"]) ? (q["options"] as string[]) : undefined,
      correctAnswer: canSeeAnswers ? (q["correctAnswer"] as string | number) : undefined,
      marks: Number(q["marks"] ?? 2),
      explanation: canSeeAnswers && q["explanation"] ? String(q["explanation"]) : undefined,
      groundedSource: q["groundedSource"] ? String(q["groundedSource"]) : undefined,
    }));

    return {
      id: doc._id.toString(),
      title: String(doc["title"]),
      subjectId: String(doc["subjectId"]),
      subjectName: String(doc["subjectName"]),
      chapterName: doc["chapterName"] ? String(doc["chapterName"]) : undefined,
      programId: String(doc["programId"]),
      semester: Number(doc["semester"]),
      startTime: doc["startTime"] ? new Date(doc["startTime"] as Date).toISOString() : undefined,
      endTime: doc["endTime"] ? new Date(doc["endTime"] as Date).toISOString() : undefined,
      durationMinutes: Number(doc["durationMinutes"] ?? 15),
      maxMarks: Number(doc["maxMarks"] ?? 20),
      questionsCount: questions.length,
      createdBy: String(doc["createdBy"]),
      authorName: String(doc["authorName"] ?? "Faculty"),
      createdAt: doc["createdAt"]
        ? new Date(doc["createdAt"] as Date).toISOString()
        : new Date().toISOString(),
      hasAttempted: Boolean(previousAttempt),
      lastAttemptScore: previousAttempt ? Number(previousAttempt["score"]) : undefined,
      questions,
    };
  });

export const submitQuizAttempt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        quizId: z.string().min(1),
        answers: z.record(z.union([z.string(), z.number()])),
        timeTakenSeconds: z.number().int().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ score: number; maxMarks: number; feedback: string }> => {
    const user = await requireAuth();
    const quizzesCol = await collection(COLLECTIONS.quizzes);
    const attemptsCol = await collection(COLLECTIONS.quizAttempts);

    const quiz = await quizzesCol.findOne({ _id: new ObjectId(data.quizId) });
    if (!quiz) throw new Error("Quiz not found.");

    const rawQuestions = Array.isArray(quiz["questions"])
      ? (quiz["questions"] as Record<string, unknown>[])
      : [];

    let totalScore = 0;
    let maxMarks = 0;

    for (const q of rawQuestions) {
      const qId = String(q["id"]);
      const marks = Number(q["marks"] ?? 2);
      maxMarks += marks;

      const studentAns = data.answers[qId];
      if (studentAns !== undefined && studentAns !== null) {
        if (q["type"] === "mcq" || q["type"] === "true_false") {
          if (String(studentAns) === String(q["correctAnswer"])) {
            totalScore += marks;
          }
        } else {
          // Short answer / subjective basic keyword match or teacher grading placeholder
          totalScore += marks; // credited for attempt
        }
      }
    }

    const percentage = Math.round((totalScore / (maxMarks || 1)) * 100);
    const feedback =
      percentage >= 80
        ? "Excellent mastery of the syllabus material!"
        : percentage >= 60
          ? "Good performance. Review the explanations for missed questions."
          : "Needs review. We recommend reading the corresponding unit notes.";

    const attemptDoc = {
      quizId: data.quizId,
      quizTitle: String(quiz["title"]),
      subjectName: String(quiz["subjectName"]),
      studentId: user.id,
      studentName: user.name,
      enrollmentNo: user.enrollmentNo || null,
      answers: data.answers,
      score: totalScore,
      maxMarks,
      timeTakenSeconds: data.timeTakenSeconds,
      submittedAt: new Date(),
      feedback,
    };

    await attemptsCol.insertOne(attemptDoc);

    // Track in progress
    const progressCol = await collection(COLLECTIONS.progressTracking);
    await progressCol.updateOne(
      { userId: user.id, type: "overall" },
      {
        $inc: { totalQuizzesAttempted: 1, totalScoreAccumulated: totalScore },
        $set: { lastActiveAt: new Date() },
      },
      { upsert: true },
    );

    return { score: totalScore, maxMarks, feedback };
  });

export const createTeacherQuiz = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().trim().min(3),
        subjectId: z.string().min(1),
        programId: z.string().min(1),
        semester: z.number().int().min(1).max(12),
        chapterName: z.string().optional(),
        durationMinutes: z.number().int().min(5).max(180).default(20),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        questions: z.array(
          z.object({
            id: z.string(),
            type: z.enum(["mcq", "true_false", "short_answer", "subjective"]),
            text: z.string().min(3),
            options: z.array(z.string()).optional(),
            correctAnswer: z.union([z.string(), z.number()]).optional(),
            marks: z.number().int().min(1).default(2),
            explanation: z.string().optional(),
            groundedSource: z.string().optional(),
          }),
        ),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    if (user.role === "student") {
      throw new Error("Students cannot create faculty quizzes.");
    }

    const subjectsCol = await collection(COLLECTIONS.subjects);
    const subject = await subjectsCol.findOne({ _id: new ObjectId(data.subjectId) });
    const subjectName = subject ? String(subject["name"]) : "General Subject";

    const totalMarks = data.questions.reduce((acc, q) => acc + q.marks, 0);

    const quizzesCol = await collection(COLLECTIONS.quizzes);
    const res = await quizzesCol.insertOne({
      title: data.title,
      subjectId: data.subjectId,
      subjectName,
      chapterName: data.chapterName,
      programId: data.programId,
      semester: data.semester,
      durationMinutes: data.durationMinutes,
      startTime: data.startTime ? new Date(data.startTime) : null,
      endTime: data.endTime ? new Date(data.endTime) : null,
      maxMarks: totalMarks,
      questions: data.questions,
      createdBy: user.id,
      authorName: user.name,
      createdAt: new Date(),
    });

    return { ok: true, id: res.insertedId.toString() };
  });

export const listQuizAttempts = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ quizId: z.string().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<QuizAttemptDTO[]> => {
    const user = await requireAuth();
    const attemptsCol = await collection(COLLECTIONS.quizAttempts);

    const filter: Record<string, unknown> = {};
    if (user.role === "student") {
      filter["studentId"] = user.id;
    } else if (data.quizId) {
      filter["quizId"] = data.quizId;
    }

    const docs = await attemptsCol.find(filter).sort({ submittedAt: -1 }).limit(100).toArray();

    return docs.map((d) => ({
      id: d._id.toString(),
      quizId: String(d["quizId"]),
      quizTitle: String(d["quizTitle"] ?? "Quiz Attempt"),
      subjectName: String(d["subjectName"] ?? "Subject"),
      studentId: String(d["studentId"]),
      studentName: String(d["studentName"] ?? "Student"),
      enrollmentNo: d["enrollmentNo"] ? String(d["enrollmentNo"]) : null,
      score: Number(d["score"]),
      maxMarks: Number(d["maxMarks"]),
      timeTakenSeconds: Number(d["timeTakenSeconds"]),
      submittedAt: d["submittedAt"]
        ? new Date(d["submittedAt"] as Date).toISOString()
        : new Date().toISOString(),
      answers: (d["answers"] as Record<string, string | number>) ?? {},
      feedback: d["feedback"] ? String(d["feedback"]) : undefined,
    }));
  });
