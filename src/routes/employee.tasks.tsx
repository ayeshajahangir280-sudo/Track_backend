import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatDate, useStore, type TaskStatus } from "@/lib/mock-store";
import { toast } from "sonner";

export const Route = createFileRoute("/employee/tasks")({ component: MyTasks });

const STATUSES: TaskStatus[] = ["Not Started", "In Progress", "Waiting for Review", "Changes Required", "Completed"];

function MyTasks() {
  const { currentUser, tasks, projects, updateTask, logAudit } = useStore();
  const [filter, setFilter] = useState("all");
  const list = tasks.filter((t) => t.assigneeId === currentUser?.id && (filter === "all" || t.status === filter));
  return (
    <div className="space-y-6">
      <PageHeader title="My tasks" description="Everything assigned to you." actions={
        <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      } />
      <div className="grid gap-3">
        {list.map((t) => {
          const p = projects.find((x) => x.id === t.projectId);
          return (
            <Card key={t.id}><CardContent className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><p className="font-medium">{t.title}</p><StatusBadge value={t.priority} className="text-[10px]" /></div>
                <p className="text-sm text-muted-foreground">{p?.name} · Due {formatDate(t.dueDate)}</p>
                {t.instructions && <p className="mt-1 text-xs text-muted-foreground">Instructions: {t.instructions}</p>}
              </div>
              <Select value={t.status} onValueChange={(v) => { updateTask(t.id, { status: v as TaskStatus }); logAudit({ user: currentUser?.name ?? "", action: "Updated task status", target: `${t.title} → ${v}`, type: "update" }); toast.success("Task updated"); }}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Button asChild variant="outline" size="sm"><Link to="/employee/report">Report on this</Link></Button>
            </CardContent></Card>
          );
        })}
      </div>
    </div>
  );
}