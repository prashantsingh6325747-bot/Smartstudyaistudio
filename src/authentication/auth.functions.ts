import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { collection, COLLECTIONS, ObjectId, pingDatabase } from "@/backend/mongo.server";
import {
  clearSessionCookie,
  findUserByEmail,
  hashPassword,
  issueSession,
  readSession,
  requireSession,
  toUserDTO,
  verifyPassword,
} from "@/authentication/auth.server";
import { assertOtpToken } from "@/authentication/otp.server";
import { COLLEGE_EMAIL_DOMAIN } from "@/shared/types";
import type { SessionUser, UserDTO } from "@/shared/types";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .refine((v) => v.endsWith(`@${COLLEGE_EMAIL_DOMAIN}`), {
    message: `Only college email addresses (@${COLLEGE_EMAIL_DOMAIN}) are allowed`,
  });

const phoneSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{10}$/, "Enter a valid 10 digit phone number");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

export const getMe = createServerFn({ method: "GET" }).handler(
  async (): Promise<UserDTO | null> => {
    const session = await readSession();
    if (!session) return null;
    const users = await collection(COLLECTIONS.users);
    if (!ObjectId.isValid(session.id)) return null;
    const doc = await users.findOne({ _id: new ObjectId(session.id) });
    if (!doc || doc["active"] === false) return null;
    return toUserDTO(doc);
  },
);

export const checkAccount = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        email: emailSchema,
        enrollmentNo: z.string().trim().optional().default(""),
        phone: phoneSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const users = await collection(COLLECTIONS.users);
    const doc = await users.findOne({ email: data.email });
    if (!doc) {
      return {
        status: "not_found" as const,
        message:
          "No institute record found for this email. Contact the administrator to get your account registered.",
      };
    }
    const phoneMatches = String(doc["phone"] ?? "") === data.phone;
    const isStudent = doc["role"] === "student";
    const expectedEnrollment = String(doc["enrollmentNo"] ?? "")
      .trim()
      .toLowerCase();
    const providedEnrollment = (data.enrollmentNo || "").trim().toLowerCase();

    // Students must match their enrollment number; faculty/admin only match if one was assigned
    let enrollmentMatches = true;
    if (isStudent || expectedEnrollment.length > 0) {
      enrollmentMatches = expectedEnrollment === providedEnrollment;
    }

    if (!phoneMatches || !enrollmentMatches) {
      return {
        status: "mismatch" as const,
        message: isStudent
          ? "The enrollment number or phone number does not match our records."
          : "The phone number (or Employee ID) does not match our records.",
      };
    }
    if (doc["passwordHash"]) {
      return {
        status: "has_password" as const,
        name: String(doc["name"] ?? ""),
        message: "Password already exists. Would you like to change it?",
      };
    }
    return {
      status: "needs_password" as const,
      name: String(doc["name"] ?? ""),
      message: "Account verified. Create your password to continue.",
    };
  });

export const createPassword = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        email: emailSchema,
        enrollmentNo: z.string().trim().optional().default(""),
        phone: phoneSchema,
        password: passwordSchema,
        otpToken: z.string().min(1, "OTP verification is required"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await assertOtpToken(data.otpToken, data.email, "activate");
    const users = await collection(COLLECTIONS.users);
    const doc = await users.findOne({ email: data.email });
    if (!doc) throw new Error("No institute record found for this email.");

    const isStudent = doc["role"] === "student";
    const expectedEnrollment = String(doc["enrollmentNo"] ?? "")
      .trim()
      .toLowerCase();
    const providedEnrollment = (data.enrollmentNo || "").trim().toLowerCase();
    if ((isStudent || expectedEnrollment.length > 0) && expectedEnrollment !== providedEnrollment) {
      throw new Error(
        isStudent
          ? "Enrollment number does not match our records."
          : "Employee/Staff ID does not match our records.",
      );
    }
    if (String(doc["phone"] ?? "") !== data.phone) {
      throw new Error("Phone number does not match our records.");
    }
    if (doc["passwordHash"]) throw new Error("A password already exists for this account.");

    const passwordHash = await hashPassword(data.password);
    await users.updateOne({ _id: doc._id }, { $set: { passwordHash, updatedAt: new Date() } });

    const session: SessionUser = {
      id: doc._id.toString(),
      name: String(doc["name"] ?? ""),
      email: String(doc["email"]),
      role: (doc["role"] as SessionUser["role"]) ?? "student",
      programId: (doc["programId"] as string | undefined) ?? null,
      semester: (doc["semester"] as number | undefined) ?? null,
    };
    const token = await issueSession(session);
    return { ok: true as const, role: session.role, token };
  });

