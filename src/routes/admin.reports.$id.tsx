import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatDateTime, useStore, type Comment } from "@/lib/mock-store";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reports/$id")({
  component: ReportDetails,
  notFoundComponent: () => <div className="p-6"><p className="text-sm text-muted-foreground">Report not found.</p></div>,
  errorComponent: () => <div className="p-6"><p className="text-sm text-destructive">Something went wrong.</p></div>,
});

function ReportDetails() {
  const { id } = Route.useParams();
  const { reports, users, projects, tasks, addComment, updateReport, updateTask, logAudit } = useStore();
  const report = reports.find((r) => r.id === id);
  if (!report) throw notFound();
  const employee = users.find((u) => u.id === report.employeeId);
  const project = projects.find((p) => p.id === report.projectId);
  const task = tasks.find((t) => t.id === report.taskId);

  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [type, setType] = useState<Comment["type"]>("Feedback");

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2"><Link to="/admin/reports"><ArrowLeft className="mr-2 h-4 w-4" /> Back to reports</Link></Button>
        <PageHeader title={`Report — ${employee?.name}`} description={`${project?.name} · ${formatDate(report.date)}`} actions={<StatusBadge value={report.status} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Report details</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Section label="Task">{task?.title ?? "—"}</Section>
            <Section label="Work completed today">{report.completed}</Section>
            <Section label="Work in progress">{report.inProgress}</Section>
            <Section label="Problems or blockers">{report.blockers}</Section>
            <Section label="Plans for next working day">{report.nextPlans}</Section>
            <Section label="Time spent">{report.timeSpent}h</Section>
            {report.notes ? <Section label="Notes">{report.notes}</Section> : null}
            <Section label="Attachments"><p className="text-muted-foreground">No attachments</p></Section>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" onClick={() => setOpen(true)}>Add comment</Button>
            <Button variant="outline" className="w-full" onClick={() => { updateReport(report.id, { status: "Changes Required" }); logAudit({ user: "Sarah Mitchell", action: "Requested changes", target: `Report ${report.id}`, type: "review" }); toast.success("Changes requested"); }}>Request changes</Button>
            <Button variant="outline" className="w-full" onClick={() => { updateReport(report.id, { status: "Reviewed" }); logAudit({ user: "Sarah Mitchell", action: "Reviewed report", target: `Report ${report.id}`, type: "review" }); toast.success("Marked reviewed"); }}>Mark reviewed</Button>
            <Button variant="outline" className="w-full" onClick={() => { updateReport(report.id, { status: "Approved" }); toast.success("Report approved"); }}>Approve report</Button>
            {task ? (
              <Button variant="outline" className="w-full" onClick={() => { updateTask(task.id, { status: "Completed" }); toast.success("Task marked completed"); }}>Mark task completed</Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Admin comments</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {report.comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
          {report.comments.map((c) => (
            <div key={c.id} className="flex gap-3 rounded-lg border p-3">
              <UserAvatar name={c.authorName} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{c.authorName}</span>
                  <StatusBadge value={c.type} className="text-[10px]" />
                  <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm">{c.text}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add comment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2"><Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Comment["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Feedback", "Instruction", "Changes Required", "Approval"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Comment</Label><Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!text) { toast.error("Comment required"); return; }
              addComment(report.id, { authorId: "u-admin", authorName: "Sarah Mitchell", text, type });
              setText(""); setOpen(false); toast.success("Comment added");
            }}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}