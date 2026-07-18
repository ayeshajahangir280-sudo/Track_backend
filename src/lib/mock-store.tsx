import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Role = "admin" | "employee";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  jobTitle?: string;
  department?: string;
  phone?: string;
  avatar?: string;
  status: "active" | "inactive";
}

export interface Project {
  id: string;
  name: string;
  client: string;
  description: string;
  startDate: string;
  deadline: string;
  assignees: string[]; // user ids
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Planning" | "Active" | "On Hold" | "Completed" | "Cancelled";
  progress: number;
}

export type TaskStatus =
  | "Not Started"
  | "In Progress"
  | "Waiting for Review"
  | "Changes Required"
  | "Completed";

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  assigneeId: string;
  assignedDate: string;
  dueDate: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: TaskStatus;
  instructions?: string;
}

export type ReportStatus =
  | "Draft"
  | "Submitted"
  | "Under Review"
  | "Changes Required"
  | "Reviewed"
  | "Approved";

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
  type: "Feedback" | "Instruction" | "Changes Required" | "Approval";
}

export interface Report {
  id: string;
  employeeId: string;
  date: string;
  projectId: string;
  taskId: string;
  completed: string;
  inProgress: string;
  blockers: string;
  nextPlans: string;
  timeSpent: number;
  notes?: string;
  status: ReportStatus;
  comments: Comment[];
}

export interface Notification {
  id: string;
  userId: string; // recipient (or "admin")
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  type: "task" | "report" | "comment" | "deadline";
}

export interface AuditEntry {
  id: string;
  user: string;
  action: string;
  target: string;
  createdAt: string;
  type: "create" | "update" | "delete" | "review" | "login";
}

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysFromNow = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return iso(d);
};

const seedUsers: User[] = [
  { id: "u-admin", name: "Sarah Mitchell", email: "sarah@acme.co", role: "admin", jobTitle: "Operations Lead", department: "Management", status: "active" },
  { id: "u1", name: "James Carter", email: "james@acme.co", role: "employee", jobTitle: "Senior Developer", department: "Engineering", phone: "+1 555 220 1010", status: "active" },
  { id: "u2", name: "Priya Shah", email: "priya@acme.co", role: "employee", jobTitle: "UI Designer", department: "Design", phone: "+1 555 220 1011", status: "active" },
  { id: "u3", name: "Diego Alvarez", email: "diego@acme.co", role: "employee", jobTitle: "Backend Engineer", department: "Engineering", phone: "+1 555 220 1012", status: "active" },
  { id: "u4", name: "Mei Tanaka", email: "mei@acme.co", role: "employee", jobTitle: "QA Analyst", department: "Quality", phone: "+1 555 220 1013", status: "inactive" },
];

const seedProjects: Project[] = [
  { id: "p1", name: "Orbit CRM Redesign", client: "Northwind Corp", description: "Full redesign of the customer relationship platform including dashboard, pipeline, and reporting.", startDate: daysFromNow(-30), deadline: daysFromNow(24), assignees: ["u1", "u2"], priority: "High", status: "Active", progress: 62 },
  { id: "p2", name: "Atlas Mobile App", client: "Skyline Media", description: "Native iOS and Android build for the flagship content product.", startDate: daysFromNow(-14), deadline: daysFromNow(45), assignees: ["u1", "u3"], priority: "Urgent", status: "Active", progress: 34 },
  { id: "p3", name: "Ledger Analytics", client: "Fintrust", description: "Reporting analytics module with export and scheduling.", startDate: daysFromNow(-8), deadline: daysFromNow(60), assignees: ["u3"], priority: "Medium", status: "Planning", progress: 12 },
  { id: "p4", name: "Helix QA Automation", client: "Internal", description: "End to end test framework rollout.", startDate: daysFromNow(-60), deadline: daysFromNow(-5), assignees: ["u4"], priority: "Low", status: "On Hold", progress: 78 },
];

