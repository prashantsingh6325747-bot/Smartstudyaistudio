import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Megaphone,
  Calendar,
  AlertTriangle,
  FileText,
  Clock,
  Plus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { listAnnouncements, createAnnouncement } from "@/backend/announcement.functions";
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
import type { AnnouncementDTO, UserDTO } from "@/shared/types";

export function AnnouncementsFeed({ user }: { user: UserDTO }) {
  const queryClient = useQueryClient();
  const [showPostModal, setShowPostModal] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<"quiz" | "notes" | "assignment" | "deadline" | "academic">(
    "academic",
  );

  const annQuery = useQuery({
    queryKey: ["announcements"],
    queryFn: () => listAnnouncements(),
  });

  const postMutation = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      toast.success("Institutional announcement published!");
      setShowPostModal(false);
      setNewTitle("");
      setNewContent("");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  const announcements = annQuery.data ?? [];
  const filtered =
    filterType === "all" ? announcements : announcements.filter((a) => a.type === filterType);

  const getTypeBadge = (type: AnnouncementDTO["type"]) => {
    switch (type) {
      case "quiz":
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/20"
          >
            Quiz
          </Badge>
        );
      case "deadline":
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/20"
          >
            Deadline
          </Badge>
        );
      case "assignment":
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20"
          >
            Assignment
          </Badge>
        );
      case "notes":
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20"
          >
            Notes
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
          >
            Academic
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">
              Academic Circulars & Notices
            </h3>
            <Badge
              variant="outline"
              className="text-xs bg-primary/10 text-primary border-primary/20"
            >
              Live Updates
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Official announcements, assignment deadlines, and quiz schedule notifications.
          </p>
        </div>

        {(user.role === "teacher" || user.role === "admin") && (
          <Button
            size="sm"
            className="text-xs h-9 gap-1.5 shrink-0"
            onClick={() => setShowPostModal(true)}
          >
            <Plus className="size-4" /> Post Notice
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {["all", "academic", "deadline", "quiz", "assignment", "notes"].map((t) => (
          <Button
            key={t}
            variant={filterType === t ? "default" : "outline"}
            size="sm"
            className="text-xs rounded-full h-8 shrink-0 capitalize"
            onClick={() => setFilterType(t)}
          >
            {t === "all" ? "All Notices" : t}
          </Button>
        ))}
      </div>

      {/* Announcements Stream */}
      {annQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl border border-border/60 bg-muted/30 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-xs text-muted-foreground">
          No notices currently posted for this category.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className="border-border/70 shadow-sm hover:border-primary/40 transition-colors"
            >
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    {getTypeBadge(item.type)}
                    <span className="font-semibold text-sm text-foreground">{item.title}</span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">{item.content}</p>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Published by {item.authorName} ({item.authorRole}) ·{" "}
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Post Modal */}
      <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
        <DialogContent className="max-w-md p-6 sm:rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Post Institutional Notice</DialogTitle>
            <DialogDescription className="text-xs">
              Broadcast academic deadlines, quiz dates, or study material updates to students.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              postMutation.mutate({
                data: {
                  title: newTitle,
                  content: newContent,
                  type: newType,
                  targetProgramId: user.programId,
                  targetSemester: user.semester,
                },
              });
            }}
            className="space-y-3.5 pt-2"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Notice Type</Label>
              <select
                value={newType}
                onChange={(e) =>
                  setNewType(
                    e.target.value as "quiz" | "notes" | "assignment" | "deadline" | "academic",
                  )
                }
                className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
              >
                <option value="academic">Academic Circular</option>
                <option value="deadline">Submission Deadline</option>
                <option value="quiz">Exam / Quiz Notice</option>
                <option value="assignment">Assignment Update</option>
                <option value="notes">Notes Uploaded</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Mid-Term Examination Schedule Announced"
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Notice Details & Instructions</Label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Write the full notice text here..."
                rows={4}
                required
                className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground"
              />
            </div>

            <Button
              type="submit"
              disabled={postMutation.isPending}
              className="w-full text-xs h-9 bg-primary text-primary-foreground font-semibold"
            >
              {postMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Publish Notice"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
