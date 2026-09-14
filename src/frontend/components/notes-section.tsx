import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Download,
  Bookmark,
  Eye,
  Search,
  Filter,
  Layers,
  Sparkles,
  BookOpen,
  CheckCircle2,
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

export function NotesSection({
  user,
  onOpenAiForDoc,
}: {
  user: UserDTO;
  onOpenAiForDoc?: (doc: AcademicDocumentDTO) => void;
}) {
  const queryClient = useQueryClient();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDoc, setPreviewDoc] = useState<AcademicDocumentDTO | null>(null);

  const subjectsQuery = useQuery({
    queryKey: ["subjects", user.programId, user.semester],
    queryFn: () => listSubjects({ data: {} }),
  });

  const notesQuery = useQuery({
    queryKey: [
      "notes",
      selectedSubjectId,
      selectedUnit,
      searchQuery,
      user.programId,
      user.semester,
    ],
    queryFn: () =>
      listAcademicDocuments({
        data: {
          documentType: "notes",
          subjectId: selectedSubjectId === "all" ? undefined : selectedSubjectId,
          search: searchQuery || undefined,
        },
      }),
  });

  const bookmarkMutation = useMutation({
    mutationFn: (documentId: string) =>
      toggleBookmark({ data: { documentId, itemType: "material" } }),
    onSuccess: (res) => {
      toast.success(res.bookmarked ? "Bookmarked to your library" : "Removed bookmark");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
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
  const notes = notesQuery.data ?? [];

  const filteredNotes =
    selectedUnit === "all"
      ? notes
      : notes.filter(
          (n) =>
            String(n.unitNo) === selectedUnit || n.chapterName?.includes(`Unit ${selectedUnit}`),
        );

  return (
    <div className="space-y-6">
      {/* Top Banner: Academic Space Confirmation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-foreground">
              Lecture & Syllabus Notes
            </span>
            <Badge
              variant="outline"
              className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            >
              <CheckCircle2 className="size-3 mr-1" />
              Verified Syllabus Access
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Unit notes, chapter handouts, and lecture presentations tailored to your semester.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes or topics..."
              className="pl-8 text-xs h-9"
            />
          </div>
        </div>
      </div>

      {/* Subject Tabs / Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Button
          variant={selectedSubjectId === "all" ? "default" : "outline"}
          size="sm"
          className="text-xs shrink-0 rounded-full h-8"
          onClick={() => {
            setSelectedSubjectId("all");
            setSelectedUnit("all");
          }}
        >
          All Subjects
        </Button>
        {subjects.map((sub) => (
          <Button
            key={sub.id}
            variant={selectedSubjectId === sub.id ? "default" : "outline"}
            size="sm"
            className="text-xs shrink-0 rounded-full h-8"
            onClick={() => {
              setSelectedSubjectId(sub.id);
              setSelectedUnit("all");
            }}
          >
            {sub.code ? `${sub.code}: ` : ""}
            {sub.name.length > 25 ? `${sub.name.slice(0, 25)}…` : sub.name}
          </Button>
        ))}
      </div>

      {/* Unit Filter if a subject is selected */}
      {selectedSubjectId !== "all" && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground flex items-center gap-1">
            <Filter className="size-3" /> Unit:
          </span>
          {["all", "1", "2", "3", "4", "5"].map((u) => (
            <button
              key={u}
              onClick={() => setSelectedUnit(u)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                selectedUnit === u
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80 text-foreground"
              }`}
            >
              {u === "all" ? "All Units" : `Unit ${u}`}
            </button>
          ))}
        </div>
      )}

      {/* Notes Grid */}
      {notesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-xl border border-border/60 bg-muted/30 animate-pulse"
            />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <FileText className="size-8 mx-auto text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium text-foreground">No notes found</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            No lecture notes match this filter in your academic space. Teachers can upload notes
            directly from their academic space.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((doc) => (
            <Card
              key={doc.id}
              className="group flex flex-col justify-between border-border/70 hover:border-primary/50 transition-all shadow-sm hover:shadow-md"
            >
              <CardHeader className="p-4 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="secondary" className="text-[11px] font-medium tracking-tight">
                    {doc.chapterName || (doc.unitNo ? `Unit ${doc.unitNo}` : "Lecture Notes")}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => bookmarkMutation.mutate(doc.id)}
                    className="text-muted-foreground hover:text-amber-500 transition-colors p-1"
                    title={doc.isBookmarked ? "Remove bookmark" : "Bookmark this document"}
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
                  {doc.description || "Official course material for MITS students."}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-0 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50 pt-2.5">
                  <span className="truncate max-w-[150px] font-medium text-foreground/80">
                    {doc.subjectName}
                  </span>
                  <span>{doc.fileSize || "PDF"}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={() => handlePreview(doc)}
                  >
                    <Eye className="size-3.5 mr-1" /> View Note
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs h-8 px-2.5"
                    title="Ask AI about this note"
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

      {/* Note Preview Dialog */}
      <Dialog open={Boolean(previewDoc)} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden sm:rounded-xl">
          {previewDoc && (
            <>
              <DialogHeader className="p-5 border-b border-border/70 bg-secondary/30">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {previewDoc.subjectName}
                  </Badge>
                  {previewDoc.chapterName && (
                    <Badge variant="secondary" className="text-xs">
                      {previewDoc.chapterName}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-lg font-semibold">{previewDoc.title}</DialogTitle>
                <DialogDescription className="text-xs">
                  Uploaded by {previewDoc.uploaderName} · {previewDoc.fileName} (
                  {previewDoc.fileSize})
                </DialogDescription>
              </DialogHeader>

              <div className="p-6 overflow-y-auto space-y-4 text-sm leading-relaxed">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Abstract & Syllabus Coverage
                  </h4>
                  <p className="text-foreground/90 bg-muted/40 p-3 rounded-lg border border-border/40 text-xs">
                    {previewDoc.description || "Official study notes aligned with MITS syllabus."}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Content Excerpt & Core Concepts
                  </h4>
                  <div className="bg-background border border-border rounded-lg p-4 font-mono text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                    {previewDoc.contentText || "Detailed notes uploaded as PDF file."}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
                  <span>MITS Gwalior Digital Repository</span>
                  <span>Views: {previewDoc.viewsCount ?? 1}</span>
                </div>
              </div>

              <div className="p-4 border-t border-border/70 bg-card flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast.info(`Downloading ${previewDoc.fileName}`);
                  }}
                >
                  <Download className="size-4 mr-1.5" /> Download Note
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
                  <Sparkles className="size-4 mr-1.5" /> Ask AI About This Note
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
