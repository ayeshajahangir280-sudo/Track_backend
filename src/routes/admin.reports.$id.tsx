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
import { formatDate, formatDateTime, useStore, type Comment } from "@/lib/api-store";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reports/$id")({
  component: ReportDetails,
  notFoundComponent: () => <div className="p-6"><p className="text-sm text-muted-foreground">Report not found.</p></div>,
  errorComponent: () => <div className="p-6"><p className="text-sm text-destructive">Something went wrong.</p></div>,
});

function ReportDetails() {
  const { id } = Route.useParams();
  const { currentUser, reports, users, projects, addComment, updateReport, logAudit } = useStore();
  const report = reports.find((r) => r.id === id);
  if (!report) throw notFound();
  const employee = users.find((u) => u.id === report.employeeId);
  const project = projects.find((p) => p.id === report.projectId);

  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [type, setType] = useState<Comment["type"]>("Feedback");

  const setStatus = (status: "Changes Required" | "Reviewed" | "Approved") => {
    updateReport(report.id, { status });
    logAudit({ user: currentUser?.name ?? "Admin", action: `Marked report ${status.toLowerCase()}`, target: `Report ${report.id}`, type: "review" });
    toast.success(`Report marked ${status.toLowerCase()}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2"><Link to="/admin/reports"><ArrowLeft className="mr-2 h-4 w-4" /> Back to reports</Link></Button>
        <PageHeader title={`Report - ${employee?.name ?? "Employee"}`} description={`${project?.name ?? "Project"} - ${formatDate(report.date)}`} actions={<StatusBadge value={report.status} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Report details</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Section label="Employee">{employee?.name ?? "Employee"}</Section>
            <Section label="Project">{project?.name ?? "Project"}</Section>
            <Section label="Date">{formatDate(report.date)}</Section>
            <Section label="Description">{report.completed}</Section>
            <Section label="Time spent">{report.timeSpent}h</Section>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" onClick={() => setOpen(true)}>Add comment</Button>
            <Button variant="outline" className="w-full" onClick={() => setStatus("Changes Required")}>Request changes</Button>
            <Button variant="outline" className="w-full" onClick={() => setStatus("Reviewed")}>Mark reviewed</Button>
            <Button variant="outline" className="w-full" onClick={() => setStatus("Approved")}>Approve report</Button>
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
              addComment(report.id, { authorId: currentUser?.id ?? "", authorName: currentUser?.name ?? "Admin", text, type });
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
