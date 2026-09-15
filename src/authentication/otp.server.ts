import { SignJWT, jwtVerify } from "jose";
import nodemailer from "nodemailer";

export type OtpPurpose = "activate" | "reset";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

function secret(): Uint8Array {
  const value = process.env["JWT_SECRET"] || "smart-study-ai-default-jwt-secret-key-mits-2025";
  return new TextEncoder().encode(value);
}

export function generateOtpCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]!;
  return String(100000 + (n % 900000));
}

export async function hashOtp(code: string, email: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${email}:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function maskPhone(phone: string): string {
  return phone.length >= 4 ? `••••••${phone.slice(-4)}` : "••••";
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const visible = user.length > 2 ? `${user.slice(0, 2)}•••${user.slice(-1)}` : `${user[0]}•••`;
  return `${visible}@${domain}`;
}

export async function deliverOtpNotification(params: {
  email: string;
  phone: string;
  code: string;
  purpose: OtpPurpose;
}): Promise<{
  sentViaEmail: boolean;
  sentViaSms: boolean;
  deliveryError?: string | undefined;
  devCode?: string | undefined;
}> {
  let sentViaEmail = false;
  let sentViaSms = false;
  let deliveryError: string | undefined;

  const purposeText = params.purpose === "activate" ? "account activation" : "password reset";

  // 1. Email Delivery: SMTP (Gmail, Outlook, Brevo, SES, etc.) or Resend
  const smtpHost = process.env["SMTP_HOST"];
  const smtpUser = process.env["SMTP_USER"];
  const smtpPass = process.env["SMTP_PASS"];
  const resendKey = process.env["RESEND_API_KEY"];

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const port = Number(process.env["SMTP_PORT"] ?? 587);
      const secure = process.env["SMTP_SECURE"] === "true" || port === 465;
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const fromAddress = process.env["EMAIL_FROM"] || `"Smart Study AI MITS" <${smtpUser}>`;
      await transporter.sendMail({
        from: fromAddress,
        to: params.email,
        subject: `Smart Study AI OTP: ${params.code}`,
        text: `Your one-time password for ${purposeText} is: ${params.code}. It expires in 5 minutes.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Smart Study AI — MITS Gwalior</h2>
            <p style="color: #475569; font-size: 14px; line-height: 1.5;">
              Use the following one-time password to complete your <strong>${purposeText}</strong>:
            </p>
            <div style="background-color: #f1f5f9; border-radius: 8px; padding: 18px; text-align: center; margin: 20px 0;">
              <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0284c7;">
                ${params.code}
              </span>
            </div>
            <p style="color: #64748b; font-size: 13px; margin-bottom: 0;">
              This code is valid for 5 minutes. Never share this code with anyone.
            </p>
          </div>
        `,
      });
      sentViaEmail = true;
    } catch (err) {
      console.error("[OTP Email Delivery Error]", err);
    }
  } else if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env["EMAIL_FROM"] || "Smart Study AI <onboarding@resend.dev>",
          to: [params.email],
          subject: `Smart Study AI OTP: ${params.code}`,
          html: `<p>Your verification code for ${purposeText} is: <strong style="font-size:24px; letter-spacing: 4px;">${params.code}</strong>. Valid for 5 minutes.</p>`,
        }),
      });
      if (res.ok) {
        sentViaEmail = true;
      } else {
        const errorText = await res.text();
        console.error("[OTP Resend Delivery Error]", errorText);
        deliveryError = errorText;
      }
    } catch (err) {
      console.error("[OTP Resend Delivery Error]", err);
      deliveryError = err instanceof Error ? err.message : String(err);
    }
  }

  // 2. SMS Delivery: Fast2SMS or Twilio
  const fast2smsKey = process.env["FAST2SMS_API_KEY"];
  const twilioSid = process.env["TWILIO_ACCOUNT_SID"];
  const twilioAuth = process.env["TWILIO_AUTH_TOKEN"];
  const twilioFrom = process.env["TWILIO_PHONE_NUMBER"];

  if (fast2smsKey) {
    try {
      const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: fast2smsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: params.code,
          numbers: params.phone,
        }),
      });
      const data = (await res.json().catch(() => null)) as { return?: boolean } | null;
      if (data?.return === true) {
        sentViaSms = true;
      } else {
        console.error("[OTP SMS Delivery Error - Fast2SMS]", data);
      }
    } catch (err) {
      console.error("[OTP SMS Delivery Error - Fast2SMS]", err);
    }
  } else if (twilioSid && twilioAuth && twilioFrom) {
    try {
      const e164Phone = params.phone.startsWith("+") ? params.phone : `+91${params.phone}`;
      const authHeader = Buffer.from(`${twilioSid}:${twilioAuth}`).toString("base64");
      const body = new URLSearchParams({
        To: e164Phone,
        From: twilioFrom,
        Body: `Smart Study AI: Your OTP for ${purposeText} is ${params.code}. Valid for 5 minutes.`,
      });
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${authHeader}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        },
      );
      if (res.ok) sentViaSms = true;
      else {
        console.error("[OTP SMS Delivery Error - Twilio]", await res.text());
      }
    } catch (err) {
      console.error("[OTP SMS Delivery Error - Twilio]", err);
    }
  }

  // Secure server-side log for auditing and fallback
  console.info(
    `[Smart Study AI OTP] Code dispatched for ${params.email} / ${params.phone} [Email sent: ${sentViaEmail}, SMS sent: ${sentViaSms}] (Code: ${params.code})`,
  );

  // If real email delivery didn't succeed (e.g. Resend free tier restrictions, wrong key, or testing),
  // provide devCode so student/faculty are never locked out of testing.
  const isProd = process.env["NODE_ENV"] === "production" && (sentViaEmail || sentViaSms);
  const devCode = isProd ? undefined : params.code;

  return { sentViaEmail, sentViaSms, deliveryError, devCode };
}

export async function issueOtpToken(email: string, purpose: OtpPurpose): Promise<string> {
  return new SignJWT({ email, purpose, kind: "otp" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret());
}

export async function assertOtpToken(
  token: string,
  email: string,
  purpose: OtpPurpose,
): Promise<void> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (
      payload["kind"] !== "otp" ||
      payload["purpose"] !== purpose ||
      String(payload["email"]).toLowerCase() !== email.toLowerCase()
    ) {
      throw new Error("invalid");
    }
  } catch {
    throw new Error("Your OTP verification has expired. Please request a new code.");
  }
}
