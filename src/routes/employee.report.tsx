import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/mock-store";
import { toast } from "sonner";

export const Route = createFileRoute("/employee/report")({ component: ReportForm });

function ReportForm() {
  const { currentUser, tasks, projects, addReport, logAudit } = useStore();
  const navigate = useNavigate();
  const myTasks = tasks.filter((t) => t.assigneeId === currentUser?.id);
  const [taskId, setTaskId] = useState(myTasks[0]?.id ?? "");
  const task = myTasks.find((t) => t.id === taskId);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [completed, setCompleted] = useState("");
  const [inProgress, setInProgress] = useState("");
  const [blockers, setBlockers] = useState("");
  const [nextPlans, setNextPlans] = useState("");
  const [timeSpent, setTimeSpent] = useState(8);
  const [notes, setNotes] = useState("");
  const submit = (status: "Draft" | "Submitted") => {
    if (!task || !currentUser) return;
    if (status === "Submitted" && (!completed || !nextPlans)) { toast.error("Fill required fields"); return; }
    addReport({ employeeId: currentUser.id, date, projectId: task.projectId, taskId: task.id, completed, inProgress, blockers, nextPlans, timeSpent, notes, status });
    logAudit({ user: currentUser.name, action: status === "Draft" ? "Saved draft report" : "Submitted report", target: `for ${task.title}`, type: "create" });
    toast.success(status === "Draft" ? "Draft saved" : "Report submitted");
    navigate({ to: "/employee/reports" });
  };
  return (
    <div className="space-y-6">
      <PageHeader title="Daily report" description="Log today's work and share it with your manager." />
      <Card><CardContent className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Task</Label>
            <Select value={taskId} onValueChange={setTaskId}>
              <SelectTrigger><SelectValue placeholder="Choose task" /></SelectTrigger>
              <SelectContent>{myTasks.map((t) => { const p = projects.find((x) => x.id === t.projectId); return <SelectItem key={t.id} value={t.id}>{p?.name} — {t.title}</SelectItem>; })}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2"><Label>Work completed today *</Label><Textarea rows={3} value={completed} onChange={(e) => setCompleted(e.target.value)} /></div>
        <div className="space-y-2"><Label>Work in progress</Label><Textarea rows={2} value={inProgress} onChange={(e) => setInProgress(e.target.value)} /></div>
        <div className="space-y-2"><Label>Problems or blockers</Label><Textarea rows={2} value={blockers} onChange={(e) => setBlockers(e.target.value)} /></div>
        <div className="space-y-2"><Label>Plans for next working day *</Label><Textarea rows={2} value={nextPlans} onChange={(e) => setNextPlans(e.target.value)} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Time spent (hours)</Label><Input type="number" step="0.5" value={timeSpent} onChange={(e) => setTimeSpent(Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => submit("Draft")}>Save draft</Button>
          <Button onClick={() => submit("Submitted")}>Submit report</Button>
        </div>
      </CardContent></Card>
    </div>
  );
}