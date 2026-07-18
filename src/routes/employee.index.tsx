import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, FileText, FolderKanban, Timer } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { SummaryCard } from "@/components/SummaryCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, useStore } from "@/lib/api-store";

export const Route = createFileRoute("/employee/")({ component: EmployeeDashboard });

function EmployeeDashboard() {
  const { currentUser, reports, projects } = useStore();
  if (!currentUser) return null;
  const myReports = reports.filter((r) => r.employeeId === currentUser.id);
  const myProjects = projects.filter((p) => p.assignees.includes(currentUser.id));
  const pending = myReports.filter((r) => ["Submitted", "Under Review", "Changes Required"].includes(r.status)).length;
  const today = new Date().toISOString().slice(0, 10);
  const todaysReport = myReports.find((r) => r.date === today);
  const totalHours = myReports.reduce((sum, report) => sum + report.timeSpent, 0);

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${currentUser.name.split(" ")[0]}`} description="Submit your daily report and track admin feedback." actions={
        <Button asChild><Link to="/employee/report">{todaysReport ? "Update today's report" : "Submit today's report"}</Link></Button>
      } />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Assigned Projects" value={myProjects.length} icon={FolderKanban} tone="accent" />
        <SummaryCard label="Today's Report" value={todaysReport ? todaysReport.status : "Not sent"} icon={FileText} tone={todaysReport ? "success" : "warning"} />
        <SummaryCard label="Pending Reviews" value={pending} icon={Clock} tone="warning" />
        <SummaryCard label="Logged Hours" value={totalHours.toFixed(1)} icon={Timer} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Assigned projects</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {myProjects.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0"><p className="truncate text-sm font-medium">{p.name}</p><p className="text-xs text-muted-foreground line-clamp-1">{p.description || "No description"}</p></div>
                <StatusBadge value={p.status} />
              </div>
            ))}
            {myProjects.length === 0 && <p className="text-sm text-muted-foreground">No projects assigned yet.</p>}
          </CardContent></Card>
        <Card><CardHeader><CardTitle>Recent reports</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {myReports.slice(0, 6).map((r) => {
              const project = projects.find((p) => p.id === r.projectId);
              return (
                <Link key={r.id} to="/employee/reports/$id" params={{ id: r.id }} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50">
                  <div><p className="text-sm font-medium">{formatDate(r.date)}</p><p className="text-xs text-muted-foreground line-clamp-1">{project?.name} - {r.completed}</p></div>
                  <StatusBadge value={r.status} />
                </Link>
              );
            })}
            {myReports.length === 0 && <p className="text-sm text-muted-foreground">No reports submitted yet.</p>}
          </CardContent></Card>
      </div>
    </div>
  );
}
