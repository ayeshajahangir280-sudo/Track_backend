import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, MoreHorizontal, FolderKanban, Archive, Eye, Pencil } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDate, useStore, type Project } from "@/lib/mock-store";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/projects")({
  component: ProjectsPage,
});

function ProjectsPage() {
  const { projects, users, addProject, updateProject, archiveProject, logAudit } = useStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  const employees = users.filter((u) => u.role === "employee");

  const filtered = projects.filter((p) => {
    const matchSearch = [p.name, p.client, p.description].some((s) => s.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openAdd = () => { setEditing(null); setOpen(true); };
  const openEdit = (p: Project) => { setEditing(p); setOpen(true); };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Track all client and internal projects."
        actions={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Create Project</Button>}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search projects" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["Planning", "Active", "On Hold", "Completed", "Cancelled"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects" description="Create your first project to get started." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-4 p-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{p.client}</p>
                    <Link to="/admin/projects/$id" params={{ id: p.id }} className="mt-0.5 block truncate text-base font-semibold hover:underline">
                      {p.name}
                    </Link>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild><Link to="/admin/projects/$id" params={{ id: p.id }}><Eye className="mr-2 h-4 w-4" /> View</Link></DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(p)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => { archiveProject(p.id); logAudit({ user: "Sarah Mitchell", action: "Archived project", target: p.name, type: "update" }); toast.success("Project archived"); }}>
                        <Archive className="mr-2 h-4 w-4" /> Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={p.status} />
                  <StatusBadge value={p.priority} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span><span>{p.progress}%</span>
                  </div>
                  <Progress value={p.progress} className="h-2" />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Deadline: {formatDate(p.deadline)}</span>
                </div>
                <div className="flex -space-x-2">
                  {p.assignees.map((id) => {
                    const u = users.find((x) => x.id === id);
                    return u ? <UserAvatar key={id} name={u.name} className="h-7 w-7 border-2 border-background" /> : null;
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProjectDialog
        key={editing?.id ?? "new"}
        open={open}
        onClose={() => setOpen(false)}
        editing={editing}
        employees={employees}
        onSave={(data) => {
          if (editing) {
            updateProject(editing.id, data);
            logAudit({ user: "Sarah Mitchell", action: "Updated project", target: data.name, type: "update" });
            toast.success("Project updated");
          } else {
            addProject(data);
            logAudit({ user: "Sarah Mitchell", action: "Created project", target: data.name, type: "create" });
            toast.success("Project created");
          }
          setOpen(false);
        }}
      />
    </div>
  );
}

function ProjectDialog({
  open, onClose, editing, employees, onSave,
}: {
  open: boolean;
  onClose: () => void;
  editing: Project | null;
  employees: { id: string; name: string }[];
  onSave: (data: Omit<Project, "id" | "progress">) => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [client, setClient] = useState(editing?.client ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [startDate, setStartDate] = useState(editing?.startDate ?? new Date().toISOString().slice(0, 10));
  const [deadline, setDeadline] = useState(editing?.deadline ?? new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState<Project["priority"]>(editing?.priority ?? "Medium");
  const [status, setStatus] = useState<Project["status"]>(editing?.status ?? "Planning");
  const [assignees, setAssignees] = useState<string[]>(editing?.assignees ?? []);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Edit project" : "Create project"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Project name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Client</Label>
            <Input value={client} onChange={(e) => setClient(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Project["priority"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Low", "Medium", "High", "Urgent"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Start date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Deadline</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Project["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Planning", "Active", "On Hold", "Completed", "Cancelled"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Assign employees</Label>
            <div className="flex flex-wrap gap-2">
              {employees.map((e) => {
                const active = assignees.includes(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setAssignees((a) => active ? a.filter((x) => x !== e.id) : [...a, e.id])}
                    className={`rounded-full border px-3 py-1 text-xs transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
                  >
                    {e.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => {
            if (!name || !client) { toast.error("Name and client are required"); return; }
            onSave({ name, client, description, startDate, deadline, priority, status, assignees });
          }}>{editing ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}