import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Users,
  Upload,
  FileCheck,
  CheckCircle,
  Clock,
  MessageSquare,
  Plus,
  Loader2,
  FileText,
  Percent,
} from "lucide-react";
import { toast } from "sonner";

import {
  listProjects,
  createProject,
  submitProjectDocument,
  reviewProject,
} from "@/backend/project.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { ProjectDTO, ProjectDocumentDTO, UserDTO } from "@/shared/types";

export function SDMSProjectsSection({ user }: { user: UserDTO }) {
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<ProjectDTO | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDocUploadModal, setShowDocUploadModal] = useState(false);

  // New Project form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newFaculty, setNewFaculty] = useState("");
  const [newMembers, setNewMembers] = useState("");
  const [newEnrollments, setNewEnrollments] = useState("");

  // Document upload state
  const [docType, setDocType] = useState<
    "synopsis" | "report" | "ppt" | "documentation" | "final_project"
  >("synopsis");
  const [docTitle, setDocTitle] = useState("");
  const [docFileName, setDocFileName] = useState("");

  // Faculty review state
  const [reviewProgress, setReviewProgress] = useState(50);
  const [reviewStatus, setReviewStatus] = useState<
    "in_progress" | "review_pending" | "approved" | "completed"
  >("approved");
  const [reviewFeedback, setReviewFeedback] = useState("");

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => listProjects(),
  });

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      toast.success("Project group created successfully!");
      setShowCreateModal(false);
      setNewTitle("");
      setNewDesc("");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: submitProjectDocument,
    onSuccess: () => {
      toast.success("Project milestone document submitted for faculty review!");
      setShowDocUploadModal(false);
      setDocTitle("");
      setDocFileName("");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: reviewProject,
    onSuccess: () => {
      toast.success("Faculty review and progress updated!");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const projects = projectsQuery.data ?? [];

  return (
    <div className="space-y-6">
      {/* SDMS Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">SDMS Major & Minor Projects</h3>
            <Badge
              variant="outline"
              className="text-xs bg-primary/10 text-primary border-primary/20"
            >
              MITS Portal Integrated
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Student project group milestones, synopsis verification, PPT reviews, and faculty guide
            evaluations.
          </p>
        </div>

        <Button
          size="sm"
          className="text-xs h-9 gap-1.5 shrink-0"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="size-4" /> Register Project Group
        </Button>
      </div>

      {/* Projects List */}
      {projectsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-52 rounded-xl border border-border/60 bg-muted/30 animate-pulse"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Briefcase className="size-8 mx-auto text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium text-foreground">No active project groups</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            You are not currently linked to any SDMS project groups. Click "Register Project Group"
            to start.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((proj) => (
            <Card
              key={proj.id}
              className="flex flex-col justify-between border-border/70 hover:border-primary/50 transition-all shadow-sm"
            >
              <CardHeader className="p-4 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {proj.academicYear} · {proj.programName}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] capitalize ${
                      proj.status === "completed"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : proj.status === "review_pending"
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                    }`}
                  >
                    {proj.status.replace("_", " ")}
                  </Badge>
                </div>

                <CardTitle className="text-base font-semibold line-clamp-2 mt-2">
                  {proj.title}
                </CardTitle>
                <CardDescription className="text-xs line-clamp-2 mt-1">
                  {proj.description || "Final year engineering major project."}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-0 space-y-3.5">
                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Evaluation Progress</span>
                    <span className="font-bold text-foreground">{proj.progressPercentage}%</span>
                  </div>
                  <Progress value={proj.progressPercentage} className="h-2" />
                </div>

                {/* Team Info */}
                <div className="pt-2 border-t border-border/50 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-foreground font-medium">
                    <Users className="size-3.5 text-primary" />
                    <span>Group: {proj.studentNames.join(", ")}</span>
                  </div>
                  <div className="text-muted-foreground text-[11px] pl-5">
                    Guide: {proj.facultyGuideName}
                  </div>
                </div>

                {proj.facultyFeedback && (
                  <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/40 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">Guide Feedback: </span>
                    {proj.facultyFeedback}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={() => setSelectedProject(proj)}
                  >
                    View Milestone Docs ({proj.documents.length})
                  </Button>

                  <Button
                    size="sm"
                    className="text-xs h-8 gap-1"
                    onClick={() => {
                      setSelectedProject(proj);
                      setShowDocUploadModal(true);
                    }}
                  >
                    <Upload className="size-3.5" /> Submit Doc
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Register Project Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md p-6 sm:rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Register SDMS Project Group</DialogTitle>
            <DialogDescription className="text-xs">
              Form your academic project team with group members and assigned faculty guide.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                data: {
                  title: newTitle,
                  description: newDesc,
                  departmentId: user.departmentId || "dept-cse",
                  programId: user.programId || "prog-btech-cse",
                  facultyGuideName: newFaculty,
                  studentNames: newMembers.split(",").map((s) => s.trim()),
                  studentEnrollments: newEnrollments.split(",").map((s) => s.trim()),
                },
              });
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Project Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. AI-Powered Autonomous Campus Navigation"
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description / Synopsis Summary</Label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Brief summary of engineering objectives"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Faculty Guide Name</Label>
              <Input
                value={newFaculty}
                onChange={(e) => setNewFaculty(e.target.value)}
                placeholder="e.g. Dr. R. K. Gupta"
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Student Team Member Names (comma separated)
              </Label>
              <Input
                value={newMembers}
                onChange={(e) => setNewMembers(e.target.value)}
                placeholder="e.g. Prashant Singh, Aman Sharma"
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Enrollment Numbers (comma separated)</Label>
              <Input
                value={newEnrollments}
                onChange={(e) => setNewEnrollments(e.target.value)}
                placeholder="e.g. 0901CS221085, 0901CS221086"
                required
                className="text-xs"
              />
            </div>

            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full text-xs h-9 bg-primary text-primary-foreground font-semibold"
            >
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Submit Group Registration"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Document Upload Modal */}
      <Dialog open={showDocUploadModal} onOpenChange={setShowDocUploadModal}>
        <DialogContent className="max-w-md p-6 sm:rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Submit Milestone Document</DialogTitle>
            <DialogDescription className="text-xs">
              Upload project synopsis, progress reports, presentation slides, or source code
              bundles.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedProject) return;
              uploadDocMutation.mutate({
                data: {
                  projectId: selectedProject.id,
                  type: docType,
                  title: docTitle,
                  fileName: docFileName || `${docType}.pdf`,
                },
              });
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Milestone Category</Label>
              <select
                value={docType}
                onChange={(e) =>
                  setDocType(
                    e.target.value as
                      "synopsis" | "report" | "ppt" | "documentation" | "final_project",
                  )
                }
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground"
              >
                <option value="synopsis">Project Synopsis</option>
                <option value="report">Progress Report / Mid-Term Report</option>
                <option value="ppt">Evaluation PPT Presentation</option>
                <option value="documentation">Complete SRS & Technical Documentation</option>
                <option value="final_project">Final Project Source Bundle & Report</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Document Title</Label>
              <Input
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g. Major Project Phase 1 Synopsis Report"
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">File Name</Label>
              <Input
                value={docFileName}
                onChange={(e) => setDocFileName(e.target.value)}
                placeholder="e.g. synopsis_phase1.pdf"
                required
                className="text-xs"
              />
            </div>

            <Button
              type="submit"
              disabled={uploadDocMutation.isPending}
              className="w-full text-xs h-9 bg-primary text-primary-foreground font-semibold"
            >
              {uploadDocMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Upload for Faculty Evaluation"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Project Details Modal */}
      <Dialog
        open={Boolean(selectedProject) && !showDocUploadModal}
        onOpenChange={(o) => !o && setSelectedProject(null)}
      >
        <DialogContent className="max-w-xl p-6 sm:rounded-xl space-y-4">
          {selectedProject && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {selectedProject.academicYear}
                  </Badge>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {selectedProject.status.replace("_", " ")}
                  </Badge>
                </div>
                <DialogTitle className="text-lg font-semibold">{selectedProject.title}</DialogTitle>
                <DialogDescription className="text-xs">
                  Guide: {selectedProject.facultyGuideName} · Team:{" "}
                  {selectedProject.studentNames.join(", ")}
                </DialogDescription>
              </DialogHeader>

              {/* Document Submissions List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Submitted Milestone Documents ({selectedProject.documents.length})
                </h4>
                {selectedProject.documents.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                    No documents uploaded yet. Submit your synopsis or report above.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {selectedProject.documents.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">{d.title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {d.fileName} · Submitted on{" "}
                              {new Date(d.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {d.type.replace("_", " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Faculty Evaluation Section (for teachers/admins) */}
              {(user.role === "teacher" || user.role === "admin") && (
                <div className="p-4 rounded-xl bg-secondary/50 border border-border/70 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Faculty Guide Evaluation & Progress Grading
                  </h4>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <Label className="text-xs">Milestone Progress (%)</Label>
                      <span className="font-bold">{reviewProgress}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={reviewProgress}
                      onChange={(e) => setReviewProgress(Number(e.target.value))}
                      className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Guide Feedback & Directions</Label>
                    <textarea
                      value={reviewFeedback}
                      onChange={(e) => setReviewFeedback(e.target.value)}
                      placeholder="Write evaluation feedback for the student group..."
                      rows={2}
                      className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground"
                    />
                  </div>

                  <Button
                    size="sm"
                    disabled={reviewMutation.isPending}
                    onClick={() =>
                      reviewMutation.mutate({
                        data: {
                          projectId: selectedProject.id,
                          progressPercentage: reviewProgress,
                          status: reviewStatus,
                          facultyFeedback: reviewFeedback,
                        },
                      })
                    }
                    className="w-full text-xs h-8"
                  >
                    Save Guide Evaluation
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
