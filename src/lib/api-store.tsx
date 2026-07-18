import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

export type Role = "admin" | "employee";

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: Role;
  jobTitle?: string;
  department?: string;
  phone?: string;
  avatar?: string | null;
  status: "active" | "inactive";
}

type EmployeeCreateInput = {
  username: string;
  password?: string;
  role: Role;
  status: User["status"];
};

export interface Project {
  id: string;
  name: string;
  client?: string;
  description: string;
  startDate?: string;
  deadline?: string;
  assignees: string[];
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Planning" | "Active" | "On Hold" | "Completed" | "Cancelled";
  progress: number;
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
  completed: string;
  timeSpent: number;
  status: ReportStatus;
  comments: Comment[];
}

export interface Notification {
  id: string;
  userId: string;
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

type StoreContext = {
  currentUser: User | null;
  users: User[];
  projects: Project[];
  reports: Report[];
  notifications: Notification[];
  audit: AuditEntry[];
  isLoading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  addUser: (user: EmployeeCreateInput) => Promise<void>;
  updateUser: (id: string, patch: Partial<User>) => Promise<void>;
  resetUserPassword: (id: string) => Promise<string>;
  addProject: (project: Omit<Project, "id" | "progress">) => Promise<void>;
  updateProject: (id: string, patch: Partial<Project>) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  addReport: (report: Omit<Report, "id" | "comments"> & { status?: ReportStatus }) => Promise<void>;
  updateReport: (id: string, patch: Partial<Report>) => Promise<void>;
  addComment: (reportId: string, comment: Omit<Comment, "id" | "createdAt">) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: (userId?: string) => Promise<void>;
  logAudit: (entry: Omit<AuditEntry, "id" | "createdAt">) => void;
};

type ApiUser = {
  id: number | string;
  username: string;
  email: string;
  full_name?: string;
  name?: string;
  role: Role;
  phone_number?: string;
  job_title?: string;
  department?: string;
  profile_image?: string | null;
  is_active?: boolean;
};

type ApiProject = {
  id: number | string;
  name: string;
  client_name?: string;
  description?: string;
  start_date?: string;
  deadline?: string;
  priority: string;
  status: string;
  progress_percentage?: number;
  members?: Array<{ employee?: ApiUser }>;
};

type ApiReport = {
  id: number | string;
  employee: number | string;
  report_date: string;
  project: number | string;
  work_completed: string;
  time_spent_hours: number | string;
  status: string;
  comments?: ApiComment[];
};

type ApiComment = {
  id: number | string;
  author?: number | string | null;
  author_name?: string;
  comment: string;
  comment_type: string;
  created_at: string;
};

type ApiNotification = {
  id: number | string;
  recipient: number | string;
  notification_type: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
};

type ApiAudit = {
  id: number | string;
  user_name?: string;
  user_email?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  description?: string;
  created_at: string;
};

const Ctx = createContext<StoreContext | null>(null);

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8001/api").replace(/\/$/, "");
const ACCESS_KEY = "teamflow_access_token";
const REFRESH_KEY = "teamflow_refresh_token";

let accessToken = "";
let refreshToken = "";

const canUseStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

function loadTokens() {
  if (!canUseStorage()) return;
  accessToken = window.localStorage.getItem(ACCESS_KEY) ?? "";
  refreshToken = window.localStorage.getItem(REFRESH_KEY) ?? "";
}

function saveTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  if (!canUseStorage()) return;
  window.localStorage.setItem(ACCESS_KEY, access);
  window.localStorage.setItem(REFRESH_KEY, refresh);
}

function clearTokens() {
  accessToken = "";
  refreshToken = "";
  if (!canUseStorage()) return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function authHeaders(headers?: HeadersInit) {
  return {
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(headers ?? {}),
  };
}

async function refreshAccessToken() {
  if (!refreshToken) return false;
  const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  });
  if (!response.ok) return false;
  const payload = await parseResponse(response);
  accessToken = payload.access;
  if (canUseStorage()) window.localStorage.setItem(ACCESS_KEY, accessToken);
  return true;
}

async function apiFetch<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: authHeaders(options.headers),
  });

  if (response.status === 401 && retry && (await refreshAccessToken())) {
    return apiFetch<T>(path, options, false);
  }

  const payload = await parseResponse(response);
  if (!response.ok) {
    const message = payload?.message ?? payload?.detail ?? firstPayloadError(payload?.errors) ?? "API request failed.";
    throw new Error(message);
  }
  return payload;
}

function firstPayloadError(value: unknown): string | undefined {
  if (Array.isArray(value)) return value.length ? firstPayloadError(value[0]) : undefined;
  if (value && typeof value === "object") {
    for (const [field, detail] of Object.entries(value)) {
      const message = firstPayloadError(detail);
      if (message) return `${field}: ${message}`;
    }
    return undefined;
  }
  return value ? String(value) : undefined;
}

