import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { useStore } from "@/lib/api-store";
import { toast } from "sonner";

export const Route = createFileRoute("/employee/profile")({ component: Profile });

function Profile() {
  const { currentUser, updateUser } = useStore();
  const [name, setName] = useState(currentUser?.name ?? "");
  const [email, setEmail] = useState(currentUser?.email ?? "");
  const [phone, setPhone] = useState(currentUser?.phone ?? "");
  const [jobTitle, setJobTitle] = useState(currentUser?.jobTitle ?? "");
  if (!currentUser) return null;
  return (
    <div className="space-y-6">
      <PageHeader title="My profile" description="Update your personal information." />
      <Card><CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-4"><UserAvatar name={name} className="h-16 w-16 text-lg" /><div><p className="font-medium">{name}</p><p className="text-sm text-muted-foreground">{jobTitle}</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Username</Label><Input value={currentUser.username} readOnly /></div>
          <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="space-y-2"><Label>Job title</Label><Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} /></div>
        </div>
        <Button onClick={() => { updateUser(currentUser.id, { name, email, phone, jobTitle }); toast.success("Profile updated"); }}>Save changes</Button>
      </CardContent></Card>
    </div>
  );
}
