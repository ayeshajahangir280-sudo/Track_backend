import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { UserAvatar } from "@/components/UserAvatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, useStore } from "@/lib/mock-store";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reports")({ component: ReportsPage });

function ReportsPage() {
  const { reports, users, projects } = useStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [emp, setEmp] = useState("all");

  const filtered = reports.filter((r) => {
    const employee = users.find((u) => u.id === r.employeeId);
    const project = projects.find((p) => p.id === r.projectId);
    const s = [employee?.name, project?.name, r.completed].some((x) => x?.toLowerCase().includes(search.toLowerCase()));
    const st = status === "all" || r.status === status;
    const e = emp === "all" || r.employeeId === emp;
    return s && st && e;
  });

  const exportCsv = () => {
    const rows = [
      ["Employee", "Date", "Project", "Time", "Status"],
      ...filtered.map((r) => [
        users.find((u) => u.id === r.employeeId)?.name ?? "",
        r.date, projects.find((p) => p.id === r.projectId)?.name ?? "",
        r.timeSpent.toString(), r.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "reports.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported CSV");
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
                  <TableHead className="w-20" />
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
                        <TableCell><StatusBadge value={r.status} /></TableCell>
                        <TableCell><Button asChild variant="ghost" size="sm"><Link to="/admin/reports/$id" params={{ id: r.id }}>Open</Link></Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}