export const login = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ email: emailSchema, password: z.string().min(1, "Password is required") })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const doc = await findUserByEmail(data.email);
    if (!doc || !doc["passwordHash"]) {
      throw new Error("Invalid email or password.");
    }
    if (doc["active"] === false) throw new Error("This account has been deactivated.");
    const valid = await verifyPassword(data.password, String(doc["passwordHash"]));
    if (!valid) throw new Error("Invalid email or password.");

    const session: SessionUser = {
      id: doc._id.toString(),
      name: String(doc["name"] ?? ""),
      email: String(doc["email"]),
      role: (doc["role"] as SessionUser["role"]) ?? "student",
      programId: (doc["programId"] as string | undefined) ?? null,
      semester: (doc["semester"] as number | undefined) ?? null,
    };
    const token = await issueSession(session);
    return { ok: true as const, role: session.role, token };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  clearSessionCookie();
  return { ok: true as const };
});

export const verifyPhoneForReset = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ email: emailSchema, phone: phoneSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const doc = await findUserByEmail(data.email);
    if (!doc || String(doc["phone"] ?? "") !== data.phone) {
      throw new Error("Email and phone number do not match any account.");
    }
    return { ok: true as const, name: String(doc["name"] ?? "") };
  });

export const resetPassword = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        email: emailSchema,
        phone: phoneSchema,
        password: passwordSchema,
        otpToken: z.string().min(1, "OTP verification is required"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await assertOtpToken(data.otpToken, data.email, "reset");
    const users = await collection(COLLECTIONS.users);
    const doc = await users.findOne({ email: data.email });
    if (!doc || String(doc["phone"] ?? "") !== data.phone) {
      throw new Error("Email and phone number do not match any account.");
    }
    const passwordHash = await hashPassword(data.password);
    await users.updateOne({ _id: doc._id }, { $set: { passwordHash, updatedAt: new Date() } });
    return { ok: true as const };
  });

export const changePassword = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const session = await requireSession();
    const users = await collection(COLLECTIONS.users);
    const doc = await users.findOne({ _id: new ObjectId(session.id) });
    if (!doc?.["passwordHash"]) throw new Error("No password set for this account.");
    const valid = await verifyPassword(data.currentPassword, String(doc["passwordHash"]));
    if (!valid) throw new Error("Current password is incorrect.");
    const passwordHash = await hashPassword(data.newPassword);
    await users.updateOne({ _id: doc._id }, { $set: { passwordHash, updatedAt: new Date() } });
    return { ok: true as const };
  });

export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(2, "Name is required"),
        email: emailSchema,
        phone: phoneSchema,
        password: passwordSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const users = await collection(COLLECTIONS.users);
    const existingAdmins = await users.countDocuments({ role: "admin" });
    if (existingAdmins > 0) {
      throw new Error("An administrator account already exists.");
    }
    const passwordHash = await hashPassword(data.password);
    const result = await users.insertOne({
      name: data.name,
      email: data.email,
      phone: data.phone,
      enrollmentNo: null,
      role: "admin",
      passwordHash,
      active: true,
      createdAt: new Date(),
    });
    const token = await issueSession({
      id: result.insertedId.toString(),
      name: data.name,
      email: data.email,
      role: "admin",
      programId: null,
      semester: null,
    });
    return { ok: true as const, role: "admin" as const, token };
  });

export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const users = await collection(COLLECTIONS.users);
  const count = await users.countDocuments({ role: "admin" });
  return { exists: count > 0 };
});

export const getDatabaseStatus = createServerFn({ method: "GET" }).handler(async () => {
  const isDirect = Boolean(process.env["MONGODB_URI"]?.trim());
  const isHttp = Boolean(
    process.env["MONGO_API_URL"]?.trim() && process.env["MONGO_API_KEY"]?.trim(),
  );
  const isConnected = await pingDatabase().catch(() => false);
  return {
    mode: isDirect ? ("direct" as const) : isHttp ? ("http" as const) : ("in-memory" as const),
    connected: isConnected,
  };
});
