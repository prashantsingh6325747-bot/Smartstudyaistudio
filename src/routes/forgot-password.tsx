import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

const logoAsset = { url: "/mits-logo.png" };
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword, verifyPhoneForReset } from "@/authentication/auth.functions";
import { OtpStep } from "@/frontend/components/otp-step";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Smart Study AI, MITS Gwalior" },
      {
        name: "description",
        content:
          "Reset your Smart Study AI password with a one-time password sent to the phone number registered with MITS Gwalior.",
      },
      { property: "og:title", content: "Reset password — Smart Study AI" },
      {
        property: "og:description",
        content: "Verify a one-time password on your registered number to set a new password.",
      },
    ],
  }),
  component: ForgotPassword,
});

type Stage = "identify" | "otp" | "reset";

function ForgotPassword() {
  const navigate = useNavigate();
  const verify = useServerFn(verifyPhoneForReset);
  const reset = useServerFn(resetPassword);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [stage, setStage] = useState<Stage>("identify");
  const [busy, setBusy] = useState(false);

  const title =
    stage === "identify"
      ? "Verify your phone number"
      : stage === "otp"
        ? "Enter the one-time password"
        : "Set a new password";

  const description =
    stage === "identify"
      ? "Enter your college email and the phone number registered with the institute."
      : stage === "otp"
        ? "We sent a 6 digit code to your registered number."
        : "Your identity has been verified with a one-time password.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center gap-3">
          <img src={logoAsset.url} alt="MITS Gwalior" className="size-11 rounded-full" />
          <div className="leading-tight">
            <p className="text-sm font-semibold">Smart Study AI</p>
            <p className="text-xs text-muted-foreground">MITS Gwalior</p>
          </div>
        </Link>

        <Card className="shadow-panel">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            {stage === "otp" ? (
              <OtpStep
                email={email}
                phone={phone}
                purpose="reset"
                onBack={() => setStage("identify")}
                onVerified={(token) => {
                  setOtpToken(token);
                  setStage("reset");
                }}
              />
            ) : stage === "reset" ? (
              <form
                className="space-y-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (password !== confirm) {
                    toast.error("Passwords do not match.");
                    return;
                  }
                  setBusy(true);
                  try {
                    await reset({ data: { email, phone, password, otpToken } });
                    toast.success("Password updated. Please sign in.");
                    navigate({ to: "/auth" });
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Reset failed.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="reset-password">New password</Label>
                  <Input
                    id="reset-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-confirm">Confirm password</Label>
                  <Input
                    id="reset-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Updating…" : "Update password"}
                </Button>
              </form>
            ) : (
              <form
                className="space-y-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setBusy(true);
                  try {
                    await verify({ data: { email, phone } });
                    setStage("otp");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Verification failed.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="reset-email">College email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-phone">Registered phone number</Label>
                  <Input
                    id="reset-phone"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Verifying…" : "Send OTP"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/auth" className="underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
