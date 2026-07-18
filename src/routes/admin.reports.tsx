import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, MessageSquare, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { UserAvatar } from "@/components/UserAvatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { downloadReportsExport, formatDate, useStore, type Comment, type Report, type ReportStatus } from "@/lib/api-store";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reports")({ component: ReportsPage });

function ReportsPage() {
  const { currentUser, reports, users, projects, addComment, updateReport } = useStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [emp, setEmp] = useState("all");
  const [date, setDate] = useState("");
  const [commentReport, setCommentReport] = useState<Report | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentType, setCommentType] = useState<Comment["type"]>("Feedback");
  const reviewStatuses: ReportStatus[] = ["Submitted", "Under Review", "Changes Required", "Reviewed", "Approved"];

  const filtered = reports.filter((r) => {
    const employee = users.find((u) => u.id === r.employeeId);
    const project = projects.find((p) => p.id === r.projectId);
    const s = [employee?.name, project?.name, r.completed].some((x) => x?.toLowerCase().includes(search.toLowerCase()));
    const st = status === "all" || r.status === status;
    const e = emp === "all" || r.employeeId === emp;
    const d = !date || r.date === date;
    return s && st && e && d;
  });

  const exportCsv = () => {
    downloadReportsExport("csv")
      .then(() => toast.success("Exported CSV"))
      .catch((error) => toast.error(error instanceof Error ? error.message : "Export failed"));
  };

  const saveComment = async () => {
    if (!commentReport) return;
    if (!commentText.trim()) { toast.error("Comment required"); return; }
    await addComment(commentReport.id, {
      authorId: currentUser?.id ?? "",
      authorName: currentUser?.name ?? "Admin",
      text: commentText,
      type: commentType,
    });
    setCommentText("");
    setCommentType("Feedback");
    setCommentReport(null);
    toast.success("Comment added");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Daily Reports" description="Review and comment on employee reports." actions={
        <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
      } />
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-3 border-b p-4">
            <div className="relative flex-1 min-w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search reports" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={emp} onValueChange={setEmp}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Employee" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {users.filter((u) => u.role === "employee").map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {["Submitted", "Under Review", "Changes Required", "Reviewed", "Approved"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {filtered.length === 0 ? (
            <div className="p-6"><EmptyState icon={FileText} title="No reports" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const emp = users.find((u) => u.id === r.employeeId);
                    const project = projects.find((p) => p.id === r.projectId);
                    return (
                      <TableRow key={r.id}>
                        <TableCell><div className="flex items-center gap-3"><UserAvatar name={emp?.name ?? "?"} /><span className="font-medium">{emp?.name}</span></div></TableCell>
                        <TableCell>{formatDate(r.date)}</TableCell>
                        <TableCell>{project?.name}</TableCell>
                        <TableCell className="max-w-xs"><p className="truncate text-sm text-muted-foreground">{r.completed}</p></TableCell>
                        <TableCell>{r.timeSpent}h</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <Select
                              value={r.status}
                              onValueChange={(value) => {
                                updateReport(r.id, { status: value as ReportStatus });
                                toast.success("Status updated");
                              }}
                            >
                              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {reviewStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" onClick={() => setCommentReport(r)}>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Comment
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={commentReport !== null} onOpenChange={(open) => !open && setCommentReport(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add comment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={commentType} onValueChange={(value) => setCommentType(value as Comment["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Feedback", "Instruction", "Changes Required", "Approval"].map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Comment</Label>
              <Textarea rows={4} value={commentText} onChange={(event) => setCommentText(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommentReport(null)}>Cancel</Button>
            <Button onClick={saveComment}>Add comment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