const seedTasks: Task[] = [
  { id: "t1", title: "Build pipeline board", description: "Kanban with drag and drop for deals.", projectId: "p1", assigneeId: "u1", assignedDate: daysFromNow(-5), dueDate: daysFromNow(3), priority: "High", status: "In Progress", instructions: "Match the new Figma spec exactly." },
  { id: "t2", title: "Redesign login screen", description: "Refresh login and password reset flows.", projectId: "p1", assigneeId: "u2", assignedDate: daysFromNow(-3), dueDate: daysFromNow(2), priority: "Medium", status: "Waiting for Review" },
  { id: "t3", title: "Content API endpoints", description: "Author 12 endpoints for content ingest.", projectId: "p2", assigneeId: "u3", assignedDate: daysFromNow(-6), dueDate: daysFromNow(4), priority: "Urgent", status: "In Progress" },
  { id: "t4", title: "Push notifications", description: "APNs and FCM wiring.", projectId: "p2", assigneeId: "u1", assignedDate: daysFromNow(-2), dueDate: daysFromNow(7), priority: "High", status: "Not Started" },
  { id: "t5", title: "Report scheduling UI", description: "Weekly / monthly schedule modal.", projectId: "p3", assigneeId: "u3", assignedDate: daysFromNow(-1), dueDate: daysFromNow(10), priority: "Medium", status: "Not Started" },
  { id: "t6", title: "Regression suite refresh", description: "Update flaky specs.", projectId: "p4", assigneeId: "u4", assignedDate: daysFromNow(-14), dueDate: daysFromNow(-2), priority: "Low", status: "Changes Required" },
];

const seedReports: Report[] = [
  {
    id: "r1", employeeId: "u1", date: iso(today), projectId: "p1", taskId: "t1",
    completed: "Wired up drag-and-drop for pipeline columns and connected to mock data.",
    inProgress: "Handling optimistic updates and error states.",
    blockers: "Waiting on final column color spec.",
    nextPlans: "Ship first pass of pipeline board and start on card details.",
    timeSpent: 7.5, status: "Submitted", comments: [],
  },
  {
    id: "r2", employeeId: "u2", date: iso(today), projectId: "p1", taskId: "t2",
    completed: "Login screen redesign, dark mode variant, and error states.",
    inProgress: "Password reset flow polish.", blockers: "None.",
    nextPlans: "Handoff to engineering.", timeSpent: 8, status: "Under Review",
    comments: [
      { id: "c1", authorId: "u-admin", authorName: "Sarah Mitchell", text: "Great progress. Please tighten the spacing on the error state.", createdAt: new Date().toISOString(), type: "Feedback" },
    ],
  },
  {
    id: "r3", employeeId: "u3", date: daysFromNow(-1), projectId: "p2", taskId: "t3",
    completed: "Drafted 8 of 12 endpoints and wrote validation schemas.",
    inProgress: "Rate limiter integration.", blockers: "Need staging DB credentials.",
    nextPlans: "Finish remaining 4 endpoints.", timeSpent: 8, status: "Reviewed",
    comments: [
      { id: "c2", authorId: "u-admin", authorName: "Sarah Mitchell", text: "Approved. Please prioritize the ingest endpoint next.", createdAt: new Date().toISOString(), type: "Approval" },
    ],
  },
  {
    id: "r4", employeeId: "u1", date: daysFromNow(-1), projectId: "p2", taskId: "t4",
    completed: "Investigated APNs certificates.", inProgress: "Setting up FCM project.",
    blockers: "Need Apple developer access.", nextPlans: "Send test notifications.",
    timeSpent: 5, status: "Approved", comments: [],
  },
];

const seedNotifications: Notification[] = [
  { id: "n1", userId: "u-admin", title: "New report submitted", message: "James Carter submitted today's report.", createdAt: new Date().toISOString(), read: false, type: "report" },
  { id: "n2", userId: "u-admin", title: "Task updated", message: "Priya Shah moved 'Redesign login screen' to Waiting for Review.", createdAt: new Date(Date.now() - 3600e3).toISOString(), read: false, type: "task" },
  { id: "n3", userId: "u-admin", title: "Deadline approaching", message: "Atlas Mobile App deadline in 5 days.", createdAt: new Date(Date.now() - 7200e3).toISOString(), read: true, type: "deadline" },
  { id: "n4", userId: "u1", title: "New task assigned", message: "You have a new task: Push notifications.", createdAt: new Date().toISOString(), read: false, type: "task" },
  { id: "n5", userId: "u1", title: "Admin comment", message: "Sarah left feedback on your report.", createdAt: new Date(Date.now() - 1800e3).toISOString(), read: false, type: "comment" },
  { id: "n6", userId: "u2", title: "Changes requested", message: "Please review admin feedback on your login screen report.", createdAt: new Date().toISOString(), read: false, type: "comment" },
];

