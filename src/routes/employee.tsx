import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { employeeNav } from "@/components/layout/nav-items";
import { useStore } from "@/lib/api-store";

export const Route = createFileRoute("/employee")({
  component: EmployeeLayout,
});

function EmployeeLayout() {
  const navigate = useNavigate();
  const { currentUser, isLoading } = useStore();

  useEffect(() => {
    if (isLoading) return;
    if (!currentUser) navigate({ to: "/" });
    else if (currentUser.role !== "employee") navigate({ to: "/admin" });
  }, [currentUser, isLoading, navigate]);

  if (isLoading || !currentUser || currentUser.role !== "employee") {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading workspace...</div>;
  }

  return (
    <AppLayout role="Employee" items={employeeNav}>
      <Outlet />
    </AppLayout>
  );
}
