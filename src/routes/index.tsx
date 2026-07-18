import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LayoutGrid, Shield, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useStore } from "@/lib/mock-store";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { login } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const enter = (role: "admin" | "employee") => {
    login(role);
    toast.success(`Welcome, signed in as ${role}`);
    navigate({ to: role === "admin" ? "/admin" : "/employee" });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    // Frontend-only: infer role from email
    const role = email.toLowerCase().includes("admin") || email.toLowerCase().includes("sarah") ? "admin" : "employee";
    enter(role);
  };

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2 bg-background">
      <div className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(120,220,255,0.18),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(120,220,255,0.12),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground text-lg font-bold">P</div>
            <span className="text-lg font-semibold">Prism</span>
          </div>
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold leading-tight">
              Track projects and daily work — <span className="text-sidebar-primary">clearly.</span>
            </h1>
            <p className="max-w-md text-sm text-sidebar-foreground/70">
              A modern workspace for teams. Assign work, submit daily reports, review, and keep everything moving forward.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 max-w-md">
              {[
                { icon: LayoutGrid, label: "Unified dashboard" },
                { icon: Shield, label: "Role-based access" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-2 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/40 px-3 py-2">
                  <f.icon className="h-4 w-4 text-sidebar-primary" />
                  <span className="text-sm">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-sidebar-foreground/50">© {new Date().getFullYear()} Prism. All rights reserved.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="lg:hidden mb-6 flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">P</div>
              <span className="text-lg font-semibold">Prism</span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">Enter your credentials or preview a role below.</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full">Sign in</Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Demo access</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={() => enter("admin")} className="gap-2">
                <Shield className="h-4 w-4" /> Demo Admin
              </Button>
              <Button variant="outline" onClick={() => enter("employee")} className="gap-2">
                <UserIcon className="h-4 w-4" /> Demo Employee
              </Button>
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Frontend demo only. Employee accounts are created by admins.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
