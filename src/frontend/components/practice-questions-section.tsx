import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ListChecks,
  Bookmark,
  Search,
  Sparkles,
  CheckCircle,
  HelpCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

import {
  listAcademicDocuments,
  listSubjects,
  toggleBookmark,
} from "@/backend/academic-content.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { AcademicDocumentDTO, UserDTO } from "@/shared/types";

export function PracticeQuestionsSection({
  user,
  onOpenAiForDoc,
}: {
  user: UserDTO;
  onOpenAiForDoc?: (doc: AcademicDocumentDTO) => void;
}) {
  const queryClient = useQueryClient();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});

  const subjectsQuery = useQuery({
    queryKey: ["subjects", user.programId, user.semester],
    queryFn: () => listSubjects({ data: {} }),
  });

  const practiceQuery = useQuery({
    queryKey: ["practice-questions", selectedSubjectId, searchQuery, user.programId, user.semester],
    queryFn: () =>
      listAcademicDocuments({
        data: {
          documentType: "practice_question",
          subjectId: selectedSubjectId === "all" ? undefined : selectedSubjectId,
          search: searchQuery || undefined,
        },
      }),
  });

  const bookmarkMutation = useMutation({
    mutationFn: (documentId: string) =>
      toggleBookmark({ data: { documentId, itemType: "material" } }),
    onSuccess: (res) => {
      toast.success(res.bookmarked ? "Bookmarked question set" : "Removed bookmark");
      queryClient.invalidateQueries({ queryKey: ["practice-questions"] });
    },
  });

  const toggleSolution = (id: string) => {
    setRevealedSolutions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const subjects = subjectsQuery.data ?? [];
  const practiceSets = practiceQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">
              Practice Question Repository
            </h3>
            <Badge
              variant="outline"
              className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            >
              MCQs & Subjective
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organized question banks, practice sets, and subjective analytical questions.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions or topics..."
            className="pl-8 text-xs h-9"
          />
        </div>
      </div>

      {/* Subject Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Button
          variant={selectedSubjectId === "all" ? "default" : "outline"}
          size="sm"
          className="text-xs rounded-full h-8 shrink-0"
          onClick={() => setSelectedSubjectId("all")}
        >
          All Subjects
        </Button>
        {subjects.map((sub) => (
          <Button
            key={sub.id}
            variant={selectedSubjectId === sub.id ? "default" : "outline"}
            size="sm"
            className="text-xs rounded-full h-8 shrink-0"
            onClick={() => setSelectedSubjectId(sub.id)}
          >
            {sub.name}
          </Button>
        ))}
      </div>

      {/* Practice Sets List */}
      {practiceQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-44 rounded-xl border border-border/60 bg-muted/30 animate-pulse"
            />
          ))}
        </div>
      ) : practiceSets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <ListChecks className="size-8 mx-auto text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium text-foreground">No practice question sets found</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Faculty have not uploaded practice question banks for this filter yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {practiceSets.map((set) => {
            const isRevealed = Boolean(revealedSolutions[set.id]);

            return (
              <Card key={set.id} className="border-border/70 shadow-sm overflow-hidden">
                <CardHeader className="p-4 pb-3 bg-secondary/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[11px] font-semibold">
                          {set.subjectName}
                        </Badge>
                        {set.chapterName && (
                          <Badge variant="secondary" className="text-[11px]">
                            {set.chapterName}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base font-semibold text-foreground pt-1">
                        {set.title}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {set.description || "Curated practice problem set for exam preparation."}
                      </CardDescription>
                    </div>

                    <button
                      type="button"
                      onClick={() => bookmarkMutation.mutate(set.id)}
                      className="text-muted-foreground hover:text-amber-500 transition-colors p-1"
                    >
                      <Bookmark
                        className={`size-4 ${set.isBookmarked ? "fill-amber-500 text-amber-500" : ""}`}
                      />
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  <div className="bg-background border border-border/70 rounded-lg p-4 font-mono text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                    {set.contentText || "Detailed practice problems available in the document."}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => toggleSolution(set.id)}
                    >
                      {isRevealed ? (
                        <>
                          <EyeOff className="size-3.5 mr-1.5" /> Hide Model Answers
                        </>
                      ) : (
                        <>
                          <Eye className="size-3.5 mr-1.5" /> Reveal Model Answers & Steps
                        </>
                      )}
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => onOpenAiForDoc?.(set)}
                    >
                      <Sparkles className="size-3.5 mr-1.5 text-primary" /> Solve with AI Tutor
                    </Button>
                  </div>

                  {isRevealed && (
                    <div className="mt-3 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground/90 space-y-2">
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="size-4" />
                        Model Solution & Concept Explanation
                      </div>
                      <p className="leading-relaxed">
                        To solve these problems systematically, apply the fundamental design
                        principles explained in {set.chapterName ?? "Unit Notes"}. Verify boundary
                        conditions and analyze asymptotic time complexity.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
