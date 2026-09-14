import {
  MongoClient,
  ObjectId as MongoObjectId,
  type Db,
  type Filter as MongoFilter,
  type UpdateFilter,
  type OptionalUnlessRequiredId,
  type Document,
} from "mongodb";

import { ObjectId, type Doc } from "@/backend/object-id";
import { MITS_STRUCTURE } from "@/backend/mits-structure";

export { ObjectId } from "@/backend/object-id";
export type { Doc } from "@/backend/object-id";

type Filter = Record<string, unknown>;
type UpdateDoc = Record<string, unknown>;

/* ==========================================================================
 * Direct MongoDB Driver Connection (Active when MONGODB_URI is configured)
 * ========================================================================== */

let mongoClient: MongoClient | null = null;
let mongoDbInstance: Db | null = null;
let mongoConnectPromise: Promise<Db | null> | null = null;

function getMongoUri(): string | null {
  const uri = process.env["MONGODB_URI"]?.trim();
  return uri && uri.length > 0 ? uri : null;
}

function dbNameFromUri(uri: string): string {
  const match = /mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/.exec(uri);
  const name = match?.[1]?.trim();
  return name && name.length > 0 ? decodeURIComponent(name) : "smartstudy";
}

async function getDirectDb(): Promise<Db | null> {
  const uri = getMongoUri();
  if (!uri) return null;
  if (mongoDbInstance) return mongoDbInstance;
  if (!mongoConnectPromise) {
    mongoConnectPromise = (async () => {
      try {
        mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
        const conn = await mongoClient.connect();
        const db = conn.db(dbNameFromUri(uri));
        mongoDbInstance = db;
        const deptsCount = await db.collection("departments").countDocuments();
        if (deptsCount === 0) {
          console.info("[MongoDB] Seeding initial MITS structure into MongoDB database...");
          await seedRealMongoStructure(db);
        }
        return db;
      } catch (err) {
        console.error("[MongoDB] Connection error:", (err as Error).message);
        mongoConnectPromise = null;
        mongoDbInstance = null;
        return null;
      }
    })();
  }
  return mongoConnectPromise;
}

async function seedRealMongoStructure(db: Db): Promise<void> {
  try {
    for (const level of [
      { code: "UG", name: "Undergraduate" },
      { code: "PG", name: "Postgraduate" },
      { code: "PHD", name: "PhD" },
    ]) {
      await db
        .collection("academicLevels")
        .updateOne({ code: level.code }, { $set: level }, { upsert: true });
    }

    for (const dept of MITS_STRUCTURE) {
      await db
        .collection("departments")
        .updateOne(
          { code: dept.code },
          { $set: { name: dept.name, code: dept.code }, $setOnInsert: { createdAt: new Date() } },
          { upsert: true },
        );
      const deptDoc = await db.collection("departments").findOne({ code: dept.code });
      if (!deptDoc) continue;

      for (const program of dept.programs) {
        await db.collection("programs").updateOne(
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
        const progDoc = await db.collection("programs").findOne({ code: program.code });
        if (!progDoc) continue;

        for (let s = 1; s <= program.durationSemesters; s++) {
          await db.collection("academicSpaces").updateOne(
            { programId: progDoc._id.toString(), semester: s },
            {
              $set: { level: program.level, programId: progDoc._id.toString(), semester: s },
              $setOnInsert: { createdAt: new Date() },
            },
            { upsert: true },
          );
        }
      }
    }
  } catch (err) {
    console.warn("[MongoDB] Error seeding structure:", err);
  }
}

function normalizeForMongo(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (val instanceof ObjectId) return new MongoObjectId(val.toString());
  if (val instanceof MongoObjectId) return val;
  if (Array.isArray(val)) return val.map(normalizeForMongo);
  if (val instanceof Date || val instanceof RegExp) return val;
  if (typeof val === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      out[k] = normalizeForMongo(v);
    }
    return out;
  }
  return val;
}

