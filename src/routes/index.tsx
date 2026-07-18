import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutGrid, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { BrandLogo } from "@/components/BrandLogo";
import { useStore } from "@/lib/api-store";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { currentUser, isLoading, login } = useStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoading || !currentUser) return;
    navigate({ to: currentUser.role === "admin" ? "/admin" : "/employee" });
  }, [currentUser, isLoading, navigate]);

  const signIn = async (nextUsername: string, nextPassword: string) => {
    setBusy(true);
    try {
      const user = await login(nextUsername, nextPassword);
      toast.success(`Welcome, ${user.name}`);
      navigate({ to: user.role === "admin" ? "/admin" : "/employee" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Please enter username and password");
      return;
    }
    void signIn(username, password);
  };

  return (
    <div className="grid min-h-screen w-full bg-background lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(187,161,83,0.22),transparent_48%),radial-gradient(circle_at_78%_82%,rgba(120,220,255,0.12),transparent_46%)]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <BrandLogo textClassName="text-sidebar-foreground" />
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold leading-tight">
              Track event work and daily reports <span className="text-sidebar-primary">clearly.</span>
            </h1>
            <p className="max-w-md text-sm text-sidebar-foreground/70">{APP_TAGLINE}</p>
            <div className="grid max-w-md gap-3 sm:grid-cols-2">
              {[
                { icon: LayoutGrid, label: "Live operations dashboard" },
                { icon: Shield, label: "Role-based access" },
              ].map((feature) => (
                <div
                  key={feature.label}
                  className="flex items-center gap-2 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/40 px-3 py-2"
                >
                  <feature.icon className="h-4 w-4 text-sidebar-primary" />
                  <span className="text-sm">{feature.label}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-sidebar-foreground/50">
            Copyright {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <BrandLogo compact className="mb-6 lg:hidden" />
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">Enter your backend account credentials.</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy || isLoading}>
                {busy ? "Signing in..." : "Sign in"}
              </Button>
            </form>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
