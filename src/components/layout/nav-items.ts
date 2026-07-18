import {
  LayoutDashboard, Users, FolderKanban, FileText,
  Bell, ScrollText, Settings, ClipboardEdit, User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

export const adminNav: NavItem[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Employees", url: "/admin/employees", icon: Users },
  { title: "Projects", url: "/admin/projects", icon: FolderKanban },
  { title: "Daily Reports", url: "/admin/reports", icon: FileText },
  { title: "Notifications", url: "/admin/notifications", icon: Bell },
  { title: "Audit Logs", url: "/admin/audit", icon: ScrollText },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export const employeeNav: NavItem[] = [
  { title: "Dashboard", url: "/employee", icon: LayoutDashboard },
  { title: "Today's Report", url: "/employee/report", icon: ClipboardEdit },
  { title: "My Reports", url: "/employee/reports", icon: FileText },
  { title: "My Projects", url: "/employee/projects", icon: FolderKanban },
  { title: "Notifications", url: "/employee/notifications", icon: Bell },
  { title: "Profile", url: "/employee/profile", icon: User },
];
