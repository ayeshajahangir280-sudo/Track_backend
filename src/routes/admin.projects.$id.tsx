import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Calendar, Users as UsersIcon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { UserAvatar } from "@/components/UserAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatDateTime, useStore } from "@/lib/api-store";

export const Route = createFileRoute("/admin/projects/$id")({
  component: ProjectDetails,
  notFoundComponent: () => (
    <div className="p-6"><p className="text-sm text-muted-foreground">Project not found.</p></div>
  ),
  errorComponent: () => (
    <div className="p-6"><p className="text-sm text-destructive">Something went wrong loading this project.</p></div>
  ),
});

function ProjectDetails() {
  const { id } = Route.useParams();
  const { projects, users, reports, audit } = useStore();
  const project = projects.find((p) => p.id === id);
  if (!project) throw notFound();

  const team = users.filter((u) => project.assignees.includes(u.id));
  const projectReports = reports.filter((r) => r.projectId === project.id);

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
          <Link to="/admin/projects"><ArrowLeft className="mr-2 h-4 w-4" /> Back to projects</Link>
        </Button>
        <PageHeader
          title={project.name}
          description={project.description || "No description provided."}
          actions={<div className="flex gap-2"><StatusBadge value={project.status} /><StatusBadge value={project.priority} /></div>}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Progress</p><p className="font-medium">{project.progress}%</p></div>
            </div>
            <Progress value={project.progress} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UsersIcon className="h-4 w-4" /> Team</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {team.map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <UserAvatar name={u.name} />
                <div><p className="text-sm font-medium">{u.name}</p><p className="text-xs text-muted-foreground">@{u.username}</p></div>
              </div>
            ))}
            {team.length === 0 && <p className="text-sm text-muted-foreground">No members assigned.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Daily reports</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {projectReports.slice(0, 8).map((r) => {
            const emp = users.find((u) => u.id === r.employeeId);
            return (
              <Link key={r.id} to="/admin/reports/$id" params={{ id: r.id }} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50">
                <UserAvatar name={emp?.name ?? "?"} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{emp?.name}</p><p className="text-xs text-muted-foreground">{formatDate(r.date)} - {r.timeSpent}h</p></div>
                <StatusBadge value={r.status} />
              </Link>
            );
          })}
          {projectReports.length === 0 && <p className="text-sm text-muted-foreground">No reports yet.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Activity timeline</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {audit.slice(0, 8).map((a) => (
            <div key={a.id} className="flex items-start gap-3 text-sm">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
              <div><p><span className="font-medium">{a.user}</span> {a.action.toLowerCase()} - {a.target}</p><p className="text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</p></div>
            </div>
          ))}
          {audit.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
