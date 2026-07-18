import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, FileText, FolderKanban, Timer, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { SummaryCard } from "@/components/SummaryCard";
import { StatusBadge } from "@/components/StatusBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, useStore } from "@/lib/api-store";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { users, projects, reports, audit } = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const employees = users.filter((u) => u.role === "employee");
  const activeProjects = projects.filter((p) => p.status === "Active");
  const todaysReports = reports.filter((r) => r.date === today);
  const pendingReviews = reports.filter((r) => r.status === "Submitted" || r.status === "Under Review");
  const approvedReports = reports.filter((r) => r.status === "Approved");
  const totalHours = reports.reduce((sum, report) => sum + report.timeSpent, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="A snapshot of your team's projects and daily reports."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="Employees" value={employees.length} icon={Users} />
        <SummaryCard label="Active Projects" value={activeProjects.length} icon={FolderKanban} tone="accent" />
        <SummaryCard label="Today's Reports" value={todaysReports.length} icon={FileText} tone="success" />
        <SummaryCard label="Pending Reviews" value={pendingReviews.length} icon={Clock} tone="warning" />
        <SummaryCard label="Approved Reports" value={approvedReports.length} icon={CheckCircle2} tone="success" />
        <SummaryCard label="Logged Hours" value={totalHours.toFixed(1)} icon={Timer} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent employee reports</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/admin/reports">View all</Link></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {reports.slice(0, 5).map((r) => {
              const emp = users.find((u) => u.id === r.employeeId);
              const project = projects.find((p) => p.id === r.projectId);
              return (
                <Link
                  key={r.id}
                  to="/admin/reports/$id"
                  params={{ id: r.id }}
                  className="flex items-center gap-3 rounded-lg border p-3 transition hover:bg-muted/50"
                >
                  <UserAvatar name={emp?.name ?? "?"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{emp?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {project?.name} - {formatDate(r.date)}
                    </p>
                  </div>
                  <StatusBadge value={r.status} />
                </Link>
              );
            })}
            {reports.length === 0 && <p className="text-sm text-muted-foreground">No reports submitted yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Project progress</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {projects.slice(0, 4).map((p) => (
              <div key={p.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <span className="text-xs text-muted-foreground">{p.progress}%</span>
                </div>
                <Progress value={p.progress} className="h-2" />
              </div>
            ))}
            {projects.length === 0 && <p className="text-sm text-muted-foreground">No projects yet.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Recent projects</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {projects.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.progress}% complete</p>
                </div>
                <StatusBadge value={p.priority} />
              </div>
            ))}
            {projects.length === 0 && <p className="text-sm text-muted-foreground">No projects yet.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pending reviews</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {pendingReviews.slice(0, 5).map((r) => {
              const emp = users.find((u) => u.id === r.employeeId);
              const project = projects.find((p) => p.id === r.projectId);
              return (
                <Link key={r.id} to="/admin/reports/$id" params={{ id: r.id }} className="block rounded-lg border p-3 hover:bg-muted/50">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{emp?.name}</p>
                    <StatusBadge value={r.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {project?.name} - {formatDate(r.date)}
                  </p>
                </Link>
              );
            })}
            {pendingReviews.length === 0 && <p className="text-sm text-muted-foreground">No pending reviews.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {audit.slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                <div className="min-w-0">
                  <p className="truncate"><span className="font-medium">{a.user}</span> {a.action.toLowerCase()}</p>
                  <p className="text-xs text-muted-foreground">{a.target} - {formatDateTime(a.createdAt)}</p>
                </div>
              </div>
            ))}
            {audit.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