async function apiJson<T>(path: string, body?: unknown, method = "POST") {
  return apiFetch<T>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function unwrap<T>(payload: unknown): T {
  const data = (payload as { data?: unknown })?.data ?? payload;
  return ((data as { results?: unknown })?.results ?? data) as T;
}

async function fetchAll<T>(path: string): Promise<T[]> {
  const separator = path.includes("?") ? "&" : "?";
  const payload = await apiFetch(`${path}${separator}page_size=100`);
  return unwrap<T[]>(payload);
}

const choiceMap: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
  planning: "Planning",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
  not_started: "Not Started",
  in_progress: "In Progress",
  waiting_for_review: "Waiting for Review",
  changes_required: "Changes Required",
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  reviewed: "Reviewed",
  approved: "Approved",
  feedback: "Feedback",
  instruction: "Instruction",
  approval: "Approval",
};

const toChoice = (value: string) => choiceMap[value] ?? value;
const fromChoice = (value?: string) => (value ?? "").toLowerCase().replace(/\s+/g, "_");

function mapUser(user: ApiUser): User {
  return {
    id: String(user.id),
    username: user.username,
    name: user.full_name ?? user.name ?? user.username ?? user.email,
    email: user.email,
    role: user.role,
    jobTitle: user.job_title ?? "",
    department: user.department ?? "",
    phone: user.phone_number ?? "",
    avatar: user.profile_image ?? null,
    status: user.is_active === false ? "inactive" : "active",
  };
}

function mapProject(project: ApiProject, fallbackAssignee?: string): Project {
  return {
    id: String(project.id),
    name: project.name,
    client: project.client_name ?? "",
    description: project.description ?? "",
    startDate: project.start_date,
    deadline: project.deadline,
    assignees:
      project.members?.flatMap((m) => (m.employee?.id == null ? [] : [String(m.employee.id)])) ??
      (fallbackAssignee ? [fallbackAssignee] : []),
    priority: toChoice(project.priority) as Project["priority"],
    status: toChoice(project.status) as Project["status"],
    progress: project.progress_percentage ?? 0,
  };
}

function mapComment(comment: ApiComment): Comment {
  return {
    id: String(comment.id),
    authorId: String(comment.author ?? ""),
    authorName: comment.author_name ?? "Admin",
    text: comment.comment,
    createdAt: comment.created_at,
    type: toChoice(comment.comment_type) as Comment["type"],
  };
}

function mapReport(report: ApiReport): Report {
  return {
    id: String(report.id),
    employeeId: String(report.employee),
    date: report.report_date,
    projectId: String(report.project),
    completed: report.work_completed,
    timeSpent: Number(report.time_spent_hours),
    status: toChoice(report.status) as ReportStatus,
    comments: (report.comments ?? []).map(mapComment),
  };
}

function prependOrReplace<T extends { id: string }>(items: T[], item: T) {
  return items.some((existing) => existing.id === item.id)
    ? items.map((existing) => (existing.id === item.id ? item : existing))
    : [item, ...items];
}

function mapNotification(notification: ApiNotification): Notification {
  const type = notification.notification_type.includes("comment")
    ? "comment"
    : notification.notification_type.includes("deadline")
      ? "deadline"
      : notification.notification_type.includes("report")
        ? "report"
        : "task";
  return {
    id: String(notification.id),
    userId: String(notification.recipient),
    title: notification.title,
    message: notification.message,
    createdAt: notification.created_at,
    read: notification.is_read,
    type,
  };
}

function mapAudit(entry: ApiAudit): AuditEntry {
  const action = entry.action.replace(/_/g, " ");
  const type = action.includes("delete")
    ? "delete"
    : action.includes("review") || action.includes("approve")
      ? "review"
      : action.includes("create") || action.includes("assign") || action.includes("submit")
        ? "create"
        : action.includes("login")
          ? "login"
          : "update";
  return {
    id: String(entry.id),
    user: entry.user_name ?? entry.user_email ?? "System",
    action,
    target: entry.description || [entry.entity_type, entry.entity_id].filter(Boolean).join(" #"),
    createdAt: entry.created_at,
    type,
  };
}

function userPayload(user: Partial<User> & { password?: string }) {
  return {
    username: user.username,
    email: user.email,
    full_name: user.name,
    password: user.password,
    phone_number: user.phone,
    job_title: user.jobTitle,
    department: user.department,
    is_active: user.status ? user.status === "active" : undefined,
  };
}

function projectPayload(project: Partial<Project>) {
  const payload: Record<string, unknown> = {};
  if (project.name !== undefined) payload.name = project.name;
  if (project.client !== undefined) payload.client_name = project.client;
  if (project.description !== undefined) payload.description = project.description;
  if (project.startDate !== undefined) payload.start_date = project.startDate;
  if (project.deadline !== undefined) payload.deadline = project.deadline;
  if (project.priority !== undefined) payload.priority = fromChoice(project.priority);
  if (project.status !== undefined) payload.status = fromChoice(project.status);
  if (project.progress !== undefined) payload.progress_percentage = project.progress;
  return payload;
}

