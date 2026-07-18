import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, useStore, type Task, type TaskStatus } from "@/lib/mock-store";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/tasks")({ component: TasksPage });

const TASK_STATUSES: TaskStatus[] = ["Not Started", "In Progress", "Waiting for Review", "Changes Required", "Completed"];

function TasksPage() {
  const { tasks, users, projects, addTask, updateTask, logAudit } = useStore();
  const employees = users.filter((u) => u.role === "employee");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const filtered = tasks.filter((t) => {
    const s = t.title.toLowerCase().includes(search.toLowerCase());
    const st = status === "all" || t.status === status;
    return s && st;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Assign, prioritise and track all team tasks."
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Create task</Button>}
      />

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-3 border-b p-4">
            <div className="relative flex-1 min-w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search tasks" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {filtered.length === 0 ? (
            <div className="p-6"><EmptyState icon={ListChecks} title="No tasks" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => {
                    const assignee = users.find((u) => u.id === t.assigneeId);
                    const project = projects.find((p) => p.id === t.projectId);
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <p className="font-medium">{t.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                        </TableCell>
                        <TableCell>{project?.name ?? "—"}</TableCell>
                        <TableCell>{assignee?.name ?? "—"}</TableCell>
                        <TableCell>{formatDate(t.dueDate)}</TableCell>
                        <TableCell><StatusBadge value={t.priority} /></TableCell>
                        <TableCell>
                          <Select
                            value={t.status}
                            onValueChange={(v) => {
                              updateTask(t.id, { status: v as TaskStatus });
                              logAudit({ user: "Sarah Mitchell", action: "Updated task status", target: `${t.title} → ${v}`, type: "update" });
                              toast.success("Task updated");
                            }}
                          >
                            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                            <SelectContent>{TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => { setEditing(t); setOpen(true); }}>Edit</Button>
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

      <TaskDialog
        key={editing?.id ?? "new"}
        open={open}
        editing={editing}
        employees={employees}
        projects={projects}
        onClose={() => setOpen(false)}
        onSave={(data) => {
          if (editing) { updateTask(editing.id, data); toast.success("Task updated"); }
          else { addTask({ ...data, status: "Not Started" }); toast.success("Task created"); }
          setOpen(false);
        }}
      />
    </div>
  );
}

function TaskDialog({
  open, onClose, editing, employees, projects, onSave,
}: {
  open: boolean; onClose: () => void; editing: Task | null;
  employees: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  onSave: (data: Omit<Task, "id">) => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [projectId, setProjectId] = useState(editing?.projectId ?? projects[0]?.id ?? "");
  const [assigneeId, setAssigneeId] = useState(editing?.assigneeId ?? employees[0]?.id ?? "");
  const [dueDate, setDueDate] = useState(editing?.dueDate ?? new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState<Task["priority"]>(editing?.priority ?? "Medium");
  const [instructions, setInstructions] = useState(editing?.instructions ?? "");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Edit task" : "Create task"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="space-y-2"><Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Assignee</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Task["priority"])}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Low", "Medium", "High", "Urgent"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2 sm:col-span-2"><Label>Admin instructions</Label><Textarea rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => {
            if (!title) { toast.error("Title is required"); return; }
            onSave({
              title, description, projectId, assigneeId, dueDate, priority,
              instructions, status: editing?.status ?? "Not Started",
              assignedDate: editing?.assignedDate ?? new Date().toISOString().slice(0, 10),
            });
          }}>{editing ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}