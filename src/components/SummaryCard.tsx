import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SummaryCard({
  label, value, icon: Icon, hint, tone = "default",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: "default" | "accent" | "warning" | "destructive" | "success";
}) {
  const toneMap = {
    default: "bg-primary/5 text-primary",
    accent: "bg-accent/15 text-primary",
    warning: "bg-warning/15 text-[color:var(--warning)]",
    destructive: "bg-destructive/10 text-destructive",
    success: "bg-success/15 text-[color:var(--success)]",
  } as const;
  return (
    <Card className="transition hover:shadow-md">
      <CardContent className="flex items-start gap-4 p-5">
        <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", toneMap[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
          {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}