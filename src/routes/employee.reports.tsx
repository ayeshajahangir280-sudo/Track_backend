import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, useStore } from "@/lib/api-store";

export const Route = createFileRoute("/employee/reports")({ component: MyReports });

function MyReports() {
  const { currentUser, reports, projects } = useStore();
  const list = reports.filter((r) => r.employeeId === currentUser?.id);
  return (
    <div className="space-y-6">
      <PageHeader title="My reports" description="Your submitted daily reports." actions={<Button asChild><Link to="/employee/report">New report</Link></Button>} />
      <div className="grid gap-3">
        {list.map((r) => {
          const p = projects.find((x) => x.id === r.projectId);
          return (
            <Link key={r.id} to="/employee/reports/$id" params={{ id: r.id }}>
              <Card className="transition hover:border-accent"><CardContent className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1"><p className="font-medium">{formatDate(r.date)} - {p?.name}</p><p className="text-sm text-muted-foreground line-clamp-1">{r.completed}</p></div>
                <span className="text-sm text-muted-foreground">{r.timeSpent}h</span>
                <StatusBadge value={r.status} />
              </CardContent></Card>
            </Link>
          );
        })}
        {list.length === 0 && <p className="text-sm text-muted-foreground">No reports submitted yet.</p>}
      </div>
    </div>
  );
}
