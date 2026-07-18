from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, DateFromToRangeFilter, NumberFilter
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated

from audit_logs.services import record_audit
from core.permissions import is_admin
from core.responses import api_response
from notifications.services import create_notification, notify_admins
from tasks.models import Task, TaskStatusHistory
from tasks.serializers import (
    TaskAssignSerializer,
    TaskCreateUpdateSerializer,
    TaskDetailSerializer,
    TaskListSerializer,
    TaskRequestChangesSerializer,
    TaskStatusHistorySerializer,
    TaskStatusUpdateSerializer,
)
from tasks.services import set_task_status


class TaskFilter(FilterSet):
    assigned_employee = NumberFilter(field_name="assigned_employee_id")
    due_date = DateFromToRangeFilter()
    assigned_date = DateFromToRangeFilter()

    class Meta:
        model = Task
        fields = ["project", "assigned_employee", "priority", "status", "due_date", "assigned_date"]


class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = TaskFilter
    search_fields = ["title", "description", "project__name", "assigned_employee__full_name"]
    ordering_fields = ["assigned_date", "due_date", "priority", "status", "created_at", "updated_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Task.objects.none()
        qs = Task.objects.select_related("project", "assigned_employee", "assigned_by", "approved_by").prefetch_related("history")
        if is_admin(self.request.user):
            return qs
        return qs.filter(assigned_employee=self.request.user)

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return TaskCreateUpdateSerializer
        if self.action == "retrieve":
            return TaskDetailSerializer
        return TaskListSerializer

    def check_admin_write(self):
        if not is_admin(self.request.user):
            self.permission_denied(self.request, message="Admin access is required.")

    def create(self, request, *args, **kwargs):
        self.check_admin_write()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            task = serializer.save(assigned_by=request.user)
            TaskStatusHistory.objects.create(task=task, old_status="", new_status=task.status, changed_by=request.user, notes="Task created.")
            create_notification(
                task.assigned_employee,
                "task_assigned",
                "New task assigned",
                f"You have a new task: {task.title}.",
                related_object_type="task",
                related_object_id=task.id,
            )
            record_audit(request.user, "task_assigned", "task", task.id, f"Assigned task {task.title} to {task.assigned_employee.email}.", request)
        return api_response("Task created successfully.", TaskDetailSerializer(task, context={"request": request}).data, status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        self.check_admin_write()
        partial = kwargs.pop("partial", False)
        task = self.get_object()
        old_due_date = task.due_date
        serializer = self.get_serializer(task, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            task = serializer.save()
            if old_due_date != task.due_date:
                create_notification(
                    task.assigned_employee,
                    "deadline_updated",
                    "Task deadline updated",
                    f"Deadline updated for {task.title}.",
                    related_object_type="task",
                    related_object_id=task.id,
                )
            record_audit(request.user, "task_updated", "task", task.id, f"Updated task {task.title}.", request)
        return api_response("Task updated successfully.", TaskDetailSerializer(task, context={"request": request}).data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self.check_admin_write()
        task = self.get_object()
        record_audit(request.user, "task_deleted", "task", task.id, f"Deleted task {task.title}.", request)
        task.delete()
        return api_response("Task deleted successfully.")

    @action(detail=True, methods=["post"], url_path="update-status")
    def update_status(self, request, pk=None):
        task = self.get_object()
        serializer = TaskStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]
        notes = serializer.validated_data.get("notes", "")
        employee_allowed = {Task.Status.NOT_STARTED, Task.Status.IN_PROGRESS, Task.Status.WAITING_FOR_REVIEW}
        if not is_admin(request.user):
            if task.assigned_employee != request.user:
                self.permission_denied(request, message="You can only update your assigned tasks.")
            if new_status not in employee_allowed:
                return api_response("Employees cannot set this task status.", {"status": ["Status is restricted to admins."]}, status.HTTP_400_BAD_REQUEST, False)
        with transaction.atomic():
            set_task_status(task, new_status, request.user, notes)
            record_audit(request.user, "task_status_changed", "task", task.id, f"Changed task status to {new_status}.", request)
            if not is_admin(request.user):
                notify_admins(
                    "task_updated",
                    "Task status updated",
                    f"{request.user.full_name} moved {task.title} to {task.get_status_display()}.",
                    related_object_type="task",
                    related_object_id=task.id,
                )
        task.refresh_from_db()
        return api_response("Task status updated successfully.", TaskDetailSerializer(task, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="mark-completed")
    def mark_completed(self, request, pk=None):
        self.check_admin_write()
        task = self.get_object()
        notes = request.data.get("notes", "")
        with transaction.atomic():
            set_task_status(task, Task.Status.COMPLETED, request.user, notes, approved_by=request.user)
            create_notification(
                task.assigned_employee,
                "task_completed",
                "Task completed",
                f"{task.title} was marked completed.",
                related_object_type="task",
                related_object_id=task.id,
            )
            record_audit(request.user, "task_completed", "task", task.id, f"Marked task {task.title} completed.", request)
        task.refresh_from_db()
        return api_response("Task marked completed successfully.", TaskDetailSerializer(task, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="request-changes")
    def request_changes(self, request, pk=None):
        self.check_admin_write()
        task = self.get_object()
        serializer = TaskRequestChangesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        notes = serializer.validated_data.get("notes", "")
        with transaction.atomic():
            set_task_status(task, Task.Status.CHANGES_REQUIRED, request.user, notes)
            create_notification(
                task.assigned_employee,
                "changes_requested",
                "Task changes requested",
                f"Changes were requested on {task.title}.",
                related_object_type="task",
                related_object_id=task.id,
            )
            record_audit(request.user, "changes_requested", "task", task.id, f"Requested changes on task {task.title}.", request)
        task.refresh_from_db()
        return api_response("Task changes requested successfully.", TaskDetailSerializer(task, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        self.check_admin_write()
        task = self.get_object()
        serializer = TaskAssignSerializer(data=request.data, context={"task": task})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            task.assigned_employee = serializer.validated_data["assigned_employee"]
            task.project = serializer.validated_data.get("project", task.project)
            task.assigned_by = request.user
            task.save(update_fields=["assigned_employee", "project", "assigned_by", "updated_at"])
            create_notification(
                task.assigned_employee,
                "task_assigned",
                "Task assigned",
                f"You were assigned to {task.title}.",
                related_object_type="task",
                related_object_id=task.id,
            )
            record_audit(request.user, "task_assigned", "task", task.id, f"Assigned task {task.title}.", request)
        return api_response("Task assigned successfully.", TaskDetailSerializer(task, context={"request": request}).data)

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        task = self.get_object()
        qs = task.history.select_related("changed_by")
        return api_response("Task history retrieved successfully.", TaskStatusHistorySerializer(qs, many=True).data)