function reportPayload(report: Omit<Report, "id" | "comments"> & { status?: ReportStatus }) {
  return {
    employee: report.employeeId,
    report_date: report.date,
    project: report.projectId,
    work_completed: report.completed,
    time_spent_hours: report.timeSpent,
    status: fromChoice(report.status ?? "Submitted"),
  };
}

export function ApiStoreProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async (options?: { showLoading?: boolean }) => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    const showLoading = options?.showLoading ?? !hasLoadedRef.current;
    if (showLoading) setIsLoading(true);
    try {
      const me = mapUser(unwrap<ApiUser>(await apiFetch("/auth/me/")));
      setCurrentUser(me);

      const [projectList, reportList, notificationList] = await Promise.all([
        fetchAll<ApiProject>("/projects/"),
        fetchAll<ApiReport>("/reports/"),
        fetchAll<ApiNotification>("/notifications/"),
      ]);

      const projectDetails = await Promise.all(
        projectList.map((project) =>
          apiFetch(`/projects/${project.id}/`)
            .then((payload) => unwrap<ApiProject>(payload))
            .catch(() => project),
        ),
      );

      const reportDetails = await Promise.all(
        reportList.map((report) =>
          apiFetch(`/reports/${report.id}/`)
            .then((payload) => unwrap<ApiReport>(payload))
            .catch(() => report),
        ),
      );

      setProjects(projectDetails.map((project) => mapProject(project, me.role === "employee" ? me.id : undefined)));
      setReports(reportDetails.map(mapReport));
      setNotifications(notificationList.map(mapNotification));

      if (me.role === "admin") {
        const [employeeList, auditList] = await Promise.all([
          fetchAll<ApiUser>("/employees/"),
          fetchAll<ApiAudit>("/audit-logs/"),
        ]);
        setUsers([me, ...employeeList.map(mapUser)]);
        setAudit(auditList.map(mapAudit));
      } else {
        setUsers([me]);
        setAudit([]);
      }
    } catch (error) {
      console.error(error);
      clearTokens();
      setCurrentUser(null);
      setUsers([]);
      setProjects([]);
      setReports([]);
      setNotifications([]);
      setAudit([]);
    } finally {
      hasLoadedRef.current = true;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTokens();
    void refresh();
  }, [refresh]);

  const runMutation = useCallback(
    async (action: () => Promise<void>, message = "Request failed.") => {
      try {
        await action();
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : message);
      }
    },
    [],
  );

  const value = useMemo<StoreContext>(
    () => ({
      currentUser,
      users,
      projects,
      reports,
      notifications,
      audit,
      isLoading,
      login: async (username, password) => {
        const payload = unwrap<{
          access: string;
          refresh: string;
          user_id: number | string;
          username: string;
          full_name: string;
          email: string;
          role: Role;
          profile_image?: string | null;
        }>(await apiJson("/auth/login/", { username, password }));
        saveTokens(payload.access, payload.refresh);
        const user = mapUser({
          id: payload.user_id,
          username: payload.username,
          full_name: payload.full_name,
          email: payload.email,
          role: payload.role,
          profile_image: payload.profile_image,
          is_active: true,
        });
        setCurrentUser(user);
        await refresh();
        return user;
      },
      logout: async () => {
        try {
          if (refreshToken) await apiJson("/auth/logout/", { refresh: refreshToken });
        } catch {
          // Token may already be expired; local logout should still complete.
        }
        clearTokens();
        setCurrentUser(null);
        setUsers([]);
        setProjects([]);
        setReports([]);
        setNotifications([]);
        setAudit([]);
      },
      refresh,
      addUser: async (user) => {
        const created = unwrap<ApiUser>(await apiJson("/employees/", userPayload(user)));
        const username = created.username ?? user.username;
        setUsers((items) => [
          ...items,
          {
            id: String(created.id),
            username,
            name: username,
            email: created.email ?? `${username}@willstride.local`,
            role: "employee",
            status: "active",
          },
        ]);
      },
      updateUser: (id, patch) =>
        runMutation(async () => {
          await apiJson(`/employees/${id}/`, userPayload(patch), "PATCH");
          setUsers((items) =>
            items.map((user) => (user.id === id ? { ...user, ...patch } : user)),
          );
          setCurrentUser((user) => (user?.id === id ? { ...user, ...patch } : user));
        }),
      resetUserPassword: async (id) => {
        const payload = unwrap<{ temporary_password: string }>(await apiJson(`/employees/${id}/reset-password/`, {}));
        return payload.temporary_password;
      },
      addProject: (project) =>
        runMutation(async () => {
          const created = unwrap<ApiProject>(await apiJson("/projects/", projectPayload(project)));
          if (project.assignees.length > 0) {
            await apiJson(`/projects/${created.id}/assign-employees/`, { employee_ids: project.assignees });
          }
          setProjects((items) =>
            prependOrReplace(items, { ...mapProject(created), assignees: project.assignees }),
          );
        }),
      updateProject: (id, patch) =>
        runMutation(async () => {
          const updated = unwrap<ApiProject>(await apiJson(`/projects/${id}/`, projectPayload(patch), "PATCH"));
          if (patch.assignees) {
            const existing = projects.find((project) => project.id === id)?.assignees ?? [];
            const added = patch.assignees.filter((employeeId) => !existing.includes(employeeId));
            const removed = existing.filter((employeeId) => !patch.assignees?.includes(employeeId));
            if (added.length) await apiJson(`/projects/${id}/assign-employees/`, { employee_ids: added });
            for (const employeeId of removed) {
              await apiJson(`/projects/${id}/remove-employee/`, { employee_id: employeeId });
            }
          }
          setProjects((items) =>
            items.map((project) =>
              project.id === id
                ? { ...project, ...mapProject(updated), assignees: patch.assignees ?? project.assignees }
                : project,
            ),
          );
        }),
      archiveProject: (id) =>
        runMutation(async () => {
          await apiJson(`/projects/${id}/archive/`);
          setProjects((items) => items.filter((project) => project.id !== id));
        }),
      addReport: (report) =>
        runMutation(async () => {
          const created = unwrap<ApiReport>(await apiJson("/reports/", reportPayload(report)));
          setReports((items) => prependOrReplace(items, mapReport(created)));
        }),
      updateReport: (id, patch) =>
        runMutation(async () => {
          let updated: ApiReport;
          if (patch.status && Object.keys(patch).length === 1) {
            const status = patch.status;
            if (status === "Changes Required") updated = unwrap<ApiReport>(await apiJson(`/reports/${id}/request-changes/`, {}));
            else if (status === "Under Review") updated = unwrap<ApiReport>(await apiJson(`/reports/${id}/mark-under-review/`, {}));
            else if (status === "Reviewed") updated = unwrap<ApiReport>(await apiJson(`/reports/${id}/mark-reviewed/`, {}));
            else if (status === "Approved") updated = unwrap<ApiReport>(await apiJson(`/reports/${id}/approve/`, {}));
            else updated = unwrap<ApiReport>(await apiJson(`/reports/${id}/submit/`, {}));
          } else {
            updated = unwrap<ApiReport>(await apiJson(`/reports/${id}/`, reportPayload(patch as Report), "PATCH"));
          }
          setReports((items) =>
            items.map((report) =>
              report.id === id ? { ...mapReport(updated), comments: mapReport(updated).comments.length ? mapReport(updated).comments : report.comments } : report,
            ),
          );
        }),
      addComment: (reportId, comment) =>
        runMutation(async () => {
          const created = unwrap<ApiComment>(await apiJson(`/reports/${reportId}/comments/`, {
            comment: comment.text,
            comment_type: fromChoice(comment.type),
          }));
          setReports((items) =>
            items.map((report) =>
              report.id === reportId
                ? { ...report, comments: [...report.comments, mapComment(created)] }
                : report,
            ),
          );
        }),
      markNotificationRead: (id) =>
        runMutation(async () => {
          await apiJson(`/notifications/${id}/mark-read/`, {});
          setNotifications((items) => items.map((notification) => notification.id === id ? { ...notification, read: true } : notification));
        }),
      markAllNotificationsRead: () =>
        runMutation(async () => {
          await apiJson("/notifications/mark-all-read/", {});
          setNotifications((items) => items.map((notification) => ({ ...notification, read: true })));
        }),
      logAudit: () => {
        // The backend records important audit events as mutations happen.
      },
    }),
    [audit, currentUser, isLoading, notifications, projects, refresh, reports, runMutation, users],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useStore must be used within ApiStoreProvider");
  return value;
}

export const initials = (name: string) =>
  name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
};

export const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

export async function downloadReportsExport(format: "csv" | "xlsx" = "csv") {
  let response = await fetch(`${API_BASE_URL}/reports/export/?format=${format}`, {
    headers: authHeaders(),
  });

  if (response.status === 401 && (await refreshAccessToken())) {
    response = await fetch(`${API_BASE_URL}/reports/export/?format=${format}`, {
      headers: authHeaders(),
    });
  }

  if (!response.ok) {
    const payload = await parseResponse(response);
    throw new Error(payload?.message ?? "Could not export reports.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = format === "xlsx" ? "reports.xlsx" : "reports.csv";
  link.click();
  URL.revokeObjectURL(url);
}
