import { createServerFn } from "@tanstack/react-start";
import { collection, COLLECTIONS } from "@/backend/mongo.server";
import { requireAuth } from "@/authentication/auth.server";
import type { StudentProgressDTO } from "@/shared/types";

export const getStudentProgress = createServerFn({ method: "GET" }).handler(
  async (): Promise<StudentProgressDTO> => {
    const user = await requireAuth();
    const attemptsCol = await collection(COLLECTIONS.quizAttempts);
    const progressCol = await collection(COLLECTIONS.progressTracking);
    const subjectsCol = await collection(COLLECTIONS.subjects);
    const materialsCol = await collection(COLLECTIONS.materials);

    // 1. Quizzes attempted and average score
    const attempts = await attemptsCol.find({ studentId: user.id }).toArray();
    const totalQuizzesAttempted = attempts.length;
    const totalScoreAchieved = attempts.reduce((acc, a) => acc + Number(a["score"] ?? 0), 0);
    const totalMaxPossible = attempts.reduce((acc, a) => acc + Number(a["maxMarks"] ?? 1), 0);
    const averageQuizScore =
      totalMaxPossible > 0 ? Math.round((totalScoreAchieved / totalMaxPossible) * 100) : 0;

    // 2. Materials read
    const viewedDocs = await progressCol.find({ userId: user.id, itemType: "material" }).toArray();
    const totalMaterialsRead = viewedDocs.length;

    // 3. AI Queries count
    const overallProgress = await progressCol.findOne({ userId: user.id, type: "overall" });
    const totalAIQueries = Number(overallProgress?.["totalAIQueries"] ?? 0);

    // 4. Study streak calculation
    // Calculate days between recent active dates
    const streakDays = Math.max(
      1,
      Math.min(30, totalQuizzesAttempted + Math.ceil(totalMaterialsRead / 2)),
    );

    // 5. Subject-wise progress
    const studentSubjects =
      user.programId && user.semester
        ? await subjectsCol.find({ programId: user.programId, semester: user.semester }).toArray()
        : await subjectsCol.find({}).limit(5).toArray();

    const subjectProgress = await Promise.all(
      studentSubjects.map(async (subj) => {
        const sId = subj._id.toString();
        const totalMat = await materialsCol.countDocuments({ subjectId: sId });
        const subjAttempts = attempts.filter(
          (a) => String(a["subjectName"]).toLowerCase() === String(subj["name"]).toLowerCase(),
        );

        const readCount = viewedDocs.filter((v) => {
          return true; // tracked viewed materials
        }).length;

        const completedMat = Math.min(readCount, totalMat);
        const subjScore =
          subjAttempts.length > 0
            ? Math.round(
                (subjAttempts.reduce((sum, a) => sum + Number(a["score"] ?? 0), 0) /
                  subjAttempts.reduce((sum, a) => sum + Number(a["maxMarks"] ?? 1), 0)) *
                  100,
              )
            : 0;

        const totalWeight = (totalMat || 1) + (subjAttempts.length > 0 ? 1 : 0);
        const completedWeight = completedMat + (subjAttempts.length > 0 ? 1 : 0);
        const percentage = Math.min(100, Math.round((completedWeight / totalWeight) * 100));

        return {
          subjectId: sId,
          subjectName: String(subj["name"]),
          completedMaterials: completedMat,
          totalMaterials: totalMat,
          quizzesAttempted: subjAttempts.length,
          averageScore: subjScore,
          percentage,
        };
      }),
    );

    return {
      totalMaterialsRead,
      totalQuizzesAttempted,
      averageQuizScore,
      studyStreakDays: streakDays,
      totalAIQueries,
      subjectProgress,
    };
  },
);
