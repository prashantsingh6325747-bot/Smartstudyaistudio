import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { collection, COLLECTIONS, ObjectId } from "@/backend/mongo.server";
import { getMe, requireAuth } from "@/authentication/auth.server";
import type {
  AcademicDocumentDTO,
  DocumentType,
  LibraryBookDTO,
  LibraryCategory,
  SubjectDTO,
} from "@/shared/types";

let academicSeeded = false;
async function ensureAcademicContent(): Promise<void> {
  if (academicSeeded) return;
  academicSeeded = true;
  try {
    const { seedAcademicContentIfEmpty } = await import("@/backend/initial-content-seed");
    await seedAcademicContentIfEmpty();
  } catch (err) {
    console.warn("[Academic Content] Auto-seed error:", err);
  }
}

export const listSubjects = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        programId: z.string().optional(),
        semester: z.number().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<SubjectDTO[]> => {
    await ensureAcademicContent();
    const user = await getMe();
    const subjectsCol = await collection(COLLECTIONS.subjects);
    const programsCol = await collection(COLLECTIONS.programs);

    const filter: Record<string, unknown> = {};

    // Strict Access Control for Student:
    if (user?.role === "student") {
      if (!user.programId || !user.semester) {
        return [];
      }
      filter["programId"] = user.programId;
      filter["semester"] = user.semester;
    } else {
      // Teacher or Admin can filter by selection
      if (data.programId) filter["programId"] = data.programId;
      if (data.semester) filter["semester"] = data.semester;
    }

    const docs = await subjectsCol.find(filter).sort({ code: 1, name: 1 }).toArray();
    const programs = await programsCol.find({}).toArray();
    const progMap = new Map(programs.map((p) => [p._id.toString(), String(p["name"])]));

    return docs.map((d) => ({
      id: d._id.toString(),
      code: String(d["code"] ?? ""),
      name: String(d["name"] ?? ""),
      programId: String(d["programId"] ?? ""),
      programName: progMap.get(String(d["programId"] ?? "")) ?? "General",
      semester: Number(d["semester"] ?? 1),
      credits: d["credits"] ? Number(d["credits"]) : undefined,
      departmentId: d["departmentId"] ? String(d["departmentId"]) : undefined,
      chapters: Array.isArray(d["chapters"]) ? (d["chapters"] as string[]) : [],
      batch: d["batch"] ? String(d["batch"]) : undefined,
      assignedTeacherId: d["assignedTeacherId"] ? String(d["assignedTeacherId"]) : null,
      assignedTeacherName: d["assignedTeacherName"] ? String(d["assignedTeacherName"]) : null,
      assignedTeacherEmail: d["assignedTeacherEmail"] ? String(d["assignedTeacherEmail"]) : null,
    }));
  });

export const createSubject = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        code: z.string().trim().min(2),
        name: z.string().trim().min(2),
        programId: z.string().min(1),
        semester: z.number().int().min(1).max(12),
        credits: z.number().int().min(1).max(10).default(4),
        chapters: z.array(z.string()).default([]),
        batch: z.string().trim().optional(),
        assignedTeacherId: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    if (user.role === "student") {
      throw new Error("Only teachers and administrators can add subjects.");
    }
    const subjectsCol = await collection(COLLECTIONS.subjects);

    let assignedTeacherName: string | null = null;
    let assignedTeacherEmail: string | null = null;
    if (data.assignedTeacherId && ObjectId.isValid(data.assignedTeacherId)) {
      const usersCol = await collection(COLLECTIONS.users);
      const teacherDoc = await usersCol.findOne({ _id: new ObjectId(data.assignedTeacherId) });
      if (teacherDoc) {
        assignedTeacherName = String(teacherDoc["name"] ?? "");
        assignedTeacherEmail = String(teacherDoc["email"] ?? "");
      }
    }

    const result = await subjectsCol.insertOne({
      code: data.code,
      name: data.name,
      programId: data.programId,
      semester: data.semester,
      credits: data.credits,
      chapters: data.chapters,
      batch: data.batch || "",
      assignedTeacherId: data.assignedTeacherId || null,
      assignedTeacherName,
      assignedTeacherEmail,
      createdAt: new Date(),
    });
    return { ok: true, id: result.insertedId.toString() };
  });

