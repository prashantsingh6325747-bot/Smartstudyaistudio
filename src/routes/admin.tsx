import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Database, Server, BookOpen, UserCheck, Plus } from "lucide-react";

import { AppShell, EmptyState } from "@/frontend/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminStats,
  createUser,
  initializeStructure,
  listAcademicSpaces,
  listPrograms,
  listUsers,
  promoteStudents,
  updateUserAcademics,
} from "@/backend/academics.functions";
import {
  listSubjects,
  createSubject,
  assignSubjectTeacher,
} from "@/backend/academic-content.functions";
import { getMe, getDatabaseStatus } from "@/authentication/auth.functions";
import { LEVEL_LABEL } from "@/shared/types";
import type { AcademicLevel, ProgramDTO, Role, SubjectDTO, UserDTO } from "@/shared/types";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Smart Study AI, MITS Gwalior" },
      {
        name: "description",
        content:
          "Manage users, departments, programmes, academic spaces and semester promotion for MITS Gwalior on Smart Study AI.",
      },
      { property: "og:title", content: "Administration — Smart Study AI" },
      {
        property: "og:description",
        content: "User management, academic structure and semester promotion for MITS Gwalior.",
      },
    ],
  }),
  loader: async () => {
    const [me, dbStatus] = await Promise.all([
      getMe(),
      getDatabaseStatus().catch(() => ({ mode: "in-memory" as const, connected: true })),
    ]);
    if (!me) throw redirect({ to: "/auth" });
    if (me.role !== "admin") throw redirect({ to: "/dashboard" });
    return { me, dbStatus };
  },
  component: AdminPage,
});

