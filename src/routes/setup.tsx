import { Link, createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Database } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminExists, bootstrapAdmin, getDatabaseStatus } from "@/authentication/auth.functions";
import { COLLEGE_EMAIL_DOMAIN } from "@/shared/types";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Administrator setup — Smart Study AI" },
      {
        name: "description",
        content:
          "One-time creation of the first Smart Study AI administrator account for MITS Gwalior.",
      },
      { property: "og:title", content: "Administrator setup — Smart Study AI" },
      {
        property: "og:description",
        content: "Create the first administrator account for the MITS Gwalior platform.",
      },
    ],
  }),
  loader: async () => {
    const [admin, dbStatus] = await Promise.all([
      adminExists().catch(() => ({ exists: false })),
      getDatabaseStatus().catch(() => ({ mode: "in-memory" as const, connected: true })),
    ]);
    if (admin.exists) throw redirect({ to: "/auth" });
    return { dbStatus };
  },

  component: SetupPage,
});

function SetupPage() {
  const { dbStatus } = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  const create = useServerFn(bootstrapAdmin);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-12">
      <Card className="w-full max-w-md shadow-panel">
        <CardHeader>
          <div className="mb-2">
            {dbStatus.mode === "direct" ? (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Connected to MongoDB</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <Database className="h-3.5 w-3.5 text-primary" />
                <span>In-Memory Mode (Add MONGODB_URI to use real MongoDB)</span>
              </div>
            )}
          </div>
          <CardTitle>Create the first administrator</CardTitle>
          <CardDescription>
            This one-time step is only available while no administrator exists. Use an @
            {COLLEGE_EMAIL_DOMAIN} address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              try {
                const res = await create({ data: form });
                if (res.token && typeof window !== "undefined") {
                  try {
                    localStorage.setItem("ssai_token", res.token);
                  } catch {
                    // ignore
                  }
                }
                toast.success("Administrator account created.");
                await router.invalidate();
                navigate({ to: "/admin" });
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Setup failed.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="setup-name">Full name</Label>
              <Input
                id="setup-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-email">College email</Label>
              <Input
                id="setup-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-phone">Phone number</Label>
              <Input
                id="setup-phone"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-password">Password</Label>
              <Input
                id="setup-password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Creating…" : "Create administrator"}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/auth" className="underline underline-offset-4">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