export const assignSubjectTeacher = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        subjectId: z.string().min(1),
        assignedTeacherId: z.string().nullable(),
        batch: z.string().trim().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    if (user.role !== "admin") {
      throw new Error("Only administrators can assign subjects and batches.");
    }
    const subjectsCol = await collection(COLLECTIONS.subjects);
    if (!ObjectId.isValid(data.subjectId)) throw new Error("Invalid subject ID.");

    let teacherName: string | null = null;
    let teacherEmail: string | null = null;

    if (data.assignedTeacherId) {
      const usersCol = await collection(COLLECTIONS.users);
      if (!ObjectId.isValid(data.assignedTeacherId)) throw new Error("Invalid teacher ID.");
      const teacherDoc = await usersCol.findOne({ _id: new ObjectId(data.assignedTeacherId) });
      if (!teacherDoc || teacherDoc["role"] !== "teacher") {
        throw new Error("Selected user is not a registered faculty member.");
      }
      teacherName = String(teacherDoc["name"] ?? "");
      teacherEmail = String(teacherDoc["email"] ?? "");
    }

    const update: Record<string, unknown> = {
      assignedTeacherId: data.assignedTeacherId,
      assignedTeacherName: teacherName,
      assignedTeacherEmail: teacherEmail,
      updatedAt: new Date(),
    };
    if (typeof data.batch === "string") {
      update["batch"] = data.batch;
    }

    await subjectsCol.updateOne({ _id: new ObjectId(data.subjectId) }, { $set: update });
    return { ok: true, teacherName, batch: data.batch };
  });

export const listAcademicDocuments = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        documentType: z.string().optional(), // "unit_notes", "pyq", etc.
        subjectId: z.string().optional(),
        chapterName: z.string().optional(),
        year: z.number().optional(),
        search: z.string().optional(),
        programId: z.string().optional(),
        semester: z.number().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<AcademicDocumentDTO[]> => {
    const user = await getMe();
    const materialsCol = await collection(COLLECTIONS.materials);
    const bookmarksCol = await collection(COLLECTIONS.bookmarks);

    const filter: Record<string, unknown> = {};

    // 15. Student Access Control (Backend Enforced):
    if (user?.role === "student") {
      if (!user.programId || !user.semester) {
        return [];
      }
      filter["programId"] = user.programId;
      filter["semester"] = user.semester;
    } else {
      if (data.programId) filter["programId"] = data.programId;
      if (data.semester) filter["semester"] = data.semester;
    }

    if (data.documentType && data.documentType !== "all") {
      if (data.documentType === "notes") {
        filter["documentType"] = { $in: ["unit_notes", "chapter_notes", "topic_notes"] };
      } else if (data.documentType === "study_materials") {
        filter["documentType"] = {
          $in: ["lab_manual", "assignment", "reference_material", "practice_material"],
        };
      } else {
        filter["documentType"] = data.documentType;
      }
    }

    if (data.subjectId) filter["subjectId"] = data.subjectId;
    if (data.chapterName) filter["chapterName"] = data.chapterName;
    if (data.year) filter["year"] = data.year;

    if (data.search && data.search.trim().length > 0) {
      const rx = new RegExp(data.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter["$or"] = [
        { title: rx },
        { description: rx },
        { subjectName: rx },
        { chapterName: rx },
        { fileName: rx },
      ];
    }

    const docs = await materialsCol.find(filter).sort({ createdAt: -1 }).limit(200).toArray();

    let userBookmarks = new Set<string>();
    if (user) {
      const bmList = await bookmarksCol.find({ userId: user.id }).toArray();
      userBookmarks = new Set(bmList.map((b) => String(b["documentId"])));
    }

    return docs.map((d) => ({
      id: d._id.toString(),
      title: String(d["title"] ?? "Untitled Document"),
      description: String(d["description"] ?? ""),
      documentType: (d["documentType"] ?? "unit_notes") as DocumentType,
      subjectId: String(d["subjectId"] ?? ""),
      subjectName: String(d["subjectName"] ?? ""),
      subjectCode: d["subjectCode"] ? String(d["subjectCode"]) : undefined,
      chapterName: d["chapterName"] ? String(d["chapterName"]) : undefined,
      unitNo: d["unitNo"] ? Number(d["unitNo"]) : undefined,
      year: d["year"] ? Number(d["year"]) : undefined,
      fileUrl: d["fileUrl"] ? String(d["fileUrl"]) : undefined,
      fileName: String(d["fileName"] ?? "document.pdf"),
      fileType: (d["fileType"] ?? "pdf") as AcademicDocumentDTO["fileType"],
      fileSize: d["fileSize"] ? String(d["fileSize"]) : "1.5 MB",
      contentText: d["contentText"] ? String(d["contentText"]) : undefined,
      programId: String(d["programId"] ?? ""),
      semester: Number(d["semester"] ?? 1),
      uploadedBy: String(d["uploadedBy"] ?? ""),
      uploaderName: String(d["uploaderName"] ?? "Faculty"),
      createdAt: d["createdAt"]
        ? new Date(d["createdAt"] as Date).toISOString()
        : new Date().toISOString(),
      viewsCount: Number(d["viewsCount"] ?? 0),
      downloadsCount: Number(d["downloadsCount"] ?? 0),
      isBookmarked: userBookmarks.has(d._id.toString()),
    }));
  });