const seedAudit: AuditEntry[] = [
  { id: "a1", user: "Sarah Mitchell", action: "Reviewed report", target: "Report #r3", createdAt: new Date().toISOString(), type: "review" },
  { id: "a2", user: "James Carter", action: "Submitted report", target: "Report #r1", createdAt: new Date().toISOString(), type: "create" },
  { id: "a3", user: "Priya Shah", action: "Updated task status", target: "t2 → Waiting for Review", createdAt: new Date(Date.now() - 1200e3).toISOString(), type: "update" },
  { id: "a4", user: "Sarah Mitchell", action: "Created project", target: "Ledger Analytics", createdAt: new Date(Date.now() - 86400e3).toISOString(), type: "create" },
  { id: "a5", user: "Sarah Mitchell", action: "Deactivated employee", target: "Mei Tanaka", createdAt: new Date(Date.now() - 172800e3).toISOString(), type: "update" },
];

interface StoreState {
  currentUserId: string | null;
  users: User[];
  projects: Project[];
  tasks: Task[];
  reports: Report[];
  notifications: Notification[];
  audit: AuditEntry[];
}

interface StoreContext extends StoreState {
  currentUser: User | null;
  login: (role: Role, userId?: string) => void;
  logout: () => void;
  addUser: (u: Omit<User, "id">) => void;
  updateUser: (id: string, patch: Partial<User>) => void;
  addProject: (p: Omit<Project, "id" | "progress">) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  archiveProject: (id: string) => void;
  addTask: (t: Omit<Task, "id">) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  addReport: (r: Omit<Report, "id" | "comments" | "status"> & { status?: ReportStatus }) => void;
  updateReport: (id: string, patch: Partial<Report>) => void;
  addComment: (reportId: string, c: Omit<Comment, "id" | "createdAt">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  logAudit: (entry: Omit<AuditEntry, "id" | "createdAt">) => void;
}

const Ctx = createContext<StoreContext | null>(null);

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

export function MockStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>({
    currentUserId: null,
    users: seedUsers,
    projects: seedProjects,
    tasks: seedTasks,
    reports: seedReports,
    notifications: seedNotifications,
    audit: seedAudit,
  });

  const value = useMemo<StoreContext>(() => {
    const currentUser = state.users.find((u) => u.id === state.currentUserId) ?? null;
    return {
      ...state,
      currentUser,
      login: (role, userId) => {
        const id = userId ?? (role === "admin" ? "u-admin" : "u1");
        setState((s) => ({ ...s, currentUserId: id }));
      },
      logout: () => setState((s) => ({ ...s, currentUserId: null })),
      addUser: (u) => setState((s) => ({ ...s, users: [...s.users, { ...u, id: uid("u") }] })),
      updateUser: (id, patch) =>
        setState((s) => ({ ...s, users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
      addProject: (p) => setState((s) => ({ ...s, projects: [...s.projects, { ...p, id: uid("p"), progress: 0 }] })),
      updateProject: (id, patch) =>
        setState((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      archiveProject: (id) =>
        setState((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, status: "Cancelled" } : p)) })),
      addTask: (t) => setState((s) => ({ ...s, tasks: [...s.tasks, { ...t, id: uid("t") }] })),
      updateTask: (id, patch) =>
        setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      addReport: (r) =>
        setState((s) => ({
          ...s,
          reports: [
            { ...r, id: uid("r"), status: r.status ?? "Submitted", comments: [] },
            ...s.reports,
          ],
        })),
      updateReport: (id, patch) =>
        setState((s) => ({ ...s, reports: s.reports.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      addComment: (reportId, c) =>
        setState((s) => ({
          ...s,
          reports: s.reports.map((r) =>
            r.id === reportId
              ? { ...r, comments: [...r.comments, { ...c, id: uid("c"), createdAt: new Date().toISOString() }] }
              : r,
          ),
        })),
      markNotificationRead: (id) =>
        setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllNotificationsRead: (userId) =>
        setState((s) => ({
          ...s,
          notifications: s.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)),
        })),
      logAudit: (entry) =>
        setState((s) => ({
          ...s,
          audit: [{ ...entry, id: uid("a"), createdAt: new Date().toISOString() }, ...s.audit],
        })),
    };
  }, [state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used within MockStoreProvider");
  return v;
}

export const initials = (name: string) =>
  name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

export const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
};

export const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
};