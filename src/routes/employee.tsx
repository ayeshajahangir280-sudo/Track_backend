import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { employeeNav } from "@/components/layout/nav-items";
import { useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/employee")({
  component: EmployeeLayout,
});

function EmployeeLayout() {
  const { currentUser, login } = useStore();
  useEffect(() => {
    if (!currentUser || currentUser.role !== "employee") login("employee");
  }, [currentUser, login]);
  return (
    <AppLayout role="Employee" items={employeeNav}>
      <Outlet />
    </AppLayout>
  );
}