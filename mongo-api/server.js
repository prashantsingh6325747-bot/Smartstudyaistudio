/**
 * Smart Study AI — MongoDB HTTP API
 *
 * A tiny Node service that sits in front of MongoDB Atlas and exposes only the
 * operations the Smart Study AI app needs. The app itself runs on a serverless
 * runtime with no raw TCP sockets, so it cannot use the MongoDB driver directly.
 *
 * Deploy this anywhere that runs Node (Render, Railway, Fly.io, a VPS...),
 * set the env vars below, then put the public URL + API key into the app.
 *
 * Env vars:
 *   MONGODB_URI  — your Atlas connection string (include the db name, e.g. /smartstudy)
 *   API_KEY      — long random shared secret; the app sends it as `x-api-key`
 *   PORT         — optional, defaults to 8080
 */
import express from "express";
import { MongoClient, ObjectId } from "mongodb";

const { MONGODB_URI, API_KEY } = process.env;
const PORT = Number(process.env.PORT ?? 8080);

if (!MONGODB_URI) throw new Error("MONGODB_URI is required");
if (!API_KEY || API_KEY.length < 24) {
  throw new Error("API_KEY is required and must be at least 24 characters");
}

const ALLOWED_COLLECTIONS = new Set([
  "users",
  "otps",
  "academicLevels",
  "departments",
  "programs",
  "academicSpaces",
  "subjects",
  "materials",
  "books",
  "pyqs",
  "practiceQuestions",
  "announcements",
  "quizzes",
  "quizAttempts",
  "projects",
  "projectGroups",
  "projectReviews",
  "chatHistory",
  "progressTracking",
  "bookmarks",
  "notifications",
]);

const ALLOWED_OPS = new Set([
  "find",
  "findOne",
  "countDocuments",
  "insertOne",
  "insertMany",
  "updateOne",
  "updateMany",
  "deleteOne",
  "deleteMany",
]);

const MAX_LIMIT = 1000;

function dbNameFromUri(uri) {
  const match = /mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/.exec(uri);
  const name = match?.[1]?.trim();
  return name && name.length > 0 ? decodeURIComponent(name) : "smartstudy";
}

const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
const connection = client.connect();
const dbName = dbNameFromUri(MONGODB_URI);

async function getDb() {
  await connection;
  return client.db(dbName);
}

async function ensureIndexes() {
  const db = await getDb();
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ enrollmentNo: 1 }, { sparse: true }),
    db.collection("users").createIndex({ phone: 1 }),
    db.collection("otps").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("otps").createIndex({ email: 1, purpose: 1 }),
    db.collection("departments").createIndex({ code: 1 }, { unique: true }),
    db.collection("programs").createIndex({ code: 1 }, { unique: true }),
    db.collection("academicSpaces").createIndex({ programId: 1, semester: 1 }, { unique: true }),
  ]);
}

/* ---------- extended-JSON encoding shared with the app ---------- */

function decode(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(decode);
  if (typeof value.$oid === "string") return new ObjectId(value.$oid);
  if (typeof value.$date === "string") return new Date(value.$date);
  if (typeof value.$regex === "string") return new RegExp(value.$regex, value.$options ?? "");
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = decode(v);
  return out;
}

function encode(value) {
  if (value === null || value === undefined) return value ?? null;
  if (value instanceof ObjectId) return { $oid: value.toHexString() };
  if (value instanceof Date) return { $date: value.toISOString() };
  if (Array.isArray(value)) return value.map(encode);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = encode(v);
    return out;
  }
  return value;
}

/* ---------- http ---------- */

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

app.use((req, res, next) => {
  const key = req.header("x-api-key") ?? "";
  if (!timingSafeEqual(key, API_KEY)) return res.status(401).json({ error: "Unauthorized" });
  next();
});

app.get("/health", async (_req, res) => {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    res.json({ ok: true, db: dbName });
  } catch (error) {
    console.error(error);
    res.status(503).json({ error: "Database unavailable" });
  }
});

app.post("/v1/:collection/:op", async (req, res) => {
  const { collection: collectionName, op } = req.params;
  if (!ALLOWED_COLLECTIONS.has(collectionName)) {
    return res.status(400).json({ error: `Unknown collection: ${collectionName}` });
  }
  if (!ALLOWED_OPS.has(op)) {
    return res.status(400).json({ error: `Unsupported operation: ${op}` });
  }

  try {
    const db = await getDb();
    const col = db.collection(collectionName);
    const payload = decode(req.body ?? {});
    const filter = payload.filter ?? {};
    let result;

    switch (op) {
      case "find": {
        let cursor = col.find(filter);
        if (payload.sort) cursor = cursor.sort(payload.sort);
        if (payload.skip) cursor = cursor.skip(Number(payload.skip));
        cursor = cursor.limit(Math.min(Number(payload.limit) || MAX_LIMIT, MAX_LIMIT));
        result = await cursor.toArray();
        break;
      }
      case "findOne":
        result = await col.findOne(filter);
        break;
      case "countDocuments":
        result = await col.countDocuments(filter);
        break;
      case "insertOne": {
        const r = await col.insertOne(payload.document ?? {});
        result = { insertedId: r.insertedId };
        break;
      }
      case "insertMany": {
        const r = await col.insertMany(payload.documents ?? []);
        result = { insertedCount: r.insertedCount };
        break;
      }
      case "updateOne": {
        const r = await col.updateOne(filter, payload.update ?? {}, payload.options ?? {});
        result = {
          matchedCount: r.matchedCount,
          modifiedCount: r.modifiedCount,
          upsertedId: r.upsertedId ?? null,
        };
        break;
      }
      case "updateMany": {
        const r = await col.updateMany(filter, payload.update ?? {}, payload.options ?? {});
        result = { matchedCount: r.matchedCount, modifiedCount: r.modifiedCount };
        break;
      }
      case "deleteOne": {
        const r = await col.deleteOne(filter);
        result = { deletedCount: r.deletedCount };
        break;
      }
      case "deleteMany": {
        const r = await col.deleteMany(filter);
        result = { deletedCount: r.deletedCount };
        break;
      }
      default:
        return res.status(400).json({ error: "Unsupported operation" });
    }

    res.json({ result: encode(result) });
  } catch (error) {
    console.error(`[${collectionName}.${op}]`, error);
    const duplicate = error?.code === 11000;
    res.status(duplicate ? 409 : 500).json({
      error: duplicate ? "A record with this unique value already exists." : "Database error",
    });
  }
});

ensureIndexes()
  .catch((error) => console.error("Index creation failed", error))
  .finally(() => {
    app.listen(PORT, () => console.log(`mongo-api listening on :${PORT} (db: ${dbName})`));
  });
