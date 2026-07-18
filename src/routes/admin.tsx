import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { adminNav } from "@/components/layout/nav-items";
import { useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { currentUser, login } = useStore();
  useEffect(() => {
    if (!currentUser || currentUser.role !== "admin") login("admin");
  }, [currentUser, login]);
  return (
    <AppLayout role="Admin" items={adminNav}>
      <Outlet />
    </AppLayout>
  );
}