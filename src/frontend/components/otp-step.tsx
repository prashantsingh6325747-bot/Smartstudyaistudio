import { useServerFn } from "@tanstack/react-start";
import { Mail, ShieldCheck, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendOtp, verifyOtp } from "@/authentication/otp.functions";

export function OtpStep({
  email,
  phone,
  purpose,
  onVerified,
  onBack,
}: {
  email: string;
  phone: string;
  purpose: "activate" | "reset";
  onVerified: (otpToken: string) => void;
  onBack?: () => void;
}) {
  const request = useServerFn(sendOtp);
  const check = useServerFn(verifyOtp);

  const [code, setCode] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [sentViaEmail, setSentViaEmail] = useState(false);
  const [sentViaSms, setSentViaSms] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const requested = useRef(false);

  async function deliver() {
    setSending(true);
    try {
      const result = await request({ data: { email, phone, purpose } });
      setMaskedPhone(result.maskedPhone);
      setMaskedEmail(result.maskedEmail);
      setSentViaEmail(Boolean(result.sentViaEmail));
      setSentViaSms(Boolean(result.sentViaSms));
      setSeconds(result.expiresInSeconds);

      if (result.sentViaEmail && result.sentViaSms) {
        toast.success(`OTP sent to email and phone`);
      } else if (result.sentViaEmail) {
        toast.success(`OTP sent to your email`);
      } else if (result.sentViaSms) {
        toast.success(`OTP sent to your phone`);
      } else {
        toast.success(`OTP generated for ${result.maskedPhone}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the OTP.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    void deliver();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
          const result = await check({ data: { email, purpose, code } });
          onVerified(result.otpToken);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Verification failed.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="rounded-lg border border-border bg-secondary/70 p-3.5 text-sm space-y-2">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <ShieldCheck className="size-4 text-primary" />
          <span>Security Verification</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          A 6-digit one-time password valid for 5 minutes has been dispatched to your registered
          details:
        </p>
        <div className="flex flex-col gap-1 pt-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Mail className="size-3.5 shrink-0 text-muted-foreground/80" />
            <span>
              Email: <strong className="text-foreground">{maskedEmail || "…"}</strong>
              {sentViaEmail ? (
                <span className="ml-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  (Delivered)
                </span>
              ) : null}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="size-3.5 shrink-0 text-muted-foreground/80" />
            <span>
              Phone: <strong className="text-foreground">{maskedPhone || "…"}</strong>
              {sentViaSms ? (
                <span className="ml-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  (Delivered)
                </span>
              ) : null}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="otp-code">Enter 6-digit OTP</Label>
        <Input
          id="otp-code"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          placeholder="••••••"
          className="text-center text-xl font-mono tracking-[0.4em]"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
          required
          autoFocus
        />
      </div>

      <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
        {busy ? "Verifying…" : "Verify & Continue"}
      </Button>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <button
          type="button"
          className="underline underline-offset-4 disabled:no-underline disabled:opacity-50"
          disabled={sending || seconds > 240}
          onClick={() => void deliver()}
        >
          {sending ? "Sending…" : seconds > 240 ? `Resend in ${seconds - 240}s` : "Resend OTP"}
        </button>
        {onBack ? (
          <button type="button" className="underline underline-offset-4" onClick={onBack}>
            Change details
          </button>
        ) : null}
      </div>
    </form>
  );
}
