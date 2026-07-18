import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/admin/audit")({ component: AuditPage });

function AuditPage() {
  const { audit } = useStore();
  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" description="System activity across the workspace." />
      <Card><CardContent className="p-0">
        <ul className="divide-y">
          {audit.map((a) => (
            <li key={a.id} className="flex items-start gap-3 p-4">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
              <div className="flex-1 text-sm"><p><span className="font-medium">{a.user}</span> {a.action.toLowerCase()} — {a.target}</p><p className="text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</p></div>
            </li>
          ))}
        </ul>
      </CardContent></Card>
    </div>
  );
}