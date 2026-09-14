import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { collection, COLLECTIONS, ObjectId } from "@/backend/mongo.server";
import { requireAuth } from "@/authentication/auth.server";
import type { ProjectDTO, ProjectDocumentDTO } from "@/shared/types";

export const listProjects = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProjectDTO[]> => {
    const user = await requireAuth();
    const projectsCol = await collection(COLLECTIONS.projects);
    const programsCol = await collection(COLLECTIONS.programs);
    const deptsCol = await collection(COLLECTIONS.departments);

    let filter: Record<string, unknown> = {};

    // 27. Access Control: Only connected students, faculty guides and admins
    if (user.role === "student") {
      filter = {
        $or: [
          { studentIds: user.id },
          { studentEnrollments: user.enrollmentNo },
          {
            studentNames: {
              $regex: new RegExp(user.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
            },
          },
        ],
      };
    } else if (user.role === "teacher") {
      filter = {
        $or: [{ facultyGuideId: user.id }, { facultyGuideName: user.name }],
      };
    }

    const docs = await projectsCol.find(filter).sort({ updatedAt: -1 }).toArray();
    const [programs, departments] = await Promise.all([
      programsCol.find({}).toArray(),
      deptsCol.find({}).toArray(),
    ]);

    const progMap = new Map(programs.map((p) => [p._id.toString(), String(p["name"])]));
    const deptMap = new Map(departments.map((d) => [d._id.toString(), String(d["name"])]));

    return docs.map((d) => ({
      id: d._id.toString(),
      title: String(d["title"]),
      description: String(d["description"] ?? ""),
      academicYear: String(d["academicYear"] ?? "2025-2026"),
      departmentId: String(d["departmentId"] ?? ""),
      departmentName: deptMap.get(String(d["departmentId"])) ?? "Engineering",
      programId: String(d["programId"] ?? ""),
      programName: progMap.get(String(d["programId"])) ?? "B.Tech",
      facultyGuideId: String(d["facultyGuideId"] ?? ""),
      facultyGuideName: String(d["facultyGuideName"] ?? "Faculty Guide"),
      studentIds: Array.isArray(d["studentIds"]) ? (d["studentIds"] as string[]) : [],
      studentNames: Array.isArray(d["studentNames"]) ? (d["studentNames"] as string[]) : [],
      studentEnrollments: Array.isArray(d["studentEnrollments"])
        ? (d["studentEnrollments"] as string[])
        : [],
      status: (d["status"] ?? "in_progress") as ProjectDTO["status"],
      progressPercentage: Number(d["progressPercentage"] ?? 0),
      facultyFeedback: d["facultyFeedback"] ? String(d["facultyFeedback"]) : undefined,
      documents: Array.isArray(d["documents"]) ? (d["documents"] as ProjectDocumentDTO[]) : [],
      createdAt: d["createdAt"]
        ? new Date(d["createdAt"] as Date).toISOString()
        : new Date().toISOString(),
      updatedAt: d["updatedAt"]
        ? new Date(d["updatedAt"] as Date).toISOString()
        : new Date().toISOString(),
    }));
  },
);

export const createProject = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().trim().min(5),
        description: z.string().trim().default(""),
        academicYear: z.string().default("2025-2026"),
        departmentId: z.string().min(1),
        programId: z.string().min(1),
        facultyGuideName: z.string().trim().min(2),
        studentNames: z.array(z.string().trim()).min(1),
        studentEnrollments: z.array(z.string().trim()).min(1),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const projectsCol = await collection(COLLECTIONS.projects);

    const doc = {
      title: data.title,
      description: data.description,
      academicYear: data.academicYear,
      departmentId: data.departmentId,
      programId: data.programId,
      facultyGuideId: user.role === "teacher" ? user.id : "faculty-pending",
      facultyGuideName: data.facultyGuideName,
      studentIds: user.role === "student" ? [user.id] : [],
      studentNames: data.studentNames,
      studentEnrollments: data.studentEnrollments,
      status: "in_progress",
      progressPercentage: 10,
      documents: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const res = await projectsCol.insertOne(doc);
    return { ok: true, id: res.insertedId.toString() };
  });

export const submitProjectDocument = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().min(1),
        type: z.enum(["synopsis", "report", "ppt", "documentation", "final_project"]),
        title: z.string().trim().min(3),
        fileUrl: z.string().optional(),
        fileName: z.string().trim().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const projectsCol = await collection(COLLECTIONS.projects);

    const docItem: ProjectDocumentDTO = {
      id: new ObjectId().toString(),
      type: data.type,
      title: data.title,
      fileUrl: data.fileUrl || `/projects/${encodeURIComponent(data.fileName)}`,
      fileName: data.fileName,
      submittedAt: new Date().toISOString(),
      status: "submitted",
    };

    await projectsCol.updateOne(
      { _id: new ObjectId(data.projectId) },
      {
        $push: { documents: docItem as unknown },
        $set: { updatedAt: new Date(), status: "review_pending" },
      },
    );

    return { ok: true, docId: docItem.id };
  });

export const reviewProject = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().min(1),
        progressPercentage: z.number().int().min(0).max(100),
        status: z.enum(["in_progress", "review_pending", "approved", "completed"]),
        facultyFeedback: z.string().trim().min(2),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    if (user.role === "student") {
      throw new Error("Only faculty guides and admins can review projects.");
    }

    const projectsCol = await collection(COLLECTIONS.projects);
    await projectsCol.updateOne(
      { _id: new ObjectId(data.projectId) },
      {
        $set: {
          progressPercentage: data.progressPercentage,
          status: data.status,
          facultyFeedback: data.facultyFeedback,
          updatedAt: new Date(),
        },
      },
    );

    return { ok: true };
  });