function normalizeFromMongo(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (val instanceof MongoObjectId) return new ObjectId(val.toString());
  if (Array.isArray(val)) return val.map(normalizeFromMongo);
  if (
    typeof val === "object" &&
    !(val instanceof Date) &&
    !(val instanceof RegExp) &&
    !(val instanceof ObjectId)
  ) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      out[k] = normalizeFromMongo(v);
    }
    return out;
  }
  return val;
}

/* ==========================================================================
 * HTTP API Client (Active when MONGO_API_URL and MONGO_API_KEY are set)
 * ========================================================================== */

function config(): { url: string; key: string } | null {
  const url = process.env["MONGO_API_URL"];
  const key = process.env["MONGO_API_KEY"];
  if (!url || !key) {
    return null;
  }
  return { url: url.replace(/\/+$/, ""), key };
}

/** Encode ObjectId / Date / RegExp into JSON-safe extended-JSON values. */
function encode(value: unknown): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (value instanceof ObjectId || value instanceof MongoObjectId)
    return { $oid: value.toString() };
  if (value instanceof Date) return { $date: value.toISOString() };
  if (value instanceof RegExp) return { $regex: value.source, $options: value.flags };
  if (Array.isArray(value)) return value.map(encode);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = encode(v);
    }
    return out;
  }
  return value;
}

