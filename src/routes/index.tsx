import { Link, createFileRoute } from "@tanstack/react-router";
import { BookOpen, Bot, GraduationCap, LayoutDashboard, ShieldCheck, Users } from "lucide-react";

const logoAsset = { url: "/mits-logo.png" };
import { ThemeToggle } from "@/frontend/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Study AI — MITS Gwalior Learning Platform" },
      {
        name: "description",
        content:
          "Smart Study AI is the academic platform for MITS Gwalior: academic spaces, digital library, grounded AI assistance, quizzes and project management.",
      },
      { property: "og:title", content: "Smart Study AI — MITS Gwalior Learning Platform" },
      {
        property: "og:description",
        content:
          "Academic spaces, digital library, grounded AI assistance and project management for students, teachers and administrators at MITS Gwalior.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: LayoutDashboard,
    title: "Academic Spaces",
    body: "Level → Department → Programme → Semester. Every note, book and quiz belongs to a space, so nobody re-selects filters twice.",
  },
  {
    icon: BookOpen,
    title: "Digital Library & Notes",
    body: "Books, notes, PYQs, lab manuals and practice banks with search, bookmarks and online reading.",
  },
  {
    icon: Bot,
    title: "Grounded AI Assistant",
    body: "Answers are retrieved from your own notes, materials, PYQs and library first — with sources shown.",
  },
  {
    icon: Users,
    title: "Teacher Workspaces",
    body: "Upload directly into a space, publish announcements, create quizzes and evaluate projects.",
  },
  {
    icon: ShieldCheck,
    title: "Institute-Only Access",
    body: "Only @mitsgwl.ac.in accounts registered by the administration can activate a login.",
  },
  {
    icon: GraduationCap,
    title: "Promotion & Analytics",
    body: "Bulk semester promotion updates academic space access instantly, with usage analytics for every role.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <img src={logoAsset.url} alt="MITS Gwalior" className="size-10 rounded-full" />
          <div className="leading-tight">
            <p className="text-sm font-semibold">Smart Study AI</p>
            <p className="text-xs text-muted-foreground">MITS Gwalior</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <p className="mx-auto w-fit rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
          Madhav Institute of Technology and Science, Gwalior
        </p>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          One academic platform for students, teachers and administration
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground">
          Learning material, digital library, AI assistance grounded in your own coursework, quizzes
          and project supervision — organised by academic space and driven entirely by institute
          data.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Activate your account</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/forgot-password">Forgot password</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-border/80">
              <CardHeader>
                <feature.icon className="size-5 text-primary" />
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{feature.body}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Smart Study AI · Madhav Institute of Technology and Science, Gwalior
      </footer>
    </div>
  );
}