export const uploadAcademicDocument = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().trim().min(3),
        description: z.string().trim().default(""),
        documentType: z.enum([
          "unit_notes",
          "chapter_notes",
          "topic_notes",
          "lab_manual",
          "assignment",
          "reference_material",
          "practice_material",
          "pyq",
          "practice_question",
          "book",
          "other",
        ]),
        subjectId: z.string().min(1),
        chapterName: z.string().trim().optional(),
        unitNo: z.number().int().optional(),
        year: z.number().int().optional(),
        fileUrl: z.string().optional(),
        fileName: z.string().trim().min(1),
        fileType: z.enum(["pdf", "docx", "pptx", "txt", "link", "other"]).default("pdf"),
        fileSize: z.string().default("2.0 MB"),
        contentText: z.string().default(""),
        programId: z.string().min(1),
        semester: z.number().int().min(1).max(12),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    if (user.role === "student") {
      throw new Error("Students cannot upload academic syllabus materials.");
    }

    const subjectsCol = await collection(COLLECTIONS.subjects);
    const subject = await subjectsCol.findOne({ _id: new ObjectId(data.subjectId) });
    const subjectName = subject ? String(subject["name"]) : "General Subject";
    const subjectCode = subject ? String(subject["code"]) : "";

    const materialsCol = await collection(COLLECTIONS.materials);
    const doc = {
      title: data.title,
      description: data.description,
      documentType: data.documentType,
      subjectId: data.subjectId,
      subjectName,
      subjectCode,
      chapterName: data.chapterName,
      unitNo: data.unitNo,
      year: data.year,
      fileUrl: data.fileUrl || `/files/${encodeURIComponent(data.fileName)}`,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      contentText: data.contentText || data.description,
      programId: data.programId,
      semester: data.semester,
      uploadedBy: user.id,
      uploaderName: user.name,
      viewsCount: 0,
      downloadsCount: 0,
      createdAt: new Date(),
    };

    const res = await materialsCol.insertOne(doc);
    return { ok: true, id: res.insertedId.toString() };
  });

export const deleteAcademicDocument = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const materialsCol = await collection(COLLECTIONS.materials);
    const doc = await materialsCol.findOne({ _id: new ObjectId(data.id) });
    if (!doc) throw new Error("Document not found.");

    if (user.role !== "admin" && String(doc["uploadedBy"]) !== user.id) {
      throw new Error("Not authorized to delete this document.");
    }

    await materialsCol.deleteOne({ _id: new ObjectId(data.id) });
    return { ok: true };
  });

export const toggleBookmark = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        documentId: z.string().min(1),
        itemType: z.enum(["material", "book"]).default("material"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const bookmarksCol = await collection(COLLECTIONS.bookmarks);
    const existing = await bookmarksCol.findOne({ userId: user.id, documentId: data.documentId });

    if (existing) {
      await bookmarksCol.deleteOne({ _id: existing._id });
      return { bookmarked: false };
    } else {
      await bookmarksCol.insertOne({
        userId: user.id,
        documentId: data.documentId,
        itemType: data.itemType,
        createdAt: new Date(),
      });
      return { bookmarked: true };
    }
  });

export const trackDocumentView = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ id: z.string().min(1), type: z.enum(["material", "book"]).default("material") })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const user = await getMe();
    const colName = data.type === "book" ? COLLECTIONS.books : COLLECTIONS.materials;
    const col = await collection(colName);
    await col.updateOne({ _id: new ObjectId(data.id) }, { $inc: { viewsCount: 1 } });

    if (user) {
      const progressCol = await collection(COLLECTIONS.progressTracking);
      await progressCol.updateOne(
        { userId: user.id, itemId: data.id },
        {
          $set: {
            userId: user.id,
            itemId: data.id,
            itemType: data.type,
            lastViewedAt: new Date(),
          },
          $inc: { viewCount: 1 },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true },
      );
    }
    return { ok: true };
  });

