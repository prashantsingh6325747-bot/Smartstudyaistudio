import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { collection, COLLECTIONS, ObjectId } from "@/backend/mongo.server";
import { hashPassword, requireRole, toUserDTO } from "@/authentication/auth.server";
import { MITS_STRUCTURE } from "@/backend/mits-structure";
import type { AcademicSpaceDTO, DepartmentDTO, ProgramDTO, UserDTO } from "@/shared/types";

export const listDepartments = createServerFn({ method: "GET" }).handler(
  async (): Promise<DepartmentDTO[]> => {
    const departments = await collection(COLLECTIONS.departments);
    const docs = await departments.find({}).sort({ name: 1 }).toArray();
    return docs.map((d) => ({
      id: d._id.toString(),
      name: String(d["name"]),
      code: String(d["code"]),
    }));
  },
);

export const listPrograms = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProgramDTO[]> => {
    const programsCol = await collection(COLLECTIONS.programs);
    const departmentsCol = await collection(COLLECTIONS.departments);
    const [programs, departments] = await Promise.all([
      programsCol.find({}).sort({ name: 1 }).toArray(),
      departmentsCol.find({}).toArray(),
    ]);
    const deptName = new Map(departments.map((d) => [d._id.toString(), String(d["name"])]));
    return programs.map((p) => ({
      id: p._id.toString(),
      name: String(p["name"]),
      code: String(p["code"]),
      level: p["level"] as ProgramDTO["level"],
      departmentId: String(p["departmentId"]),
      departmentName: deptName.get(String(p["departmentId"])) ?? "Unknown department",
      durationSemesters: Number(p["durationSemesters"] ?? 8),
    }));
  },
);

export const listAcademicSpaces = createServerFn({ method: "GET" }).handler(
  async (): Promise<AcademicSpaceDTO[]> => {
    const spacesCol = await collection(COLLECTIONS.academicSpaces);
    const programsCol = await collection(COLLECTIONS.programs);
    const departmentsCol = await collection(COLLECTIONS.departments);
    const [spaces, programs, departments] = await Promise.all([
      spacesCol.find({}).sort({ level: 1, semester: 1 }).toArray(),
      programsCol.find({}).toArray(),
      departmentsCol.find({}).toArray(),
    ]);
    const programMap = new Map(programs.map((p) => [p._id.toString(), p]));
    const deptMap = new Map(departments.map((d) => [d._id.toString(), String(d["name"])]));
    return spaces.map((s) => {
      const program = programMap.get(String(s["programId"]));
      const programName = program ? String(program["name"]) : "Unknown program";
      const departmentId = program ? String(program["departmentId"]) : "";
      const departmentName = deptMap.get(departmentId) ?? "Unknown department";
      const level = (s["level"] as AcademicSpaceDTO["level"]) ?? "UG";
      const semester = Number(s["semester"]);
      return {
        id: s._id.toString(),
        level,
        departmentId,
        departmentName,
        programId: String(s["programId"]),
        programName,
        semester,
        label: `${level} → ${departmentName} → ${programName} → Semester ${semester}`,
      };
    });
  },
);

