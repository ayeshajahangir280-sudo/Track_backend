import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, MoreHorizontal, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { UserAvatar } from "@/components/UserAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useStore, type User } from "@/lib/mock-store";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/employees")({
  component: EmployeesPage,
});

function EmployeesPage() {
  const { users, projects, tasks, addUser, updateUser, logAudit } = useStore();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const employees = users.filter((u) => u.role === "employee");
  const filtered = employees.filter((e) =>
    [e.name, e.email, e.jobTitle, e.department].filter(Boolean).some((s) => s!.toLowerCase().includes(search.toLowerCase())),
  );

  const openAdd = () => { setEditing(null); setOpen(true); };
  const openEdit = (u: User) => { setEditing(u); setOpen(true); };

  const save = (data: Omit<User, "id" | "role" | "status"> & { status?: User["status"] }) => {
    if (editing) {
      updateUser(editing.id, data);
      logAudit({ user: "Sarah Mitchell", action: "Updated employee", target: data.name, type: "update" });
      toast.success("Employee updated");
    } else {
      addUser({ ...data, role: "employee", status: data.status ?? "active" });
      logAudit({ user: "Sarah Mitchell", action: "Created employee", target: data.name, type: "create" });
      toast.success("Employee added");
    }
    setOpen(false);
  };

  const toggleStatus = (u: User) => {
    const next = u.status === "active" ? "inactive" : "active";
    updateUser(u.id, { status: next });
    logAudit({ user: "Sarah Mitchell", action: next === "active" ? "Activated employee" : "Deactivated employee", target: u.name, type: "update" });
    toast.success(`${u.name} is now ${next}`);
    setConfirmId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Manage employee accounts, roles and access."
        actions={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Employee</Button>}
      />

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-3 border-b p-4">
            <div className="relative flex-1 min-w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search employees" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <span className="text-sm text-muted-foreground">{filtered.length} of {employees.length}</span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-6"><EmptyState icon={Users} title="No employees" description="Try a different search or add a new employee." /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Job title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Projects</TableHead>
                    <TableHead className="text-center">Pending tasks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const empProjects = projects.filter((p) => p.assignees.includes(u.id)).length;
                    const empPending = tasks.filter((t) => t.assigneeId === u.id && t.status !== "Completed").length;
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <UserAvatar name={u.name} />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{u.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{u.jobTitle ?? "—"}</TableCell>
                        <TableCell>{u.department ?? "—"}</TableCell>
                        <TableCell className="text-center">{empProjects}</TableCell>
                        <TableCell className="text-center">{empPending}</TableCell>
                        <TableCell><StatusBadge value={u.status} /></TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(u)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast.info(`Viewing ${u.name}'s profile`)}>View Profile</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast.success("Password reset email sent (demo)")}>Reset Password</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setConfirmId(u.id)}>
                                {u.status === "active" ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <EmployeeDialog open={open} onClose={() => setOpen(false)} editing={editing} onSave={save} />

      <AlertDialog open={confirmId !== null} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change account status</AlertDialogTitle>
            <AlertDialogDescription>
              This will toggle the account's active status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const u = employees.find((x) => x.id === confirmId); if (u) toggleStatus(u); }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmployeeDialog({
  open, onClose, editing, onSave,
}: {
  open: boolean;
  onClose: () => void;
  editing: User | null;
  onSave: (data: Omit<User, "id" | "role" | "status"> & { status?: User["status"] }) => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [phone, setPhone] = useState(editing?.phone ?? "");
  const [jobTitle, setJobTitle] = useState(editing?.jobTitle ?? "");
  const [department, setDepartment] = useState(editing?.department ?? "");

  // reset when opening
  const dialogKey = editing?.id ?? "new";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} key={dialogKey}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit employee" : "Add employee"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555…" />
          </div>
          <div className="space-y-2">
            <Label>Job title</Label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Product Designer" />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Design" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (!name || !email) { toast.error("Name and email are required"); return; }
              onSave({ name, email, phone, jobTitle, department });
            }}
          >
            {editing ? "Save changes" : "Add employee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}