export const listLibraryBooks = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        category: z.string().optional(),
        search: z.string().optional(),
        programId: z.string().optional(),
        semester: z.number().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<LibraryBookDTO[]> => {
    const user = await getMe();
    const booksCol = await collection(COLLECTIONS.books);
    const bookmarksCol = await collection(COLLECTIONS.bookmarks);

    const filter: Record<string, unknown> = {};
    if (data.category && data.category !== "All") {
      filter["category"] = data.category;
    }
    if (data.search && data.search.trim().length > 0) {
      const rx = new RegExp(data.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter["$or"] = [{ title: rx }, { author: rx }, { description: rx }, { subjectName: rx }];
    }

    const docs = await booksCol.find(filter).sort({ createdAt: -1 }).toArray();

    let userBookmarks = new Set<string>();
    if (user) {
      const bmList = await bookmarksCol.find({ userId: user.id, itemType: "book" }).toArray();
      userBookmarks = new Set(bmList.map((b) => String(b["documentId"])));
    }

    return docs.map((b) => ({
      id: b._id.toString(),
      title: String(b["title"] ?? "Untitled Book"),
      author: String(b["author"] ?? "Unknown Author"),
      isbn: b["isbn"] ? String(b["isbn"]) : undefined,
      category: (b["category"] ?? "Textbook") as LibraryCategory,
      description: String(b["description"] ?? ""),
      edition: b["edition"] ? String(b["edition"]) : undefined,
      pages: b["pages"] ? Number(b["pages"]) : undefined,
      fileUrl: b["fileUrl"] ? String(b["fileUrl"]) : undefined,
      fileName: b["fileName"] ? String(b["fileName"]) : undefined,
      subjectName: b["subjectName"] ? String(b["subjectName"]) : undefined,
      isBookmarked: userBookmarks.has(b._id.toString()),
    }));
  });

export const uploadLibraryBook = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().trim().min(2),
        author: z.string().trim().min(2),
        isbn: z.string().trim().optional(),
        category: z.enum(["Textbook", "Reference Book", "E-book", "Lab Manual", "Question Bank"]),
        edition: z.string().trim().optional(),
        pages: z.number().int().optional(),
        description: z.string().trim().default(""),
        fileUrl: z.string().optional(),
        fileName: z.string().trim().min(1),
        subjectName: z.string().trim().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    if (user.role === "student") {
      throw new Error("Students cannot upload books to the digital library.");
    }

    const booksCol = await collection(COLLECTIONS.books);
    const res = await booksCol.insertOne({
      ...data,
      uploadedBy: user.id,
      uploaderName: user.name,
      createdAt: new Date(),
    });
    return { ok: true, id: res.insertedId.toString() };
  });

// 33. Real Database Global Search across Permitted Content
export const globalSearch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ query: z.string().trim().min(2) }).parse(input))
  .handler(async ({ data }) => {
    const user = await getMe();
    const materialsCol = await collection(COLLECTIONS.materials);
    const booksCol = await collection(COLLECTIONS.books);
    const rx = new RegExp(data.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const materialFilter: Record<string, unknown> = {
      $or: [{ title: rx }, { description: rx }, { subjectName: rx }, { contentText: rx }],
    };

    if (user?.role === "student" && user.programId && user.semester) {
      materialFilter["programId"] = user.programId;
      materialFilter["semester"] = user.semester;
    }

    const [matchedMaterials, matchedBooks] = await Promise.all([
      materialsCol.find(materialFilter).limit(20).toArray(),
      booksCol
        .find({ $or: [{ title: rx }, { author: rx }, { description: rx }] })
        .limit(10)
        .toArray(),
    ]);

    return {
      materials: matchedMaterials.map((m) => ({
        id: m._id.toString(),
        title: String(m["title"]),
        documentType: String(m["documentType"]),
        subjectName: String(m["subjectName"]),
        chapterName: m["chapterName"] ? String(m["chapterName"]) : undefined,
        fileName: String(m["fileName"]),
      })),
      books: matchedBooks.map((b) => ({
        id: b._id.toString(),
        title: String(b["title"]),
        author: String(b["author"]),
        category: String(b["category"]),
      })),
    };
  });