function AdminPage() {
  const { me, dbStatus } = Route.useLoaderData();
  const statsQuery = useQuery({ queryKey: ["adminStats"], queryFn: () => adminStats() });
  const programsQuery = useQuery({ queryKey: ["programs"], queryFn: () => listPrograms() });
  const stats = statsQuery.data;

  return (
    <AppShell user={me}>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Administration</h1>
            <p className="text-sm text-muted-foreground">
              Institute-wide control of users, academic structure and promotion.
            </p>
          </div>
          <div>
            {dbStatus.mode === "direct" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                MongoDB Atlas Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                <Database className="h-3.5 w-3.5 text-primary" />
                In-Memory Database
              </span>
            )}
          </div>
        </div>

        {dbStatus.mode === "in-memory" && (
          <div className="rounded-lg border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <Database className="mt-0.5 h-5 w-5 text-primary shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Want to use real data from MongoDB?</p>
                <p className="mt-1 text-muted-foreground">
                  Your app is currently running in local in-memory mode. To persist and load real
                  data from MongoDB Atlas or your MongoDB server, open the <strong>Settings</strong>{" "}
                  menu in AI Studio and add your{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                    MONGODB_URI
                  </code>{" "}
                  environment variable (e.g.{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                    mongodb+srv://...
                  </code>
                  ).
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Students" value={stats?.students} />
          <Stat label="Teachers" value={stats?.teachers} />
          <Stat label="Programmes" value={stats?.programCount} />
          <Stat label="Academic spaces" value={stats?.spaceCount} />
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="subjects">Subject & Faculty Allocation</TabsTrigger>
            <TabsTrigger value="structure">Academic structure</TabsTrigger>
            <TabsTrigger value="promotion">Promotion</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="pt-6">
            <UsersPanel programs={programsQuery.data ?? []} />
          </TabsContent>
          <TabsContent value="subjects" className="pt-6">
            <SubjectAllocationPanel programs={programsQuery.data ?? []} />
          </TabsContent>
          <TabsContent value="structure" className="pt-6">
            <StructurePanel />
          </TabsContent>
          <TabsContent value="promotion" className="pt-6">
            <PromotionPanel programs={programsQuery.data ?? []} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-semibold">{value ?? "—"}</p>
      </CardContent>
    </Card>
  );
}

function UsersPanel({ programs }: { programs: ProgramDTO[] }) {
  const queryClient = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const addUser = useServerFn(createUser);
  const updateUser = useServerFn(updateUserAcademics);

  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | "all">("all");
  const usersQuery = useQuery({
    queryKey: ["users", role, search],
    queryFn: () => fetchUsers({ data: { role, search, programId: "" } }),
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    enrollmentNo: "",
    role: "student" as Role,
    programId: "",
    semester: "1",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const program = programs.find((p) => p.id === form.programId) ?? null;
      return addUser({
        data: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          enrollmentNo: form.enrollmentNo,
          academicLevel: program ? program.level : null,
          departmentId: program ? program.departmentId : "",
          programId: form.programId,
          semester: form.role === "student" ? Number(form.semester) : null,
        },
      });
    },
    onSuccess: () => {
      toast.success("User registered. They can now activate their password.");
      setForm({
        name: "",
        email: "",
        phone: "",
        enrollmentNo: "",
        role: "student",
        programId: "",
        semester: "1",
      });
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Unable to register user."),
  });

  const users = usersQuery.data ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Register a user</CardTitle>
          <CardDescription>
            Registered users activate their own password from the sign-up screen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <Field label="Full name">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
            <Field label="College email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </Field>
            <Field label="Phone number">
              <Input
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </Field>
            <Field label="Role">
              <Select
                value={form.role}
                onValueChange={(value) => setForm({ ...form, role: value as Role })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {form.role === "student" ? (
              <Field label="Enrollment number">
                <Input
                  value={form.enrollmentNo}
                  onChange={(e) => setForm({ ...form, enrollmentNo: e.target.value })}
                  required
                />
              </Field>
            ) : null}
            <Field label="Programme">
              <Select
                value={form.programId}
                onValueChange={(value) => setForm({ ...form, programId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a programme" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {LEVEL_LABEL[program.level]} · {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {form.role === "student" ? (
              <Field label="Semester">
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={form.semester}
                  onChange={(e) => setForm({ ...form, semester: e.target.value })}
                />
              </Field>
            ) : null}
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving…" : "Register user"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="text-base">Directory</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search name, email, enrollment"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={role} onValueChange={(value) => setRole(value as Role | "all")}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="teacher">Teachers</SelectItem>
                <SelectItem value="admin">Administrators</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : users.length === 0 ? (
            <EmptyState
              title="No data available"
              description="No users match this filter yet. Register a user to get started."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Programme</TableHead>
                    <TableHead>Sem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const program = programs.find((p) => p.id === user.programId);
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell className="capitalize">{user.role}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {program?.name ?? "—"}
                        </TableCell>
                        <TableCell>{user.semester ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={user.hasPassword ? "secondary" : "outline"}>
                            {user.active ? (user.hasPassword ? "Active" : "Pending") : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              try {
                                await updateUser({
                                  data: {
                                    userId: user.id,
                                    academicLevel: user.academicLevel as AcademicLevel | null,
                                    departmentId: user.departmentId ?? "",
                                    programId: user.programId ?? "",
                                    semester: user.semester,
                                    active: !user.active,
                                  },
                                });
                                toast.success("User updated.");
                                void queryClient.invalidateQueries({ queryKey: ["users"] });
                              } catch (error) {
                                toast.error(
                                  error instanceof Error ? error.message : "Update failed.",
                                );
                              }
                            }}
                          >
                            {user.active ? "Disable" : "Enable"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StructurePanel() {
  const queryClient = useQueryClient();
  const initialize = useServerFn(initializeStructure);
  const spacesQuery = useQuery({ queryKey: ["spaces"], queryFn: () => listAcademicSpaces() });
  const spaces = spacesQuery.data ?? [];

  const initMutation = useMutation({
    mutationFn: () => initialize({}),
    onSuccess: (result) => {
      toast.success(
        `Structure synced: ${result.departmentCount} departments, ${result.programCount} programmes, ${result.spaceCount} academic spaces.`,
      );
      void queryClient.invalidateQueries();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Sync failed."),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">MITS academic structure</CardTitle>
          <CardDescription>
            Writes the official MITS Gwalior departments, programmes and per-semester academic
            spaces into the database. Safe to re-run; existing records are updated, never
            duplicated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => initMutation.mutate()} disabled={initMutation.isPending}>
            {initMutation.isPending ? "Syncing…" : "Sync academic structure"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Academic spaces ({spaces.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {spacesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : spaces.length === 0 ? (
            <EmptyState
              title="No data available"
              description="No academic spaces exist yet. Sync the academic structure to create them."
            />
          ) : (
            <ul className="grid gap-1 text-sm md:grid-cols-2">
              {spaces.slice(0, 200).map((space) => (
                <li key={space.id} className="rounded-md border border-border/60 px-3 py-2">
                  {space.label}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PromotionPanel({ programs }: { programs: ProgramDTO[] }) {
  const queryClient = useQueryClient();
  const promote = useServerFn(promoteStudents);
  const [programId, setProgramId] = useState("");
  const [fromSemester, setFromSemester] = useState("1");

  const mutation = useMutation({
    mutationFn: () => promote({ data: { programId, fromSemester: Number(fromSemester) } }),
    onSuccess: (result) => {
      toast.success(`${result.promoted} students promoted to semester ${result.toSemester}.`);
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Promotion failed."),
  });

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-base">Bulk semester promotion</CardTitle>
        <CardDescription>
          Moves every student of a programme from one semester to the next, updating their academic
          space access immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Programme">
          <Select value={programId} onValueChange={setProgramId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a programme" />
            </SelectTrigger>
            <SelectContent>
              {programs.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {LEVEL_LABEL[program.level]} · {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Promote from semester">
          <Input
            type="number"
            min={1}
            max={12}
            value={fromSemester}
            onChange={(e) => setFromSemester(e.target.value)}
          />
        </Field>
        <Button onClick={() => mutation.mutate()} disabled={!programId || mutation.isPending}>
          {mutation.isPending ? "Promoting…" : "Promote students"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SubjectAllocationPanel({ programs }: { programs: ProgramDTO[] }) {
  const queryClient = useQueryClient();
  const [selectedProgramId, setSelectedProgramId] = useState<string>(programs[0]?.id || "");
  const [selectedSemester, setSelectedSemester] = useState<string>("1");

  // New Subject form state
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newCredits, setNewCredits] = useState("4");
  const [newBatch, setNewBatch] = useState("2024-2028");
  const [newTeacherId, setNewTeacherId] = useState<string>("unassigned");

  // Quick edit assignment modal/state
  const [editingSubject, setEditingSubject] = useState<SubjectDTO | null>(null);
  const [editTeacherId, setEditTeacherId] = useState<string>("unassigned");
  const [editBatch, setEditBatch] = useState("");

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => listUsers(),
  });

  const subjectsQuery = useQuery({
    queryKey: ["admin-subjects", selectedProgramId, selectedSemester],
    queryFn: () =>
      listSubjects({
        data: {
          programId: selectedProgramId || undefined,
          semester: selectedSemester ? Number(selectedSemester) : undefined,
        },
      }),
  });

  const teachers = (usersQuery.data ?? []).filter((u) => u.role === "teacher");
  const subjects = subjectsQuery.data ?? [];

  const createSubjectFn = useServerFn(createSubject);
  const createMutation = useMutation({
    mutationFn: () =>
      createSubjectFn({
        data: {
          code: newCode.trim(),
          name: newName.trim(),
          programId: selectedProgramId,
          semester: Number(selectedSemester),
          credits: Number(newCredits) || 4,
          chapters: [],
          batch: newBatch.trim(),
          assignedTeacherId: newTeacherId === "unassigned" ? undefined : newTeacherId,
        },
      }),
    onSuccess: () => {
      toast.success("Subject created and assigned successfully!");
      setShowCreateSubject(false);
      setNewCode("");
      setNewName("");
      setNewBatch("2024-2028");
      setNewTeacherId("unassigned");
      void queryClient.invalidateQueries({ queryKey: ["admin-subjects"] });
      void queryClient.invalidateQueries({ queryKey: ["teacher-subjects"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to create subject.");
    },
  });

  const assignSubjectFn = useServerFn(assignSubjectTeacher);
  const assignMutation = useMutation({
    mutationFn: (vars: { subjectId: string; teacherId: string | null; batch?: string }) =>
      assignSubjectFn({
        data: {
          subjectId: vars.subjectId,
          assignedTeacherId: vars.teacherId,
          batch: vars.batch,
        },
      }),
    onSuccess: () => {
      toast.success("Subject teacher & batch allocation updated.");
      setEditingSubject(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-subjects"] });
      void queryClient.invalidateQueries({ queryKey: ["teacher-subjects"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Allocation update failed.");
    },
  });

  return (
    <div className="space-y-6">
      {/* Allocation Header & Filter */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                Subject & Faculty Allocation Management
              </CardTitle>
              <CardDescription>
                Assign course subjects, subject codes, and academic batches (e.g. 2022-2026, Section
                A) to designated faculty members.
              </CardDescription>
            </div>

            <Button
              onClick={() => setShowCreateSubject((prev) => !prev)}
              size="sm"
              className="gap-1.5"
            >
              <Plus className="size-4" />
              {showCreateSubject ? "Close Form" : "Add New Subject"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Filter by Programme">
              <Select
                value={selectedProgramId}
                onValueChange={(val) => {
                  setSelectedProgramId(val);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select programme" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {LEVEL_LABEL[p.level]} · {p.name} ({p.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Filter by Semester">
              <Select value={selectedSemester} onValueChange={(val) => setSelectedSemester(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      Semester {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* New Subject Form Drawer / Card */}
      {showCreateSubject && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Create New Subject & Initial Allocation
            </CardTitle>
            <CardDescription className="text-xs">
              Assign subject code, title, credits, batch, and assigned teacher.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Subject Code (e.g. 100301, CS-501)">
                <Input
                  placeholder="e.g. 100301"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                />
              </Field>

              <Field label="Subject Name">
                <Input
                  placeholder="e.g. Data Structures & Algorithms"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </Field>

              <Field label="Credits">
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={newCredits}
                  onChange={(e) => setNewCredits(e.target.value)}
                />
              </Field>

              <Field label="Batch / Section (e.g. 2024-2028, Batch A)">
                <Input
                  placeholder="e.g. 2024-2028"
                  value={newBatch}
                  onChange={(e) => setNewBatch(e.target.value)}
                />
              </Field>

              <Field label="Assign Faculty / Teacher">
                <Select value={newTeacherId} onValueChange={setNewTeacherId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!newCode.trim() || !newName.trim() || createMutation.isPending}
                size="sm"
              >
                {createMutation.isPending ? "Creating…" : "Save Subject & Allocation"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateSubject(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subjects & Allocation Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Allocated Subjects ({subjects.length})</CardTitle>
          <CardDescription>
            List of subjects for Semester {selectedSemester} with current faculty teacher assignment
            and batch tags.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <EmptyState
              title="No subjects created for this semester"
              description="Click 'Add New Subject' above to add subjects and assign them to teachers and student batches."
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject Code</TableHead>
                    <TableHead>Subject Name</TableHead>
                    <TableHead>Programme & Sem</TableHead>
                    <TableHead>Batch / Section</TableHead>
                    <TableHead>Assigned Faculty</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((sub) => {
                    const isEditing = editingSubject?.id === sub.id;

                    return (
                      <TableRow key={sub.id}>
                        <TableCell className="font-mono font-semibold text-xs">
                          {sub.code}
                        </TableCell>
                        <TableCell className="font-medium">
                          {sub.name}
                          {sub.credits ? (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({sub.credits} cr)
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {sub.programName ?? "Programme"} · Sem {sub.semester}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editBatch}
                              onChange={(e) => setEditBatch(e.target.value)}
                              placeholder="Batch (e.g. 2024-2028)"
                              className="h-8 w-36 text-xs"
                            />
                          ) : (
                            <Badge variant="outline" className="font-normal text-xs">
                              {sub.batch ? sub.batch : "All Batches"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Select value={editTeacherId} onValueChange={setEditTeacherId}>
                              <SelectTrigger className="h-8 w-48 text-xs">
                                <SelectValue placeholder="Assign teacher" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                                {teachers.map((t) => (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : sub.assignedTeacherName ? (
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span className="font-medium text-xs">{sub.assignedTeacherName}</span>
                              {sub.assignedTeacherEmail ? (
                                <span className="text-[11px] text-muted-foreground">
                                  ({sub.assignedTeacherEmail})
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-[11px] text-amber-700 dark:text-amber-300"
                            >
                              Unassigned
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                className="h-7 px-2.5 text-xs"
                                disabled={assignMutation.isPending}
                                onClick={() =>
                                  assignMutation.mutate({
                                    subjectId: sub.id,
                                    teacherId:
                                      editTeacherId === "unassigned" ? null : editTeacherId,
                                    batch: editBatch.trim(),
                                  })
                                }
                              >
                                {assignMutation.isPending ? "Saving…" : "Save"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => setEditingSubject(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => {
                                setEditingSubject(sub);
                                setEditTeacherId(sub.assignedTeacherId || "unassigned");
                                setEditBatch(sub.batch || "");
                              }}
                            >
                              Assign / Reallocate
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
