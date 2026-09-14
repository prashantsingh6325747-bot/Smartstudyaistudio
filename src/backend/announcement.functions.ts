import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { collection, COLLECTIONS, ObjectId } from "@/backend/mongo.server";
import { getMe, requireAuth } from "@/authentication/auth.server";
import type { AnnouncementDTO } from "@/shared/types";

export const listAnnouncements = createServerFn({ method: "GET" }).handler(
  async (): Promise<AnnouncementDTO[]> => {
    const user = await getMe();
    const announcementsCol = await collection(COLLECTIONS.announcements);
    const programsCol = await collection(COLLECTIONS.programs);

    const filter: Record<string, unknown> = {};

    if (user?.role === "student" && user.programId && user.semester) {
      filter["$or"] = [
        { targetProgramId: null },
        { targetProgramId: user.programId, targetSemester: user.semester },
        { targetProgramId: user.programId, targetSemester: null },
      ];
    }

    const docs = await announcementsCol.find(filter).sort({ createdAt: -1 }).limit(50).toArray();
    const programs = await programsCol.find({}).toArray();
    const progMap = new Map(programs.map((p) => [p._id.toString(), String(p["name"])]));

    return docs.map((d) => ({
      id: d._id.toString(),
      title: String(d["title"]),
      content: String(d["content"]),
      type: (d["type"] ?? "academic") as AnnouncementDTO["type"],
      targetProgramId: d["targetProgramId"] ? String(d["targetProgramId"]) : undefined,
      targetProgramName: d["targetProgramId"]
        ? progMap.get(String(d["targetProgramId"]))
        : undefined,
      targetSemester: d["targetSemester"] ? Number(d["targetSemester"]) : undefined,
      authorName: String(d["authorName"] ?? "Dean Office"),
      authorRole: (d["authorRole"] ?? "admin") as AnnouncementDTO["authorRole"],
      createdAt: d["createdAt"]
        ? new Date(d["createdAt"] as Date).toISOString()
        : new Date().toISOString(),
    }));
  },
);

export const createAnnouncement = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().trim().min(3),
        content: z.string().trim().min(5),
        type: z.enum(["quiz", "notes", "assignment", "deadline", "academic"]),
        targetProgramId: z.string().optional(),
        targetSemester: z.number().int().min(1).max(12).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    if (user.role === "student") {
      throw new Error("Students cannot post institutional announcements.");
    }

    const announcementsCol = await collection(COLLECTIONS.announcements);
    const res = await announcementsCol.insertOne({
      title: data.title,
      content: data.content,
      type: data.type,
      targetProgramId: data.targetProgramId || null,
      targetSemester: data.targetSemester || null,
      authorName: user.name,
      authorRole: user.role,
      createdAt: new Date(),
    });

    return { ok: true, id: res.insertedId.toString() };
  });