/** Decode extended-JSON values coming back from the API. */
function decode(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(decode);
  const obj = value as Record<string, unknown>;
  if (typeof obj["$oid"] === "string") return new ObjectId(obj["$oid"]);
  if (typeof obj["$date"] === "string") return new Date(obj["$date"]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = decode(v);
  return out;
}

async function call<T>(collectionName: string, op: string, payload: unknown): Promise<T> {
  const conf = config();
  if (!conf) {
    throw new Error("MONGO_API not configured");
  }
  const { url, key } = conf;
  const response = await fetch(`${url}/v1/${encodeURIComponent(collectionName)}/${op}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key },
    body: JSON.stringify(encode(payload)),
  });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!response.ok) {
    const message =
      (body as { error?: string } | null)?.error ?? `Database request failed (${response.status})`;
    throw new Error(message);
  }
  return decode((body as { result?: unknown } | null)?.result ?? null) as T;
}

/* ==========================================================================
 * In-Memory Mock Store (Active when neither MONGODB_URI nor MONGO_API_URL is configured)
 * ========================================================================== */

const inMemoryStore = new Map<string, Doc[]>();

function getStore(name: string): Doc[] {
  let list = inMemoryStore.get(name);
  if (!list) {
    list = [];
    inMemoryStore.set(name, list);
    if (name === COLLECTIONS.departments && list.length === 0) {
      seedInitialStructure();
    }
  }
  return list;
}

let seeded = false;
function seedInitialStructure(): void {
  if (seeded) return;
  seeded = true;

  const levelsCol = getStore(COLLECTIONS.academicLevels);
  for (const level of [
    { code: "UG", name: "Undergraduate" },
    { code: "PG", name: "Postgraduate" },
    { code: "PHD", name: "PhD" },
  ]) {
    levelsCol.push({
      _id: new ObjectId(),
      ...level,
    });
  }

  const deptsCol = getStore(COLLECTIONS.departments);
  const progsCol = getStore(COLLECTIONS.programs);
  const spacesCol = getStore(COLLECTIONS.academicSpaces);

  for (const dept of MITS_STRUCTURE) {
    const deptDoc: Doc = {
      _id: new ObjectId(),
      name: dept.name,
      code: dept.code,
      createdAt: new Date(),
    };
    deptsCol.push(deptDoc);

    for (const program of dept.programs) {
      const progDoc: Doc = {
        _id: new ObjectId(),
        name: program.name,
        code: program.code,
        level: program.level,
        durationSemesters: program.durationSemesters,
        departmentId: deptDoc._id.toString(),
        createdAt: new Date(),
      };
      progsCol.push(progDoc);

      for (let semester = 1; semester <= program.durationSemesters; semester += 1) {
        spacesCol.push({
          _id: new ObjectId(),
          level: program.level,
          programId: progDoc._id.toString(),
          semester,
          createdAt: new Date(),
        });
      }
    }
  }
}

function matchCondition(actual: unknown, expected: unknown): boolean {
  if (expected instanceof RegExp) {
    return expected.test(String(actual ?? ""));
  }
  if (expected && typeof expected === "object") {
    const expObj = expected as Record<string, unknown>;
    if ("$in" in expObj && Array.isArray(expObj["$in"])) {
      return (expObj["$in"] as unknown[]).some(
        (item) =>
          String(item) === String(actual) ||
          (item instanceof ObjectId && item.equals(String(actual))) ||
          (item instanceof MongoObjectId && item.toString() === String(actual)),
      );
    }
    if ("$ne" in expObj) {
      return actual !== expObj["$ne"] && String(actual) !== String(expObj["$ne"]);
    }
    if ("$regex" in expObj) {
      const flags = typeof expObj["$options"] === "string" ? expObj["$options"] : "";
      const rx = new RegExp(String(expObj["$regex"]), flags);
      return rx.test(String(actual ?? ""));
    }
  }
  if (
    actual instanceof ObjectId ||
    expected instanceof ObjectId ||
    actual instanceof MongoObjectId ||
    expected instanceof MongoObjectId
  ) {
    return String(actual) === String(expected);
  }
  if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();
  }
  return actual === expected;
}

function matchDoc(doc: Doc, filter: Filter): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;

  if (filter["$or"] && Array.isArray(filter["$or"])) {
    const matchesOr = (filter["$or"] as Filter[]).some((sub) => matchDoc(doc, sub));
    if (!matchesOr) return false;
  }

  for (const [key, expected] of Object.entries(filter)) {
    if (key === "$or") continue;

    if (key === "_id") {
      const docId = doc._id;
      if (!matchCondition(docId, expected)) return false;
      continue;
    }

    const actual = doc[key];
    if (!matchCondition(actual, expected)) return false;
  }

  return true;
}

function applyUpdateToDoc(doc: Doc, update: UpdateDoc, isInsert = false): void {
  const opKeys = Object.keys(update).filter((k) => k.startsWith("$"));
  if (opKeys.length === 0) {
    for (const [k, v] of Object.entries(update)) {
      if (k !== "_id") doc[k] = v;
    }
    return;
  }

  if (update["$set"] && typeof update["$set"] === "object") {
    for (const [k, v] of Object.entries(update["$set"] as Record<string, unknown>)) {
      if (k !== "_id") doc[k] = v;
    }
  }

  if (isInsert && update["$setOnInsert"] && typeof update["$setOnInsert"] === "object") {
    for (const [k, v] of Object.entries(update["$setOnInsert"] as Record<string, unknown>)) {
      if (k !== "_id") doc[k] = v;
    }
  }

  if (update["$inc"] && typeof update["$inc"] === "object") {
    for (const [k, v] of Object.entries(update["$inc"] as Record<string, unknown>)) {
      doc[k] = Number(doc[k] ?? 0) + Number(v);
    }
  }
}

class Cursor {
  private sortSpec: Record<string, 1 | -1> | undefined;
  private limitValue: number | undefined;
  private skipValue: number | undefined;

  constructor(
    private readonly collectionName: string,
    private readonly filter: Filter,
  ) {}

  sort(spec: Record<string, 1 | -1>): Cursor {
    this.sortSpec = spec;
    return this;
  }

  limit(n: number): Cursor {
    this.limitValue = n;
    return this;
  }

  skip(n: number): Cursor {
    this.skipValue = n;
    return this;
  }

  async toArray(): Promise<Doc[]> {
    const directDb = await getDirectDb();
    if (directDb) {
      try {
        let cur = directDb
          .collection(this.collectionName)
          .find((normalizeForMongo(this.filter) as MongoFilter<Document>) ?? {});
        if (this.sortSpec) cur = cur.sort(this.sortSpec);
        if (this.skipValue) cur = cur.skip(this.skipValue);
        if (this.limitValue) cur = cur.limit(this.limitValue);
        const docs = await cur.toArray();
        return docs.map(normalizeFromMongo) as Doc[];
      } catch (err) {
        console.error(
          `[MongoDB] Direct query failed for ${this.collectionName}:`,
          (err as Error).message,
        );
      }
    }

    if (config()) {
      try {
        return await call<Doc[]>(this.collectionName, "find", {
          filter: this.filter,
          sort: this.sortSpec ?? null,
          limit: this.limitValue ?? null,
          skip: this.skipValue ?? null,
        });
      } catch (err) {
        console.warn(
          `[AI Studio] Remote DB failed; using in-memory store for ${this.collectionName}:`,
          (err as Error).message,
        );
      }
    }

    const store = getStore(this.collectionName);
    let results = store.filter((d) => matchDoc(d, this.filter));

    if (this.sortSpec) {
      const spec = this.sortSpec;
      results = [...results].sort((a, b) => {
        for (const [field, direction] of Object.entries(spec)) {
          const valA = a[field];
          const valB = b[field];
          if (valA === valB) continue;
          if (valA === undefined || valA === null) return 1 * direction;
          if (valB === undefined || valB === null) return -1 * direction;
          if (valA instanceof Date && valB instanceof Date) {
            return (valA.getTime() - valB.getTime()) * direction;
          }
          if (valA < valB) return -1 * direction;
          if (valA > valB) return 1 * direction;
        }
        return 0;
      });
    }

    if (this.skipValue && this.skipValue > 0) {
      results = results.slice(this.skipValue);
    }
    if (this.limitValue && this.limitValue > 0) {
      results = results.slice(0, this.limitValue);
    }

    return results;
  }
}

export class DataCollection {
  constructor(private readonly name: string) {}

  find(filter: Filter = {}): Cursor {
    return new Cursor(this.name, filter);
  }

  async findOne(filter: Filter = {}): Promise<Doc | null> {
    const directDb = await getDirectDb();
    if (directDb) {
      try {
        const doc = await directDb
          .collection(this.name)
          .findOne((normalizeForMongo(filter) as MongoFilter<Document>) ?? {});
        return doc ? (normalizeFromMongo(doc) as Doc) : null;
      } catch (err) {
        console.error(`[MongoDB] Direct findOne failed for ${this.name}:`, (err as Error).message);
      }
    }

    if (config()) {
      try {
        return await call<Doc | null>(this.name, "findOne", { filter });
      } catch (err) {
        console.warn(
          `[AI Studio] Remote DB failed; using in-memory store for ${this.name}:`,
          (err as Error).message,
        );
      }
    }
    const store = getStore(this.name);
    const doc = store.find((d) => matchDoc(d, filter));
    return doc ?? null;
  }

  async countDocuments(filter: Filter = {}): Promise<number> {
    const directDb = await getDirectDb();
    if (directDb) {
      try {
        return await directDb
          .collection(this.name)
          .countDocuments((normalizeForMongo(filter) as MongoFilter<Document>) ?? {});
      } catch (err) {
        console.error(
          `[MongoDB] Direct countDocuments failed for ${this.name}:`,
          (err as Error).message,
        );
      }
    }

    if (config()) {
      try {
        return await call<number>(this.name, "countDocuments", { filter });
      } catch (err) {
        console.warn(
          `[AI Studio] Remote DB failed; using in-memory store for ${this.name}:`,
          (err as Error).message,
        );
      }
    }
    const store = getStore(this.name);
    return store.filter((d) => matchDoc(d, filter)).length;
  }

  async insertOne(document: Record<string, unknown>): Promise<{ insertedId: ObjectId }> {
    const directDb = await getDirectDb();
    if (directDb) {
      try {
        const res = await directDb
          .collection(this.name)
          .insertOne(normalizeForMongo(document) as OptionalUnlessRequiredId<Document>);
        return { insertedId: new ObjectId(res.insertedId.toString()) };
      } catch (err) {
        console.error(
          `[MongoDB] Direct insertOne failed for ${this.name}:`,
          (err as Error).message,
        );
      }
    }

    if (config()) {
      try {
        return await call<{ insertedId: ObjectId }>(this.name, "insertOne", { document });
      } catch (err) {
        console.warn(
          `[AI Studio] Remote DB failed; using in-memory store for ${this.name}:`,
          (err as Error).message,
        );
      }
    }
    const store = getStore(this.name);
    const id = document["_id"] instanceof ObjectId ? document["_id"] : new ObjectId();
    const doc: Doc = { ...document, _id: id };
    store.push(doc);
    return { insertedId: id };
  }

  async insertMany(documents: Record<string, unknown>[]): Promise<{ insertedCount: number }> {
    const directDb = await getDirectDb();
    if (directDb) {
      try {
        const res = await directDb
          .collection(this.name)
          .insertMany(documents.map(normalizeForMongo) as OptionalUnlessRequiredId<Document>[]);
        return { insertedCount: res.insertedCount };
      } catch (err) {
        console.error(
          `[MongoDB] Direct insertMany failed for ${this.name}:`,
          (err as Error).message,
        );
      }
    }

    if (config()) {
      try {
        return await call<{ insertedCount: number }>(this.name, "insertMany", { documents });
      } catch (err) {
        console.warn(
          `[AI Studio] Remote DB failed; using in-memory store for ${this.name}:`,
          (err as Error).message,
        );
      }
    }
    const store = getStore(this.name);
    for (const d of documents) {
      const id = d["_id"] instanceof ObjectId ? d["_id"] : new ObjectId();
      store.push({ ...d, _id: id });
    }
    return { insertedCount: documents.length };
  }

  async updateOne(
    filter: Filter,
    update: UpdateDoc,
    options: { upsert?: boolean } = {},
  ): Promise<{ matchedCount: number; modifiedCount: number; upsertedId: ObjectId | null }> {
    const directDb = await getDirectDb();
    if (directDb) {
      try {
        const res = await directDb
          .collection(this.name)
          .updateOne(
            normalizeForMongo(filter) as MongoFilter<Document>,
            normalizeForMongo(update) as UpdateFilter<Document>,
            options,
          );
        return {
          matchedCount: res.matchedCount,
          modifiedCount: res.modifiedCount,
          upsertedId: res.upsertedId ? new ObjectId(res.upsertedId.toString()) : null,
        };
      } catch (err) {
        console.error(
          `[MongoDB] Direct updateOne failed for ${this.name}:`,
          (err as Error).message,
        );
      }
    }

    if (config()) {
      try {
        return await call(this.name, "updateOne", { filter, update, options });
      } catch (err) {
        console.warn(
          `[AI Studio] Remote DB failed; using in-memory store for ${this.name}:`,
          (err as Error).message,
        );
      }
    }
    const store = getStore(this.name);
    const target = store.find((d) => matchDoc(d, filter));
    if (target) {
      applyUpdateToDoc(target, update, false);
      return { matchedCount: 1, modifiedCount: 1, upsertedId: null };
    }
    if (options.upsert) {
      const id = new ObjectId();
      const newDoc: Doc = { _id: id };
      for (const [k, v] of Object.entries(filter)) {
        if (k !== "_id" && !k.startsWith("$")) newDoc[k] = v;
      }
      applyUpdateToDoc(newDoc, update, true);
      store.push(newDoc);
      return { matchedCount: 0, modifiedCount: 0, upsertedId: id };
    }
    return { matchedCount: 0, modifiedCount: 0, upsertedId: null };
  }

  async updateMany(
    filter: Filter,
    update: UpdateDoc,
    options: { upsert?: boolean } = {},
  ): Promise<{ matchedCount: number; modifiedCount: number }> {
    const directDb = await getDirectDb();
    if (directDb) {
      try {
        const res = await directDb
          .collection(this.name)
          .updateMany(
            normalizeForMongo(filter) as MongoFilter<Document>,
            normalizeForMongo(update) as UpdateFilter<Document>,
            options,
          );
        return { matchedCount: res.matchedCount, modifiedCount: res.modifiedCount };
      } catch (err) {
        console.error(
          `[MongoDB] Direct updateMany failed for ${this.name}:`,
          (err as Error).message,
        );
      }
    }

    if (config()) {
      try {
        return await call(this.name, "updateMany", { filter, update, options });
      } catch (err) {
        console.warn(
          `[AI Studio] Remote DB failed; using in-memory store for ${this.name}:`,
          (err as Error).message,
        );
      }
    }
    const store = getStore(this.name);
    const targets = store.filter((d) => matchDoc(d, filter));
    for (const t of targets) {
      applyUpdateToDoc(t, update, false);
    }
    if (targets.length === 0 && options.upsert) {
      const id = new ObjectId();
      const newDoc: Doc = { _id: id };
      for (const [k, v] of Object.entries(filter)) {
        if (k !== "_id" && !k.startsWith("$")) newDoc[k] = v;
      }
      applyUpdateToDoc(newDoc, update, true);
      store.push(newDoc);
      return { matchedCount: 0, modifiedCount: 1 };
    }
    return { matchedCount: targets.length, modifiedCount: targets.length };
  }

  async deleteOne(filter: Filter): Promise<{ deletedCount: number }> {
    const directDb = await getDirectDb();
    if (directDb) {
      try {
        const res = await directDb
          .collection(this.name)
          .deleteOne((normalizeForMongo(filter) as MongoFilter<Document>) ?? {});
        return { deletedCount: res.deletedCount };
      } catch (err) {
        console.error(
          `[MongoDB] Direct deleteOne failed for ${this.name}:`,
          (err as Error).message,
        );
      }
    }

    if (config()) {
      try {
        return await call(this.name, "deleteOne", { filter });
      } catch (err) {
        console.warn(
          `[AI Studio] Remote DB failed; using in-memory store for ${this.name}:`,
          (err as Error).message,
        );
      }
    }
    const store = getStore(this.name);
    const index = store.findIndex((d) => matchDoc(d, filter));
    if (index !== -1) {
      store.splice(index, 1);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  async deleteMany(filter: Filter): Promise<{ deletedCount: number }> {
    const directDb = await getDirectDb();
    if (directDb) {
      try {
        const res = await directDb
          .collection(this.name)
          .deleteMany((normalizeForMongo(filter) as MongoFilter<Document>) ?? {});
        return { deletedCount: res.deletedCount };
      } catch (err) {
        console.error(
          `[MongoDB] Direct deleteMany failed for ${this.name}:`,
          (err as Error).message,
        );
      }
    }

    if (config()) {
      try {
        return await call(this.name, "deleteMany", { filter });
      } catch (err) {
        console.warn(
          `[AI Studio] Remote DB failed; using in-memory store for ${this.name}:`,
          (err as Error).message,
        );
      }
    }
    const store = getStore(this.name);
    let count = 0;
    for (let i = store.length - 1; i >= 0; i--) {
      const item = store[i];
      if (item && matchDoc(item, filter)) {
        store.splice(i, 1);
        count++;
      }
    }
    return { deletedCount: count };
  }
}

export async function collection(name: string): Promise<DataCollection> {
  return new DataCollection(name);
}

/** Simple health probe used by route loaders to fail gracefully. */
export async function pingDatabase(): Promise<boolean> {
  const directDb = await getDirectDb();
  if (directDb) {
    try {
      await directDb.command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }
  const conf = config();
  if (!conf) return true;
  try {
    const res = await fetch(`${conf.url}/health`, { headers: { "x-api-key": conf.key } });
    return res.ok;
  } catch {
    return true;
  }
}

export const COLLECTIONS = {
  users: "users",
  otps: "otps",
  academicLevels: "academicLevels",
  departments: "departments",
  programs: "programs",
  academicSpaces: "academicSpaces",
  subjects: "subjects",
  materials: "materials",
  books: "books",
  pyqs: "pyqs",
  practiceQuestions: "practiceQuestions",
  announcements: "announcements",
  quizzes: "quizzes",
  quizAttempts: "quizAttempts",
  projects: "projects",
  projectGroups: "projectGroups",
  projectReviews: "projectReviews",
  chatHistory: "chatHistory",
  progressTracking: "progressTracking",
  bookmarks: "bookmarks",
  notifications: "notifications",
} as const;
