import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  BookOpen,
  FileText,
  FileQuestion,
  HelpCircle,
  Sparkles,
  Briefcase,
  Bell,
  UserCheck,
  FolderTree,
  LayoutDashboard,
  Layers,
  GraduationCap,
  ListChecks,
} from "lucide-react";

import { AppShell } from "@/frontend/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { changePassword, getMe } from "@/authentication/auth.functions";
import { listPrograms } from "@/backend/academics.functions";
import { LEVEL_LABEL } from "@/shared/types";
import type { AcademicDocumentDTO, LibraryBookDTO } from "@/shared/types";

// Feature sub-components
import { StudentProgressOverview } from "@/frontend/components/student-progress-overview";
import { NotesSection } from "@/frontend/components/notes-section";
import { StudyMaterialsSection } from "@/frontend/components/study-materials-section";
import { PYQsSection } from "@/frontend/components/pyqs-section";
import { PracticeQuestionsSection } from "@/frontend/components/practice-questions-section";
import { DigitalLibrarySection } from "@/frontend/components/digital-library-section";
import { AIStudyAssistantSection } from "@/frontend/components/ai-study-assistant-section";
import { QuizzesSection } from "@/frontend/components/quizzes-section";
import { SDMSProjectsSection } from "@/frontend/components/sdms-projects-section";
import { TeacherSpaceSection } from "@/frontend/components/teacher-space-section";
import { AnnouncementsFeed } from "@/frontend/components/announcements-feed";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "MITS Academic Portal & Smart Study AI — MITS Gwalior" },
      {
        name: "description",
        content:
          "Official MITS Smart Study Platform: syllabus lecture notes, lab manuals, PYQ exam papers, AI assistant with grounded citations, SDMS projects, and teacher spaces.",
      },
      { property: "og:title", content: "Smart Study AI — MITS Gwalior" },
    ],
  }),
  loader: async () => {
    const me = await getMe();
    if (!me) throw redirect({ to: "/auth" });
    return { me };
  },
  component: Dashboard,
});

