import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileCode,
  Download,
  Bookmark,
  Eye,
  Search,
  BookOpenCheck,
  Calendar,
  Sparkles,
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

export function StudyMaterialsSection({
  user,
  onOpenAiForDoc,
}: {
  user: UserDTO;
  onOpenAiForDoc?: (doc: AcademicDocumentDTO) => void;
}) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<string>("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDoc, setPreviewDoc] = useState<AcademicDocumentDTO | null>(null);

  const subjectsQuery = useQuery({
    queryKey: ["subjects", user.programId, user.semester],
    queryFn: () => listSubjects({ data: {} }),
  });

  const materialsQuery = useQuery({
    queryKey: [
      "study-materials",
      category,
      selectedSubjectId,
      searchQuery,
      user.programId,
      user.semester,
    ],
    queryFn: () =>
      listAcademicDocuments({
        data: {
          documentType: category === "all" ? "study_materials" : category,
          subjectId: selectedSubjectId === "all" ? undefined : selectedSubjectId,
          search: searchQuery || undefined,
        },
      }),
  });

  const bookmarkMutation = useMutation({
    mutationFn: (documentId: string) =>
      toggleBookmark({ data: { documentId, itemType: "material" } }),
    onSuccess: (res) => {
      toast.success(res.bookmarked ? "Bookmarked material" : "Removed bookmark");
      queryClient.invalidateQueries({ queryKey: ["study-materials"] });
    },
  });

  const trackViewMutation = useMutation({
    mutationFn: (id: string) => trackDocumentView({ data: { id, type: "material" } }),
  });

  const handlePreview = (doc: AcademicDocumentDTO) => {
    setPreviewDoc(doc);
    trackViewMutation.mutate(doc.id);
  };

  const categories = [
    { id: "all", label: "All Materials" },
    { id: "lab_manual", label: "Lab Manuals" },
    { id: "assignment", label: "Assignments" },
    { id: "reference_material", label: "Reference Material" },
    { id: "practice_material", label: "Practice Material" },
  ];

  const subjects = subjectsQuery.data ?? [];
  const materials = materialsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur">
        <div>
          <h3 className="text-base font-semibold text-foreground">Lab Manuals & Study Resources</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Practical manuals, laboratory exercise sheets, semester assignments and reference
            handbooks.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assignments or manuals..."
            className="pl-8 text-xs h-9"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((c) => (
          <Button
            key={c.id}
            variant={category === c.id ? "default" : "outline"}
            size="sm"
            className="text-xs rounded-full h-8"
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </Button>
        ))}

        <div className="h-5 w-px bg-border mx-1 hidden sm:block" />

        <select
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
          className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All Subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Materials Grid */}
      {materialsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-xl border border-border/60 bg-muted/30 animate-pulse"
            />
          ))}
        </div>
      ) : materials.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <BookOpenCheck className="size-8 mx-auto text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium text-foreground">No study resources found</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            There are no materials uploaded under this category yet for your academic space.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {materials.map((doc) => (
            <Card
              key={doc.id}
              className="group flex flex-col justify-between border-border/70 hover:border-primary/50 transition-all shadow-sm hover:shadow-md"
            >
              <CardHeader className="p-4 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase tracking-wider font-semibold ${
                      doc.documentType === "lab_manual"
                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                        : doc.documentType === "assignment"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                    }`}
                  >
                    {doc.documentType.replace("_", " ")}
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
                  {doc.description || "Laboratory guidelines and assignment instructions."}
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
                    <Eye className="size-3.5 mr-1" /> View Resource
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs h-8 px-2.5"
                    title="Ask AI about this resource"
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

      {/* Detail Dialog */}
      <Dialog open={Boolean(previewDoc)} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden sm:rounded-xl">
          {previewDoc && (
            <>
              <DialogHeader className="p-5 border-b border-border/70 bg-secondary/30">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs capitalize">
                    {previewDoc.documentType.replace("_", " ")}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {previewDoc.subjectName}
                  </Badge>
                </div>
                <DialogTitle className="text-lg font-semibold">{previewDoc.title}</DialogTitle>
                <DialogDescription className="text-xs">
                  Uploaded by {previewDoc.uploaderName} · {previewDoc.fileName}
                </DialogDescription>
              </DialogHeader>

              <div className="p-6 overflow-y-auto space-y-4 text-sm leading-relaxed">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Description & Objectives
                  </h4>
                  <p className="text-foreground/90 bg-muted/40 p-3 rounded-lg border border-border/40 text-xs">
                    {previewDoc.description}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Lab Procedure & Practical Tasks
                  </h4>
                  <div className="bg-background border border-border rounded-lg p-4 font-mono text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                    {previewDoc.contentText || "Exercise instructions and practical guidelines."}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border/70 bg-card flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info(`Downloading ${previewDoc.fileName}`)}
                >
                  <Download className="size-4 mr-1.5" /> Download
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
                  <Sparkles className="size-4 mr-1.5" /> Ask AI About This Manual
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
