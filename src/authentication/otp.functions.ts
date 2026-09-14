import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { collection, COLLECTIONS } from "@/backend/mongo.server";
import {
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  assertOtpToken,
  deliverOtpNotification,
  generateOtpCode,
  hashOtp,
  issueOtpToken,
  maskEmail,
  maskPhone,
} from "@/authentication/otp.server";
import { COLLEGE_EMAIL_DOMAIN } from "@/shared/types";

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
const purposeSchema = z.enum(["activate", "reset"]);

export const sendOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ email: emailSchema, phone: phoneSchema, purpose: purposeSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const users = await collection(COLLECTIONS.users);
    const doc = await users.findOne({ email: data.email });
    if (!doc || String(doc["phone"] ?? "") !== data.phone) {
      throw new Error("Email and phone number do not match any institute record.");
    }
    if (doc["active"] === false) throw new Error("This account has been deactivated.");
    if (data.purpose === "activate" && doc["passwordHash"]) {
      throw new Error("A password already exists for this account.");
    }

    const code = generateOtpCode();
    const otps = await collection(COLLECTIONS.otps);
    await otps.deleteMany({ email: data.email, purpose: data.purpose });
    await otps.insertOne({
      email: data.email,
      phone: data.phone,
      purpose: data.purpose,
      codeHash: await hashOtp(code, data.email),
      attempts: 0,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    const delivery = await deliverOtpNotification({
      email: data.email,
      phone: data.phone,
      code,
      purpose: data.purpose,
    });

    return {
      ok: true as const,
      maskedPhone: maskPhone(data.phone),
      maskedEmail: maskEmail(data.email),
      sentViaEmail: delivery.sentViaEmail,
      sentViaSms: delivery.sentViaSms,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    };
  });

export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        email: emailSchema,
        purpose: purposeSchema,
        code: z
          .string()
          .trim()
          .regex(/^[0-9]{6}$/, "Enter the 6 digit code"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const otps = await collection(COLLECTIONS.otps);
    const records = await otps
      .find({ email: data.email, purpose: data.purpose })
      .sort({ createdAt: -1 })
      .toArray();
    const live = records.filter((r) => new Date(r["expiresAt"] as Date).getTime() >= Date.now());
    if (live.length === 0) {
      await otps.deleteMany({ email: data.email, purpose: data.purpose });
      throw new Error("No active code, or it has expired. Please request a new OTP.");
    }
    if (live.every((r) => Number(r["attempts"] ?? 0) >= OTP_MAX_ATTEMPTS)) {
      await otps.deleteMany({ email: data.email, purpose: data.purpose });
      throw new Error("Too many incorrect attempts. Please request a new OTP.");
    }
    const codeHash = await hashOtp(data.code, data.email);
    const match = live.find((r) => r["codeHash"] === codeHash);
    if (!match) {
      await otps.updateMany({ _id: { $in: live.map((r) => r._id) } }, { $inc: { attempts: 1 } });
      throw new Error("Incorrect OTP. Please try again.");
    }
    await otps.deleteMany({ email: data.email, purpose: data.purpose });
    return { ok: true as const, otpToken: await issueOtpToken(data.email, data.purpose) };
  });
