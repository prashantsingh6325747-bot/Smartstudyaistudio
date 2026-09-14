import { Link, createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

const logoAsset = { url: "/mits-logo.png" };
import { OtpStep } from "@/frontend/components/otp-step";
import { ThemeToggle } from "@/frontend/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminExists,
  checkAccount,
  createPassword,
  getMe,
  login,
} from "@/authentication/auth.functions";
import { COLLEGE_EMAIL_DOMAIN } from "@/shared/types";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Smart Study AI, MITS Gwalior" },
      {
        name: "description",
        content:
          "Sign in or activate your Smart Study AI account with your MITS Gwalior institute email, enrollment number and registered phone number.",
      },
      { property: "og:title", content: "Sign in — Smart Study AI, MITS Gwalior" },
      {
        property: "og:description",
        content: "Institute-only access to the MITS Gwalior Smart Study AI platform.",
      },
    ],
  }),
  loader: async () => {
    const me = await getMe().catch(() => null);
    if (me) {
      if (me.role === "admin") {
        throw redirect({ to: "/admin" });
      }
      throw redirect({ to: "/dashboard" });
    }
    const admin = await adminExists().catch(() => ({ exists: true }));
    return { adminConfigured: admin.exists };
  },

  component: AuthPage,
});

function AuthPage() {
  const { adminConfigured } = Route.useLoaderData();

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoAsset.url} alt="MITS Gwalior" className="size-11 rounded-full" />
            <div className="leading-tight">
              <p className="text-sm font-semibold">Smart Study AI</p>
              <p className="text-xs text-muted-foreground">MITS Gwalior</p>
            </div>
          </Link>
          <ThemeToggle />
        </div>

        <Card className="shadow-panel">
          <CardHeader>
            <CardTitle>Institute account</CardTitle>
            <CardDescription>
              Only @{COLLEGE_EMAIL_DOMAIN} accounts registered by the administration can be used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Activate account</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="pt-4">
                <SignInForm />
              </TabsContent>
              <TabsContent value="signup" className="pt-4">
                <SignUpForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/forgot-password" className="underline underline-offset-4">
            Forgot password?
          </Link>
          {adminConfigured ? null : (
            <>
              {" · "}
              <Link to="/setup" className="underline underline-offset-4">
                Create the first administrator
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function SignInForm() {
  const router = useRouter();
  const navigate = useNavigate();
  const signIn = useServerFn(login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
          const res = await signIn({ data: { email, password } });
          if (res.token && typeof window !== "undefined") {
            try {
              localStorage.setItem("ssai_token", res.token);
            } catch {
              // LocalStorage quota or access issue
            }
          }
          toast.success("Signed in successfully.");
          await router.invalidate();
          if (res.role === "admin") {
            await navigate({ to: "/admin" });
          } else {
            await navigate({ to: "/dashboard" });
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Unable to sign in.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="signin-email">College email</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-password">Password</Label>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const router = useRouter();
  const navigate = useNavigate();
  const verify = useServerFn(checkAccount);
  const setPasswordFn = useServerFn(createPassword);

  const [email, setEmail] = useState("");
  const [enrollmentNo, setEnrollmentNo] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [stage, setStage] = useState<"verify" | "otp" | "create" | "exists">("verify");
  const [notice, setNotice] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [busy, setBusy] = useState(false);

  if (stage === "exists") {
    return (
      <div className="space-y-4 text-sm">
        <p className="rounded-lg border border-border bg-secondary p-3">{notice}</p>
        <div className="flex flex-col gap-2">
          <Button asChild variant="outline">
            <Link to="/forgot-password">Yes, change my password</Link>
          </Button>
          <Button variant="ghost" onClick={() => setStage("verify")}>
            No, go back
          </Button>
        </div>
      </div>
    );
  }

  if (stage === "otp") {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-border bg-secondary p-3 text-sm">{notice}</p>
        <OtpStep
          email={email}
          phone={phone}
          purpose="activate"
          onBack={() => setStage("verify")}
          onVerified={(token) => {
            setOtpToken(token);
            setStage("create");
          }}
        />
      </div>
    );
  }

  if (stage === "create") {
    return (
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
            const res = await setPasswordFn({
              data: { email, enrollmentNo, phone, password, otpToken },
            });
            if (res.token && typeof window !== "undefined") {
              try {
                localStorage.setItem("ssai_token", res.token);
              } catch {
                // ignore
              }
            }
            toast.success("Account activated.");
            await router.invalidate();
            if (res.role === "admin") {
              await navigate({ to: "/admin" });
            } else {
              await navigate({ to: "/dashboard" });
            }
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to create password.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="rounded-lg border border-border bg-secondary p-3 text-sm">{notice}</p>
        <div className="space-y-2">
          <Label htmlFor="new-password">Create password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Saving…" : "Create password"}
        </Button>
      </form>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
          const result = await verify({ data: { email, enrollmentNo, phone } });
          setNotice(result.message);
          if (result.status === "needs_password") setStage("otp");
          else if (result.status === "has_password") setStage("exists");
          else toast.error(result.message);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Verification failed.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="signup-email">College email</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-enrollment">Enrollment number</Label>
        <Input
          id="signup-enrollment"
          value={enrollmentNo}
          onChange={(e) => setEnrollmentNo(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-phone">Phone number</Label>
        <Input
          id="signup-phone"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Checking records…" : "Verify my record"}
      </Button>
    </form>
  );
}
