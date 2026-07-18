import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { adminNav } from "@/components/layout/nav-items";
import { useStore } from "@/lib/api-store";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const { currentUser, isLoading } = useStore();

  useEffect(() => {
    if (isLoading) return;
    if (!currentUser) navigate({ to: "/" });
    else if (currentUser.role !== "admin") navigate({ to: "/employee" });
  }, [currentUser, isLoading, navigate]);

  if (isLoading || !currentUser || currentUser.role !== "admin") {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading workspace...</div>;
  }

  return (
    <AppLayout role="Admin" items={adminNav}>
      <Outlet />
    </AppLayout>
  );
}
