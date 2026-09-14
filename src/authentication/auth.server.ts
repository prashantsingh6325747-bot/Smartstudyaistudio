import { SignJWT, jwtVerify } from "jose";
import { getCookie, setCookie, deleteCookie, getRequestHeader } from "@tanstack/react-start/server";

import { collection, COLLECTIONS, ObjectId, type Doc } from "@/backend/mongo.server";
import type { Role, SessionUser, UserDTO, AcademicLevel } from "@/shared/types";

const COOKIE_NAME = "ssai_session";
const ITERATIONS = 120_000;

function b64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}
function fromB64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

async function derive(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt);
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4) return false;
  const salt = fromB64(parts[2]!);
  const expected = parts[3]!;
  const hash = await derive(password, salt);
  return b64(hash) === expected;
}

function secret(): Uint8Array {
  const value = process.env["JWT_SECRET"] || "smart-study-ai-default-jwt-secret-key-mits-2025";
  return new TextEncoder().encode(value);
}

export async function issueSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());

  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    partitioned: true,
  });

  return token;
}

export function clearSessionCookie(): void {
  deleteCookie(COOKIE_NAME, {
    path: "/",
    secure: true,
    sameSite: "none",
    partitioned: true,
  });
}

export async function readSession(): Promise<SessionUser | null> {
  let token = getCookie(COOKIE_NAME);
  if (!token) {
    try {
      const authHeader = getRequestHeader("x-session-token") || getRequestHeader("authorization");
      if (authHeader) {
        token = authHeader.replace(/^Bearer\s+/i, "").trim();
      }
    } catch {
      // not in request context
    }
  }
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload["id"] ?? payload.sub),
      name: String(payload["name"] ?? ""),
      email: String(payload["email"] ?? ""),
      role: payload["role"] as Role,
      programId: (payload["programId"] as string | null) ?? null,
      semester: (payload["semester"] as number | null) ?? null,
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await readSession();
  if (!session) throw new Error("Not authenticated");
  return session;
}

export async function requireAuth(): Promise<SessionUser> {
  return requireSession();
}

export async function getMe(): Promise<UserDTO | null> {
  const session = await readSession();
  if (!session) return null;
  const user = await findUserById(session.id);
  if (!user) return null;
  return toUserDTO(user);
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const session = await requireSession();
  if (!roles.includes(session.role)) throw new Error("Not authorised");
  return session;
}

export function toUserDTO(doc: Doc): UserDTO {
  return {
    id: doc._id.toString(),
    name: (doc["name"] as string) ?? "",
    email: (doc["email"] as string) ?? "",
    phone: (doc["phone"] as string) ?? "",
    enrollmentNo: (doc["enrollmentNo"] as string | undefined) ?? null,
    role: (doc["role"] as Role) ?? "student",
    hasPassword: Boolean(doc["passwordHash"]),
    academicLevel: (doc["academicLevel"] as AcademicLevel | undefined) ?? null,
    departmentId: (doc["departmentId"] as string | undefined) ?? null,
    programId: (doc["programId"] as string | undefined) ?? null,
    semester: (doc["semester"] as number | undefined) ?? null,
    active: doc["active"] !== false,
    createdAt:
      doc["createdAt"] instanceof Date
        ? (doc["createdAt"] as Date).toISOString()
        : new Date().toISOString(),
  };
}

export async function findUserByEmail(email: string) {
  const users = await collection(COLLECTIONS.users);
  return users.findOne({ email: email.trim().toLowerCase() });
}

export async function findUserById(id: string) {
  const users = await collection(COLLECTIONS.users);
  if (!ObjectId.isValid(id)) return null;
  return users.findOne({ _id: new ObjectId(id) });
}
