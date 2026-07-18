import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime, useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/employee/reports/$id")({
  component: MyReportDetail,
  notFoundComponent: () => <div className="p-6"><p className="text-sm text-muted-foreground">Report not found.</p></div>,
  errorComponent: () => <div className="p-6"><p className="text-sm text-destructive">Something went wrong.</p></div>,
});

function MyReportDetail() {
  const { id } = Route.useParams();
  const { reports, projects } = useStore();
  const r = reports.find((x) => x.id === id);
  if (!r) throw notFound();
  const project = projects.find((p) => p.id === r.projectId);
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2"><Link to="/employee/reports"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link></Button>
      <PageHeader title={formatDate(r.date)} description={project?.name} actions={<StatusBadge value={r.status} />} />
      <Card><CardContent className="space-y-4 p-6 text-sm">
        <div><p className="text-xs uppercase text-muted-foreground">Completed</p><p>{r.completed}</p></div>
        <div><p className="text-xs uppercase text-muted-foreground">In progress</p><p>{r.inProgress}</p></div>
        <div><p className="text-xs uppercase text-muted-foreground">Blockers</p><p>{r.blockers}</p></div>
        <div><p className="text-xs uppercase text-muted-foreground">Next plans</p><p>{r.nextPlans}</p></div>
        <div><p className="text-xs uppercase text-muted-foreground">Time spent</p><p>{r.timeSpent}h</p></div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Admin comments</CardTitle></CardHeader><CardContent className="space-y-3">
        {r.comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
        {r.comments.map((c) => (
          <div key={c.id} className="flex gap-3 rounded-lg border p-3">
            <UserAvatar name={c.authorName} />
            <div className="flex-1"><div className="flex items-center gap-2 text-sm"><span className="font-medium">{c.authorName}</span><StatusBadge value={c.type} className="text-[10px]" /><span className="ml-auto text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</span></div><p className="mt-1 text-sm">{c.text}</p></div>
          </div>
        ))}
      </CardContent></Card>
    </div>
  );
}