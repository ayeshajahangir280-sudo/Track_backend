import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate, useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/employee/projects")({ component: MyProjects });

function MyProjects() {
  const { currentUser, projects } = useStore();
  const mine = projects.filter((p) => p.assignees.includes(currentUser?.id ?? ""));
  return (
    <div className="space-y-6">
      <PageHeader title="My projects" description="Projects you're contributing to." />
      <div className="grid gap-4 md:grid-cols-2">
        {mine.map((p) => (
          <Card key={p.id}>
            <CardHeader><div className="flex items-start justify-between gap-3"><CardTitle className="text-base">{p.name}</CardTitle><StatusBadge value={p.status} /></div><p className="text-sm text-muted-foreground">{p.client}</p></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
              <div className="flex justify-between text-xs text-muted-foreground"><span>Progress</span><span>{p.progress}%</span></div>
              <Progress value={p.progress} className="h-2" />
              <p className="text-xs text-muted-foreground">Deadline {formatDate(p.deadline)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}