import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  "Not Started": "bg-muted text-muted-foreground",
  "In Progress": "bg-info/15 text-[color:var(--info)] border-[color:var(--info)]/30",
  "Waiting for Review": "bg-warning/15 text-[color:var(--warning)] border-[color:var(--warning)]/30",
  "Changes Required": "bg-destructive/15 text-destructive border-destructive/30",
  "Completed": "bg-success/15 text-[color:var(--success)] border-[color:var(--success)]/30",
  "Draft": "bg-muted text-muted-foreground",
  "Submitted": "bg-info/15 text-[color:var(--info)] border-[color:var(--info)]/30",
  "Under Review": "bg-warning/15 text-[color:var(--warning)] border-[color:var(--warning)]/30",
  "Reviewed": "bg-success/15 text-[color:var(--success)] border-[color:var(--success)]/30",
  "Approved": "bg-success/15 text-[color:var(--success)] border-[color:var(--success)]/30",
  "Planning": "bg-muted text-muted-foreground",
  "Active": "bg-info/15 text-[color:var(--info)] border-[color:var(--info)]/30",
  "On Hold": "bg-warning/15 text-[color:var(--warning)] border-[color:var(--warning)]/30",
  "Cancelled": "bg-destructive/15 text-destructive border-destructive/30",
  "Low": "bg-muted text-muted-foreground",
  "Medium": "bg-info/15 text-[color:var(--info)] border-[color:var(--info)]/30",
  "High": "bg-warning/15 text-[color:var(--warning)] border-[color:var(--warning)]/30",
  "Urgent": "bg-destructive/15 text-destructive border-destructive/30",
  "active": "bg-success/15 text-[color:var(--success)] border-[color:var(--success)]/30",
  "inactive": "bg-muted text-muted-foreground",
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium capitalize", map[value] ?? "bg-muted", className)}>
      {value}
    </Badge>
  );
}