export const initializeStructure = createServerFn({ method: "POST" }).handler(async () => {
  await requireRole("admin");
  const departmentsCol = await collection(COLLECTIONS.departments);
  const programsCol = await collection(COLLECTIONS.programs);
  const spacesCol = await collection(COLLECTIONS.academicSpaces);
  const levelsCol = await collection(COLLECTIONS.academicLevels);

  for (const level of [
    { code: "UG", name: "Undergraduate" },
    { code: "PG", name: "Postgraduate" },
    { code: "PHD", name: "PhD" },
  ]) {
    await levelsCol.updateOne({ code: level.code }, { $set: level }, { upsert: true });
  }

  let departmentCount = 0;
  let programCount = 0;
  let spaceCount = 0;

  for (const dept of MITS_STRUCTURE) {
    await departmentsCol.updateOne(
      { code: dept.code },
      { $set: { name: dept.name, code: dept.code }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
    const deptDoc = await departmentsCol.findOne({ code: dept.code });
    if (!deptDoc) continue;
    departmentCount += 1;

    for (const program of dept.programs) {
      await programsCol.updateOne(
        { code: program.code },
        {
          $set: {
            name: program.name,
            code: program.code,
            level: program.level,
            durationSemesters: program.durationSemesters,
            departmentId: deptDoc._id.toString(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true },
      );
      const programDoc = await programsCol.findOne({ code: program.code });
      if (!programDoc) continue;
      programCount += 1;

      for (let semester = 1; semester <= program.durationSemesters; semester += 1) {
        await spacesCol.updateOne(
          { programId: programDoc._id.toString(), semester },
          {
            $set: { level: program.level, programId: programDoc._id.toString(), semester },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true },
        );
        spaceCount += 1;
      }
    }
  }

  return { departmentCount, programCount, spaceCount };
});

export const listUsers = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        role: z.enum(["admin", "teacher", "student", "all"]).default("all"),
        search: z.string().trim().default(""),
        programId: z.string().trim().default(""),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<UserDTO[]> => {
    await requireRole("admin");
    const users = await collection(COLLECTIONS.users);
    const filter: Record<string, unknown> = {};
    if (data.role !== "all") filter["role"] = data.role;
    if (data.programId) filter["programId"] = data.programId;
    if (data.search) {
      const rx = new RegExp(data.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter["$or"] = [{ name: rx }, { email: rx }, { enrollmentNo: rx }, { phone: rx }];
    }
    const docs = await users.find(filter).sort({ createdAt: -1 }).limit(500).toArray();
    return docs.map(toUserDTO);
  });

export const createUser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(2),
        email: z.string().trim().toLowerCase().email(),
        phone: z
          .string()
          .trim()
          .regex(/^[0-9]{10}$/),
        role: z.enum(["admin", "teacher", "student"]),
        enrollmentNo: z.string().trim().default(""),
        academicLevel: z.enum(["UG", "PG", "PHD"]).nullable().default(null),
        departmentId: z.string().trim().default(""),
        programId: z.string().trim().default(""),
        semester: z.number().int().min(1).max(12).nullable().default(null),
        temporaryPassword: z.string().min(8).max(128).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await requireRole("admin");
    const users = await collection(COLLECTIONS.users);
    const existing = await users.findOne({ email: data.email });
    if (existing) throw new Error("A user with this email already exists.");
    if (data.role === "student" && !data.enrollmentNo) {
      throw new Error("Enrollment number is required for students.");
    }
    const passwordHash = data.temporaryPassword ? await hashPassword(data.temporaryPassword) : null;
    await users.insertOne({
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      enrollmentNo: data.enrollmentNo || null,
      academicLevel: data.academicLevel,
      departmentId: data.departmentId || null,
      programId: data.programId || null,
      semester: data.semester,
      passwordHash,
      active: true,
      createdAt: new Date(),
    });
    return { ok: true as const };
  });

export const updateUserAcademics = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().min(1),
        academicLevel: z.enum(["UG", "PG", "PHD"]).nullable(),
        departmentId: z.string().trim().default(""),
        programId: z.string().trim().default(""),
        semester: z.number().int().min(1).max(12).nullable(),
        role: z.enum(["admin", "teacher", "student"]).optional(),
        active: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await requireRole("admin");
    const users = await collection(COLLECTIONS.users);
    if (!ObjectId.isValid(data.userId)) throw new Error("Invalid user.");
    const update: Record<string, unknown> = {
      academicLevel: data.academicLevel,
      departmentId: data.departmentId || null,
      programId: data.programId || null,
      semester: data.semester,
      updatedAt: new Date(),
    };
    if (data.role) update["role"] = data.role;
    if (typeof data.active === "boolean") update["active"] = data.active;
    await users.updateOne({ _id: new ObjectId(data.userId) }, { $set: update });
    return { ok: true as const };
  });

export const promoteStudents = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        programId: z.string().min(1),
        fromSemester: z.number().int().min(1).max(12),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await requireRole("admin");
    const users = await collection(COLLECTIONS.users);
    const programs = await collection(COLLECTIONS.programs);
    if (!ObjectId.isValid(data.programId)) throw new Error("Invalid program.");
    const program = await programs.findOne({ _id: new ObjectId(data.programId) });
    if (!program) throw new Error("Program not found.");
    const duration = Number(program["durationSemesters"] ?? 8);
    if (data.fromSemester >= duration) {
      throw new Error("Students in the final semester cannot be promoted further.");
    }
    const result = await users.updateMany(
      { role: "student", programId: data.programId, semester: data.fromSemester },
      { $set: { semester: data.fromSemester + 1, updatedAt: new Date() } },
    );
    return { promoted: result.modifiedCount, toSemester: data.fromSemester + 1 };
  });

export const adminStats = createServerFn({ method: "GET" }).handler(async () => {
  await requireRole("admin");
  const users = await collection(COLLECTIONS.users);
  const departments = await collection(COLLECTIONS.departments);
  const programs = await collection(COLLECTIONS.programs);
  const spaces = await collection(COLLECTIONS.academicSpaces);
  const [students, teachers, admins, departmentCount, programCount, spaceCount, pending] =
    await Promise.all([
      users.countDocuments({ role: "student" }),
      users.countDocuments({ role: "teacher" }),
      users.countDocuments({ role: "admin" }),
      departments.countDocuments({}),
      programs.countDocuments({}),
      spaces.countDocuments({}),
      users.countDocuments({ passwordHash: null }),
    ]);
  return { students, teachers, admins, departmentCount, programCount, spaceCount, pending };
});
