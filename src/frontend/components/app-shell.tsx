import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, Search } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";

const logoAsset = { url: "/mits-logo.png" };
import { ThemeToggle } from "@/frontend/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logout } from "@/authentication/auth.functions";
import { GlobalSearchDialog } from "@/frontend/components/global-search-dialog";
import type { UserDTO } from "@/shared/types";

export function AppShell({ user, children }: { user: UserDTO; children: ReactNode }) {
  const router = useRouter();
  const navigate = useNavigate();
  const signOut = useServerFn(logout);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src={logoAsset.url} alt="MITS Gwalior" className="size-9 rounded-full" />
            <span className="hidden text-sm font-semibold tracking-tight sm:block">
              Smart Study AI
            </span>
          </Link>
          <nav className="ml-4 flex items-center gap-1 text-sm">
            <Link
              to="/dashboard"
              className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "rounded-md px-3 py-1.5 bg-secondary text-foreground" }}
            >
              Dashboard
            </Link>
            {user.role === "admin" ? (
              <Link
                to="/admin"
                className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "rounded-md px-3 py-1.5 bg-secondary text-foreground" }}
              >
                Administration
              </Link>
            ) : null}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <Search className="size-3.5" />
              <span className="hidden sm:inline">Search repository...</span>
              <kbd className="hidden sm:inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono border border-border/80">
                ⌘K
              </kbd>
            </button>

            <Badge variant="secondary" className="capitalize">
              {user.role}
            </Badge>
            <span className="hidden text-sm text-muted-foreground md:block">{user.email}</span>
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (typeof window !== "undefined") {
                  try {
                    localStorage.removeItem("ssai_token");
                  } catch {
                    // ignore
                  }
                }
                await signOut({});
                await router.invalidate();
                navigate({ to: "/auth", replace: true });
              }}
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>

      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
