import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, useStore } from "@/lib/api-store";

export const Route = createFileRoute("/employee/notifications")({ component: EmpNotifications });

function EmpNotifications() {
  const { currentUser, notifications, markNotificationRead, markAllNotificationsRead } = useStore();
  const list = notifications.filter((n) => n.userId === currentUser?.id);
  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Alerts about your projects and reports." actions={
        <Button variant="outline" onClick={() => currentUser && markAllNotificationsRead(currentUser.id)}>Mark all read</Button>
      } />
      <Card><CardContent className="p-0">
        {list.length === 0 ? <div className="p-6"><EmptyState icon={Bell} title="No notifications" /></div> : (
          <ul className="divide-y">
            {list.map((n) => (
              <li key={n.id} className={`flex items-start gap-3 p-4 ${n.read ? "" : "bg-muted/30"}`}>
                <div className={`mt-1 h-2 w-2 rounded-full ${n.read ? "bg-muted-foreground/30" : "bg-accent"}`} />
                <div className="flex-1"><p className="text-sm font-medium">{n.title}</p><p className="text-sm text-muted-foreground">{n.message}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p></div>
                {!n.read && <Button size="sm" variant="ghost" onClick={() => markNotificationRead(n.id)}>Mark read</Button>}
              </li>
            ))}
          </ul>
        )}
      </CardContent></Card>
    </div>
  );
}
