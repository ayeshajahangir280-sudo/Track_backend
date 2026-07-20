from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import serializers

from projects.models import ProjectMember
from reports.models import DailyReport, ReportComment

User = get_user_model()


class ReportCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.full_name", read_only=True)
    author_role = serializers.CharField(source="author.role", read_only=True)

    class Meta:
        model = ReportComment
        fields = ("id", "report", "author", "author_name", "author_role", "comment", "comment_type", "created_at", "updated_at")
        read_only_fields = ("id", "author", "author_name", "author_role", "created_at", "updated_at")


class DailyReportListSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    employee_email = serializers.EmailField(source="employee.email", read_only=True)
    department = serializers.CharField(source="employee.department", read_only=True)
    project_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.CharField(source="reviewed_by.full_name", read_only=True)
    comments = ReportCommentSerializer(many=True, read_only=True)

    def get_project_name(self, obj):
        return obj.project.name if obj.project else ""

    class Meta:
        model = DailyReport
        fields = (
            "id",
            "employee",
            "employee_name",
            "employee_email",
            "department",
            "report_date",
            "project",
            "project_name",
            "work_completed",
            "time_spent_hours",
            "status",
            "comments",
            "submitted_at",
            "reviewed_at",
            "reviewed_by",
            "reviewed_by_name",
            "created_at",
            "updated_at",
        )


class DailyReportDetailSerializer(DailyReportListSerializer):
    pass


class DailyReportCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyReport
        fields = (
            "employee",
            "report_date",
            "project",
            "work_completed",
            "time_spent_hours",
            "status",
        )
        extra_kwargs = {
            "employee": {"required": False},
            "report_date": {"required": False, "default": date.today},
            "project": {"required": False, "allow_null": True},
            "time_spent_hours": {"required": False, "default": Decimal("0")},
        }
        validators = []

    def validate_status(self, value):
        allowed = {DailyReport.Status.DRAFT, DailyReport.Status.SUBMITTED}
        if value not in allowed:
            raise serializers.ValidationError("Use the review action endpoints for this status.")
        return value

    def validate_time_spent_hours(self, value):
        if value is None:
            return Decimal("0")
        if value < 0:
            raise serializers.ValidationError("Time spent must be zero or greater.")
        return value

    def validate(self, attrs):
        request = self.context["request"]
        employee = attrs.get("employee") or getattr(self.instance, "employee", None) or request.user
        if request.user.role == User.Role.EMPLOYEE:
            employee = request.user
        if employee.role != User.Role.EMPLOYEE:
            raise serializers.ValidationError({"employee": "Reports can only belong to employees."})

        project = attrs.get("project", getattr(self.instance, "project", None))
        if project and not ProjectMember.objects.filter(project=project, employee=employee, is_active=True).exists():
            raise serializers.ValidationError({"project": "Selected project is not assigned to this employee."})

        attrs["employee"] = employee
        return attrs


class ReportStatusActionSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True)


class ReportCommentCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportComment
        fields = ("comment", "comment_type")
