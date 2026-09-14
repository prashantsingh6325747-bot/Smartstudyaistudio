import { useQuery } from "@tanstack/react-query";
import {
  Flame,
  Award,
  BookOpen,
  Sparkles,
  BarChart3,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";

import { getStudentProgress } from "@/backend/progress.functions";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { UserDTO } from "@/shared/types";

export function StudentProgressOverview({ user }: { user: UserDTO }) {
  const progressQuery = useQuery({
    queryKey: ["student-progress"],
    queryFn: () => getStudentProgress(),
  });

  const p = progressQuery.data;

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Study Streak */}
        <Card className="border-border/70 bg-card/60 backdrop-blur shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Study Streak</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">
                  {p?.studyStreakDays ?? 1}
                </span>
                <span className="text-xs text-muted-foreground">Days</span>
              </div>
            </div>
            <div className="size-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Flame className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Quiz Accuracy */}
        <Card className="border-border/70 bg-card/60 backdrop-blur shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Quiz Accuracy</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">
                  {p?.averageQuizScore ?? 0}%
                </span>
                <span className="text-xs text-muted-foreground">
                  ({p?.totalQuizzesAttempted ?? 0} tests)
                </span>
              </div>
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Award className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Syllabus Notes Read */}
        <Card className="border-border/70 bg-card/60 backdrop-blur shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Materials Studied</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">
                  {p?.totalMaterialsRead ?? 0}
                </span>
                <span className="text-xs text-muted-foreground">Documents</span>
              </div>
            </div>
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <BookOpen className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: AI Tutor Queries */}
        <Card className="border-border/70 bg-card/60 backdrop-blur shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">AI Tutor Queries</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">{p?.totalAIQueries ?? 0}</span>
                <span className="text-xs text-muted-foreground">Grounded</span>
              </div>
            </div>
            <div className="size-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Sparkles className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real Subject Progress Breakdown */}
      <Card className="border-border/80 bg-card/60 backdrop-blur shadow-sm">
        <CardHeader className="p-4 pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Curriculum Progress Tracking</CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px]">
              Actual Activity Based
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Directly derived from your completed lecture notes, lab manuals, and evaluated quiz
            attempts.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {!p?.subjectProgress || p.subjectProgress.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No subjects registered for active progress tracking.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {p.subjectProgress.map((sub) => (
                <div
                  key={sub.subjectId}
                  className="p-3.5 rounded-xl border border-border/60 bg-secondary/30 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground truncate max-w-[200px]">
                      {sub.subjectName}
                    </span>
                    <span className="font-bold text-xs text-primary">{sub.percentage}%</span>
                  </div>

                  <Progress value={sub.percentage} className="h-1.5" />

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span>
                      {sub.completedMaterials} of {sub.totalMaterials} materials read
                    </span>
                    <span>
                      {sub.quizzesAttempted > 0
                        ? `${sub.quizzesAttempted} quizzes (${sub.averageScore}%)`
                        : "No quizzes taken"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
