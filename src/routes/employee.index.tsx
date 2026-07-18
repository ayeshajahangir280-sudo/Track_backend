import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ClipboardList, Clock, FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { SummaryCard } from "@/components/SummaryCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/employee/")({ component: EmployeeDashboard });

function EmployeeDashboard() {
  const { currentUser, tasks, reports, projects } = useStore();
  if (!currentUser) return null;
  const myTasks = tasks.filter((t) => t.assigneeId === currentUser.id);
  const myReports = reports.filter((r) => r.employeeId === currentUser.id);
  const active = myTasks.filter((t) => t.status !== "Completed").length;
  const completed = myTasks.filter((t) => t.status === "Completed").length;
  const pending = myReports.filter((r) => ["Submitted", "Under Review", "Changes Required"].includes(r.status)).length;
  const today = new Date().toISOString().slice(0, 10);
  const submittedToday = myReports.some((r) => r.date === today);
  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${currentUser.name.split(" ")[0]}`} description="Here's what's on your plate today." actions={
        <Button asChild><Link to="/employee/report">{submittedToday ? "Update today's report" : "Submit today's report"}</Link></Button>
      } />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Active tasks" value={active} icon={ClipboardList} tone="info" />
        <SummaryCard label="Completed" value={completed} icon={CheckCircle2} tone="success" />
        <SummaryCard label="Pending reviews" value={pending} icon={Clock} tone="warning" />
        <SummaryCard label="Total reports" value={myReports.length} icon={FileText} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>My tasks</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {myTasks.slice(0, 6).map((t) => {
              const p = projects.find((x) => x.id === t.projectId);
              return (
                <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{t.title}</p><p className="text-xs text-muted-foreground">{p?.name} · Due {formatDate(t.dueDate)}</p></div>
                  <StatusBadge value={t.status} />
                </div>
              );
            })}
          </CardContent></Card>
        <Card><CardHeader><CardTitle>Recent reports</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {myReports.slice(0, 6).map((r) => (
              <Link key={r.id} to="/employee/reports/$id" params={{ id: r.id }} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50">
                <div><p className="text-sm font-medium">{formatDate(r.date)}</p><p className="text-xs text-muted-foreground line-clamp-1">{r.completed}</p></div>
                <StatusBadge value={r.status} />
              </Link>
            ))}
          </CardContent></Card>
      </div>
    </div>
  );
}