function Dashboard() {
  const { me } = Route.useLoaderData();
  const programsQuery = useQuery({ queryKey: ["programs"], queryFn: () => listPrograms() });
  const program = programsQuery.data?.find((p) => p.id === me.programId) ?? null;

  // Active tab navigation
  const [activeTab, setActiveTab] = useState<string>(
    me.role === "teacher" ? "teacher_space" : "overview",
  );

  // Context passed to AI Assistant when student clicks "Ask AI about this note / book"
  const [aiInitialQuestion, setAiInitialQuestion] = useState<string>("");
  const [aiInitialSubjectId, setAiInitialSubjectId] = useState<string>("");

  const handleOpenAiForDoc = (doc: AcademicDocumentDTO) => {
    setAiInitialSubjectId(doc.subjectId);
    setAiInitialQuestion(
      `Please explain and summarize key points from "${doc.title}" (${doc.chapterName ?? "Syllabus"}).`,
    );
    setActiveTab("ai_assistant");
  };

  const handleOpenAiForBook = (book: LibraryBookDTO) => {
    setAiInitialQuestion(
      `Summarize the key engineering principles covered in "${book.title}" by ${book.author}.`,
    );
    setActiveTab("ai_assistant");
  };

  return (
    <AppShell user={me}>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Welcome, {me.name}
              </h1>
              <Badge variant="outline" className="text-xs capitalize font-medium">
                {me.role}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Madhav Institute of Technology and Science, Gwalior (Autonomous UGC/NAAC A++)
            </p>
          </div>

          {/* Academic Space Badge */}
          {program && me.semester ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5 text-xs text-foreground font-medium">
              <GraduationCap className="size-4 text-primary" />
              <span>
                {program.code ?? program.name} · Semester {me.semester}
              </span>
            </div>
          ) : me.role === "admin" ? (
            <Link to="/admin">
              <Button size="sm" variant="outline" className="text-xs h-8">
                Administration Panel
              </Button>
            </Link>
          ) : null}
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto pb-1 scrollbar-none">
            <TabsList className="h-10 p-1 bg-secondary/70 border border-border/60 inline-flex min-w-full sm:min-w-0">
              {me.role === "teacher" ? (
                <>
                  <TabsTrigger value="teacher_space" className="text-xs gap-1.5 px-3">
                    <FolderTree className="size-3.5" /> Academic Space Hub
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="text-xs gap-1.5 px-3">
                    <Briefcase className="size-3.5" /> SDMS Projects
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs gap-1.5 px-3">
                    <FileText className="size-3.5" /> Notes
                  </TabsTrigger>
                  <TabsTrigger value="library" className="text-xs gap-1.5 px-3">
                    <BookOpen className="size-3.5" /> Digital Library
                  </TabsTrigger>
                  <TabsTrigger value="ai_assistant" className="text-xs gap-1.5 px-3">
                    <Sparkles className="size-3.5 text-primary" /> AI Assistant
                  </TabsTrigger>
                  <TabsTrigger value="announcements" className="text-xs gap-1.5 px-3">
                    <Bell className="size-3.5" /> Circulars
                  </TabsTrigger>
                  <TabsTrigger value="profile" className="text-xs gap-1.5 px-3">
                    <UserCheck className="size-3.5" /> Profile
                  </TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="overview" className="text-xs gap-1.5 px-3">
                    <LayoutDashboard className="size-3.5" /> Progress
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs gap-1.5 px-3">
                    <FileText className="size-3.5" /> Notes
                  </TabsTrigger>
                  <TabsTrigger value="materials" className="text-xs gap-1.5 px-3">
                    <Layers className="size-3.5" /> Lab & Materials
                  </TabsTrigger>
                  <TabsTrigger value="pyqs" className="text-xs gap-1.5 px-3">
                    <FileQuestion className="size-3.5" /> PYQs
                  </TabsTrigger>
                  <TabsTrigger value="practice" className="text-xs gap-1.5 px-3">
                    <ListChecks className="size-3.5" /> Practice
                  </TabsTrigger>
                  <TabsTrigger value="library" className="text-xs gap-1.5 px-3">
                    <BookOpen className="size-3.5" /> Library
                  </TabsTrigger>
                  <TabsTrigger value="ai_assistant" className="text-xs gap-1.5 px-3">
                    <Sparkles className="size-3.5 text-primary" /> AI Assistant
                  </TabsTrigger>
                  <TabsTrigger value="quizzes" className="text-xs gap-1.5 px-3">
                    <HelpCircle className="size-3.5" /> Quizzes
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="text-xs gap-1.5 px-3">
                    <Briefcase className="size-3.5" /> SDMS Projects
                  </TabsTrigger>
                  <TabsTrigger value="announcements" className="text-xs gap-1.5 px-3">
                    <Bell className="size-3.5" /> Notices
                  </TabsTrigger>
                  <TabsTrigger value="profile" className="text-xs gap-1.5 px-3">
                    <UserCheck className="size-3.5" /> Profile
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          </div>

          {/* Teacher Academic Space */}
          <TabsContent value="teacher_space">
            <TeacherSpaceSection user={me} />
          </TabsContent>

          {/* Student Overview & Real Progress */}
          <TabsContent value="overview" className="space-y-6">
            <StudentProgressOverview user={me} />

            <div className="grid gap-6 md:grid-cols-2">
              <AnnouncementsFeed user={me} />

              <Card className="border-border/80 shadow-sm">
                <CardHeader className="p-4 pb-3 border-b border-border/60">
                  <CardTitle className="text-sm font-semibold">Assigned Academic Space</CardTitle>
                  <CardDescription className="text-xs">
                    Access is securely bound to your designated academic group.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 text-xs space-y-2">
                  {program && me.semester ? (
                    <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-1">
                      <p className="font-semibold text-foreground">
                        {program.name} ({program.code})
                      </p>
                      <p className="text-muted-foreground">
                        Department: {program.departmentName} · Semester: {me.semester}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No academic space assigned. Contact Dean Academics.
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Document visibility and exam eligibility are strictly enforced on the server.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 7. Notes */}
          <TabsContent value="notes">
            <NotesSection user={me} onOpenAiForDoc={handleOpenAiForDoc} />
          </TabsContent>

          {/* 8. Study Materials & Lab Manuals */}
          <TabsContent value="materials">
            <StudyMaterialsSection user={me} onOpenAiForDoc={handleOpenAiForDoc} />
          </TabsContent>

          {/* 9. Previous Year Questions (PYQ) */}
          <TabsContent value="pyqs">
            <PYQsSection user={me} onOpenAiForDoc={handleOpenAiForDoc} />
          </TabsContent>

          {/* 10. Practice Questions */}
          <TabsContent value="practice">
            <PracticeQuestionsSection user={me} onOpenAiForDoc={handleOpenAiForDoc} />
          </TabsContent>

          {/* 11. Digital Library */}
          <TabsContent value="library">
            <DigitalLibrarySection user={me} onOpenAiWithContext={handleOpenAiForBook} />
          </TabsContent>

          {/* 16, 17, 18. AI Study Assistant with Grounding & MongoDB Chat History */}
          <TabsContent value="ai_assistant">
            <AIStudyAssistantSection
              user={me}
              initialQuestion={aiInitialQuestion}
              initialSubjectId={aiInitialSubjectId}
            />
          </TabsContent>

          {/* 20-24. Quizzes & Tests Engine */}
          <TabsContent value="quizzes">
            <QuizzesSection user={me} />
          </TabsContent>

          {/* 26 & 27. SDMS-Style Project Management */}
          <TabsContent value="projects">
            <SDMSProjectsSection user={me} />
          </TabsContent>

          {/* 28. Announcements & Notifications */}
          <TabsContent value="announcements">
            <AnnouncementsFeed user={me} />
          </TabsContent>

          {/* User Profile & Password Security */}
          <TabsContent value="profile">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border/80 shadow-sm">
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="text-sm font-semibold">User Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs p-4 pt-0">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Full Name</span>
                    <span className="font-medium text-foreground">{me.name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Registered Email</span>
                    <span className="font-medium text-foreground">{me.email}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Phone Number</span>
                    <span className="font-medium text-foreground">{me.phone}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Enrollment Number</span>
                    <span className="font-mono font-medium text-foreground">
                      {me.enrollmentNo || "Faculty / Admin"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Role</span>
                    <span className="font-semibold capitalize text-foreground">{me.role}</span>
                  </div>
                </CardContent>
              </Card>

              <ChangePasswordCard />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function ChangePasswordCard() {
  const change = useServerFn(changePassword);
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-sm font-semibold">Change Account Password</CardTitle>
        <CardDescription className="text-xs">
          Must be at least 8 characters with letters and digits.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            try {
              await change({ data: { currentPassword, newPassword } });
              toast.success("Password updated successfully.");
              setCurrent("");
              setNew("");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Unable to change password.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="current-password" className="text-xs">
              Current Password
            </Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrent(e.target.value)}
              required
              className="text-xs h-9"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="next-password" className="text-xs">
              New Password
            </Label>
            <Input
              id="next-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNew(e.target.value)}
              required
              className="text-xs h-9"
            />
          </div>
          <Button type="submit" disabled={busy} className="text-xs h-8">
            {busy ? "Updating…" : "Update Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
