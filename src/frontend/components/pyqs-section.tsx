import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileQuestion,
  Download,
  Bookmark,
  Eye,
  Search,
  Calendar,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  listAcademicDocuments,
  listSubjects,
  toggleBookmark,
  trackDocumentView,
} from "@/backend/academic-content.functions";
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
import type { AcademicDocumentDTO, UserDTO } from "@/shared/types";

export function PYQsSection({
  user,
  onOpenAiForDoc,
}: {
  user: UserDTO;
  onOpenAiForDoc?: (doc: AcademicDocumentDTO) => void;
}) {
  const queryClient = useQueryClient();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDoc, setPreviewDoc] = useState<AcademicDocumentDTO | null>(null);

  const subjectsQuery = useQuery({
    queryKey: ["subjects", user.programId, user.semester],
    queryFn: () => listSubjects({ data: {} }),
  });

  const pyqQuery = useQuery({
    queryKey: ["pyqs", selectedSubjectId, selectedYear, searchQuery, user.programId, user.semester],
    queryFn: () =>
      listAcademicDocuments({
        data: {
          documentType: "pyq",
          subjectId: selectedSubjectId === "all" ? undefined : selectedSubjectId,
          year: selectedYear === "all" ? undefined : Number(selectedYear),
          search: searchQuery || undefined,
        },
      }),
  });

  const bookmarkMutation = useMutation({
    mutationFn: (documentId: string) =>
      toggleBookmark({ data: { documentId, itemType: "material" } }),
    onSuccess: (res) => {
      toast.success(res.bookmarked ? "Bookmarked PYQ" : "Removed bookmark");
      queryClient.invalidateQueries({ queryKey: ["pyqs"] });
    },
  });

  const trackViewMutation = useMutation({
    mutationFn: (id: string) => trackDocumentView({ data: { id, type: "material" } }),
  });

  const handlePreview = (doc: AcademicDocumentDTO) => {
    setPreviewDoc(doc);
    trackViewMutation.mutate(doc.id);
  };

  const subjects = subjectsQuery.data ?? [];
  const pyqs = pyqQuery.data ?? [];
  const years = ["all", "2024", "2023", "2022", "2021", "2020"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">
              Previous Year Questions (PYQ)
            </h3>
            <Badge
              variant="outline"
              className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            >
              Exam Archive
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Official End-Sem and Mid-Sem question papers archived by MITS departments.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exam papers..."
            className="pl-8 text-xs h-9"
          />
        </div>
      </div>

      {/* Filter Row: Subject and Year */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
          className="h-8 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All Examination Subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code ? `${s.code} - ` : ""}
              {s.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5 text-muted-foreground ml-1" />
          <span className="text-xs text-muted-foreground">Year:</span>
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                selectedYear === y
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80 text-foreground"
              }`}
            >
              {y === "all" ? "All Years" : y}
            </button>
          ))}
        </div>
      </div>

      {/* PYQ Grid */}
      {pyqQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-xl border border-border/60 bg-muted/30 animate-pulse"
            />
          ))}
        </div>
      ) : pyqs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <FileQuestion className="size-8 mx-auto text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium text-foreground">No examination papers found</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            No previous year question papers currently match this filter.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pyqs.map((doc) => (
            <Card
              key={doc.id}
              className="group flex flex-col justify-between border-border/70 hover:border-amber-500/50 transition-all shadow-sm hover:shadow-md"
            >
              <CardHeader className="p-4 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge
                    variant="outline"
                    className="text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  >
                    {doc.year ? `Year ${doc.year}` : "Previous Year"}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => bookmarkMutation.mutate(doc.id)}
                    className="text-muted-foreground hover:text-amber-500 transition-colors p-1"
                  >
                    <Bookmark
                      className={`size-4 ${doc.isBookmarked ? "fill-amber-500 text-amber-500" : ""}`}
                    />
                  </button>
                </div>
                <CardTitle className="text-sm font-semibold line-clamp-2 mt-2 group-hover:text-primary transition-colors">
                  {doc.title}
                </CardTitle>
                <CardDescription className="text-xs line-clamp-2 mt-1">
                  {doc.description || "Official university examination paper."}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-0 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50 pt-2.5">
                  <span className="truncate max-w-[150px] font-medium text-foreground/80">
                    {doc.subjectName}
                  </span>
                  <span>Semester {doc.semester}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={() => handlePreview(doc)}
                  >
                    <Eye className="size-3.5 mr-1" /> View Paper
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs h-8 px-2.5"
                    title="Solve paper with AI Study Assistant"
                    onClick={() => onOpenAiForDoc?.(doc)}
                  >
                    <Sparkles className="size-3.5 text-primary" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Paper Preview Dialog */}
      <Dialog open={Boolean(previewDoc)} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden sm:rounded-xl">
          {previewDoc && (
            <>
              <DialogHeader className="p-5 border-b border-border/70 bg-secondary/30">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {previewDoc.subjectName}
                  </Badge>
                  {previewDoc.year && (
                    <Badge variant="secondary" className="text-xs">
                      Session {previewDoc.year}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-lg font-semibold">{previewDoc.title}</DialogTitle>
                <DialogDescription className="text-xs">
                  Madhav Institute of Technology and Science, Gwalior (Autonomous)
                </DialogDescription>
              </DialogHeader>

              <div className="p-6 overflow-y-auto space-y-4 text-sm leading-relaxed">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Exam Paper Details
                  </h4>
                  <p className="text-foreground/90 bg-muted/40 p-3 rounded-lg border border-border/40 text-xs">
                    {previewDoc.description}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Question Paper Questions & Schema
                  </h4>
                  <div className="bg-background border border-border rounded-lg p-4 font-mono text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                    {previewDoc.contentText || "Complete scanned question paper."}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border/70 bg-card flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info(`Downloading ${previewDoc.fileName}`)}
                >
                  <Download className="size-4 mr-1.5" /> Download Paper
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    const doc = previewDoc;
                    setPreviewDoc(null);
                    onOpenAiForDoc?.(doc);
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Sparkles className="size-4 mr-1.5" /> Solve Paper with AI Assistant
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
