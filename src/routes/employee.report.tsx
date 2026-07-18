import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/api-store";
import { toast } from "sonner";

export const Route = createFileRoute("/employee/report")({ component: ReportForm });

function ReportForm() {
  const { currentUser, projects, reports, addReport, updateReport, logAudit } = useStore();
  const navigate = useNavigate();
  const myProjects = useMemo(
    () => projects.filter((p) => p.assignees.includes(currentUser?.id ?? "")),
    [projects, currentUser?.id],
  );
  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [completed, setCompleted] = useState("");
  const [timeSpent, setTimeSpent] = useState(8);
  const existingReport = useMemo(
    () => reports.find((r) => r.employeeId === currentUser?.id && r.date === date),
    [reports, currentUser?.id, date],
  );

  useEffect(() => {
    if (existingReport) {
      setProjectId(existingReport.projectId);
      setCompleted(existingReport.completed);
      setTimeSpent(existingReport.timeSpent);
    } else if (!projectId && myProjects[0]) {
      setProjectId(myProjects[0].id);
    }
  }, [existingReport, myProjects, projectId]);

  const submit = async () => {
    if (!currentUser) return;
    if (!projectId) { toast.error("Choose a project"); return; }
    if (!date || !completed.trim()) { toast.error("Date and description are required"); return; }
    if (timeSpent < 0) { toast.error("Time spent must be zero or greater"); return; }

    const payload = {
      employeeId: currentUser.id,
      date,
      projectId,
      completed,
      timeSpent,
      status: "Submitted" as const,
    };
    if (existingReport) await updateReport(existingReport.id, payload);
    else await addReport(payload);

    const project = projects.find((p) => p.id === projectId);
    logAudit({ user: currentUser.name, action: existingReport ? "Updated daily report" : "Submitted daily report", target: project?.name ?? "Daily report", type: "create" });
    toast.success(existingReport ? "Report updated" : "Report submitted");
    navigate({ to: "/employee/reports" });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Daily report" description="Share today's work with your admin." />
      <Card><CardContent className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Choose project" /></SelectTrigger>
              <SelectContent>{myProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea rows={5} value={completed} onChange={(e) => setCompleted(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Time spent (hours)</Label>
          <Input type="number" min="0" step="0.5" value={timeSpent} onChange={(e) => setTimeSpent(Number(e.target.value))} />
        </div>
        {myProjects.length === 0 && <p className="text-sm text-muted-foreground">No projects assigned yet.</p>}
        <div className="flex justify-end pt-2">
          <Button onClick={submit} disabled={myProjects.length === 0}>{existingReport ? "Update report" : "Submit report"}</Button>
        </div>
      </CardContent></Card>
    </div>
  );
}
