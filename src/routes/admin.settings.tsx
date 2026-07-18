import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Workspace configuration and preferences." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Workspace</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2"><Label>Company name</Label><Input defaultValue="Acme Co." /></div>
            <div className="space-y-2"><Label>Working hours per day</Label><Input type="number" defaultValue={8} /></div>
            <Button onClick={() => toast.success("Settings saved")}>Save</Button>
          </CardContent></Card>
        <Card><CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Row label="Email me when reports are submitted" />
            <Row label="Email me when deadlines are near" />
            <Row label="Weekly summary digest" />
          </CardContent></Card>
      </div>
    </div>
  );
}

function Row({ label }: { label: string }) {
  return <div className="flex items-center justify-between"><span className="text-sm">{label}</span><Switch defaultChecked /></div>;
}