from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, BooleanFilter, DateFilter, NumberFilter
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated

from audit_logs.models import AuditLog
from audit_logs.serializers import AuditLogSerializer
from audit_logs.services import record_audit
from core.permissions import is_admin
from core.responses import api_response
from notifications.services import create_notification
from projects.models import Project, ProjectMember
from projects.serializers import (
    AssignEmployeesSerializer,
    ProjectCreateUpdateSerializer,
    ProjectDetailSerializer,
    ProjectListSerializer,
    ProjectMemberSerializer,
    RemoveEmployeeSerializer,
)


class ProjectFilter(FilterSet):
    employee = NumberFilter(field_name="memberships__employee_id")
    start_date = DateFilter(field_name="start_date")
    deadline = DateFilter(field_name="deadline")
    archived = BooleanFilter(method="filter_archived")

    class Meta:
        model = Project
        fields = ["status", "priority", "employee", "start_date", "deadline", "archived"]

    def filter_archived(self, queryset, name, value):
        return queryset.filter(archived_at__isnull=not value)


class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ProjectFilter
    search_fields = ["name", "client_name"]
    ordering_fields = ["name", "client_name", "start_date", "deadline", "priority", "status", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Project.objects.none()
        qs = Project.objects.annotate(members_count=Count("memberships", filter=Q(memberships__is_active=True))).prefetch_related(
            "memberships__employee", "memberships__assigned_by"
        )
        if is_admin(self.request.user):
            return qs.distinct()
        return qs.filter(memberships__employee=self.request.user, memberships__is_active=True).distinct()

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return ProjectCreateUpdateSerializer
        if self.action == "retrieve":
            return ProjectDetailSerializer
        return ProjectListSerializer

    def check_admin_write(self):
        if not is_admin(self.request.user):
            self.permission_denied(self.request, message="Admin access is required.")

    def create(self, request, *args, **kwargs):
        self.check_admin_write()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = serializer.save(created_by=request.user)
        record_audit(request.user, "project_created", "project", project.id, f"Created project {project.name}.", request)
        return api_response("Project created successfully.", ProjectDetailSerializer(project, context={"request": request}).data, status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        self.check_admin_write()
        partial = kwargs.pop("partial", False)
        project = self.get_object()
        serializer = self.get_serializer(project, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        project = serializer.save()
        record_audit(request.user, "project_updated", "project", project.id, f"Updated project {project.name}.", request)
        return api_response("Project updated successfully.", ProjectDetailSerializer(project, context={"request": request}).data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self.check_admin_write()
        project = self.get_object()
        project.archived_at = timezone.now()
        project.save(update_fields=["archived_at", "updated_at"])
        record_audit(request.user, "project_archived", "project", project.id, f"Archived project {project.name}.", request)
        return api_response("Project archived successfully.")

    @action(detail=True, methods=["post"], url_path="assign-employees")
    def assign_employees(self, request, pk=None):
        self.check_admin_write()
        project = self.get_object()
        serializer = AssignEmployeesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assigned = []
        with transaction.atomic():
            for employee in serializer.validated_data["employees"]:
                membership = ProjectMember.objects.filter(project=project, employee=employee).first()
                if membership:
                    membership.is_active = True
                    membership.assigned_by = request.user
                    membership.save(update_fields=["is_active", "assigned_by"])
                else:
                    membership = ProjectMember.objects.create(project=project, employee=employee, assigned_by=request.user)
                assigned.append(membership)
                create_notification(
                    employee,
                    "task_assigned",
                    "Project assignment",
                    f"You were assigned to project {project.name}.",
                    related_object_type="project",
                    related_object_id=project.id,
                )
            record_audit(request.user, "project_members_assigned", "project", project.id, f"Assigned {len(assigned)} employee(s) to {project.name}.", request)
        return api_response("Employees assigned successfully.", ProjectMemberSerializer(assigned, many=True, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="remove-employee")
    def remove_employee(self, request, pk=None):
        self.check_admin_write()
        project = self.get_object()
        serializer = RemoveEmployeeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        employee = serializer.validated_data["employee"]
        updated = ProjectMember.objects.filter(project=project, employee=employee, is_active=True).update(is_active=False)
        if not updated:
            return api_response("Employee is not an active member of this project.", status_code=status.HTTP_400_BAD_REQUEST, success=False)
        record_audit(request.user, "project_member_removed", "project", project.id, f"Removed {employee.email} from {project.name}.", request)
        return api_response("Employee removed successfully.")

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        return self.destroy(request, pk)

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        self.check_admin_write()
        project = self.get_object()
        project.archived_at = None
        project.save(update_fields=["archived_at", "updated_at"])
        record_audit(request.user, "project_restored", "project", project.id, f"Restored project {project.name}.", request)
        return api_response("Project restored successfully.", ProjectDetailSerializer(project, context={"request": request}).data)

    @action(detail=True, methods=["get"])
    def members(self, request, pk=None):
        project = self.get_object()
        qs = project.memberships.select_related("employee", "assigned_by").filter(is_active=True)
        return api_response("Project members retrieved successfully.", ProjectMemberSerializer(qs, many=True, context={"request": request}).data)

    @action(detail=True, methods=["get"])
    def reports(self, request, pk=None):
        project = self.get_object()
        from reports.serializers import DailyReportListSerializer

        qs = project.daily_reports.select_related("employee", "project", "reviewed_by")
        if not is_admin(request.user):
            qs = qs.filter(employee=request.user)
        return api_response("Project reports retrieved successfully.", DailyReportListSerializer(qs, many=True, context={"request": request}).data)

    @action(detail=True, methods=["get"])
    def activity(self, request, pk=None):
        project = self.get_object()
        qs = AuditLog.objects.select_related("user").filter(
            Q(entity_type="project", entity_id=str(project.id)) | Q(description__icontains=project.name)
        ).order_by("-created_at")[:50]
        return api_response("Project activity retrieved successfully.", AuditLogSerializer(qs, many=True).data)
