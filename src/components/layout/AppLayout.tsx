import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, LogOut, Search } from "lucide-react";
import type { ReactNode } from "react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/UserAvatar";
import { useStore, formatDateTime } from "@/lib/mock-store";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-items";

function NavList({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sidebar-foreground/60">{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active =
              pathname === item.url ||
              (item.url !== "/admin" && item.url !== "/employee" && pathname.startsWith(item.url + "/"));
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                  <Link
                    to={item.url}
                    className={cn(
                      "flex items-center gap-3",
                      active
                        ? "bg-sidebar-primary/15 text-sidebar-primary"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.title}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppLayout({
  role, items, children,
}: {
  role: "Admin" | "Employee";
  items: NavItem[];
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { currentUser, notifications, markNotificationRead, logout } = useStore();
  const myNotifs = notifications.filter((n) =>
    role === "Admin" ? n.userId === "u-admin" : n.userId === currentUser?.id,
  );
  const unread = myNotifs.filter((n) => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar collapsible="icon" className="border-r border-sidebar-border">
          <SidebarHeader className="border-b border-sidebar-border">
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold">
                P
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="truncate font-semibold text-sidebar-foreground">Prism</p>
                <p className="truncate text-xs text-sidebar-foreground/60">{role} workspace</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <NavList items={items} label="Menu" />
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border">
            <div className="flex items-center gap-2 px-2 py-2">
              {currentUser ? <UserAvatar name={currentUser.name} className="h-8 w-8" /> : null}
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{currentUser?.name}</p>
                <p className="truncate text-xs text-sidebar-foreground/60">{currentUser?.email}</p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur sm:px-6">
            <SidebarTrigger />
            <div className="relative ml-2 hidden max-w-md flex-1 md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search projects, tasks, reports…" className="pl-9" />
            </div>
            <div className="ml-auto flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unread > 0 && (
                      <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                        {unread}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {myNotifs.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
                  )}
                  {myNotifs.slice(0, 6).map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className="flex flex-col items-start gap-0.5 py-2"
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="text-sm font-medium">{n.title}</span>
                        {!n.read && <span className="h-2 w-2 rounded-full bg-accent" />}
                      </div>
                      <span className="text-xs text-muted-foreground">{n.message}</span>
                      <span className="text-[10px] text-muted-foreground">{formatDateTime(n.createdAt)}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 pl-1 pr-3">
                    {currentUser ? <UserAvatar name={currentUser.name} className="h-8 w-8" /> : null}
                    <span className="hidden text-sm font-medium sm:inline">{currentUser?.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{currentUser?.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 space-y-6 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}