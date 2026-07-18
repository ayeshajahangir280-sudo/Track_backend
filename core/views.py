from datetime import date

from django.db.models import Count, Sum
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from accounts.models import User
from audit_logs.models import AuditLog
from audit_logs.serializers import AuditLogSerializer
from core.permissions import IsAdmin, IsEmployee
from core.responses import api_response
from notifications.models import Notification
from notifications.serializers import NotificationSerializer
from projects.models import Project
from projects.serializers import ProjectListSerializer
from reports.models import DailyReport, ReportComment
from reports.serializers import DailyReportListSerializer, ReportCommentSerializer


class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(responses={200: OpenApiResponse(description="Admin dashboard metrics and activity.")})
    def get(self, request):
        today = date.today()
        recent_reports = DailyReport.objects.select_related("employee", "project", "reviewed_by").order_by("-created_at")[:5]
        recent_activity = AuditLog.objects.select_related("user").order_by("-created_at")[:10]
        project_summary = Project.objects.filter(archived_at__isnull=True).values("status").annotate(count=Count("id")).order_by("status")

        data = {
            "total_employees": User.objects.filter(role=User.Role.EMPLOYEE).count(),
            "active_employees": User.objects.filter(role=User.Role.EMPLOYEE, is_active=True).count(),
            "total_projects": Project.objects.count(),
            "active_projects": Project.objects.filter(status=Project.Status.ACTIVE, archived_at__isnull=True).count(),
            "reports_submitted_today": DailyReport.objects.filter(report_date=today, status__in=[
                DailyReport.Status.SUBMITTED,
                DailyReport.Status.UNDER_REVIEW,
                DailyReport.Status.REVIEWED,
                DailyReport.Status.APPROVED,
            ]).count(),
            "pending_reviews": DailyReport.objects.filter(status__in=[DailyReport.Status.SUBMITTED, DailyReport.Status.UNDER_REVIEW]).count(),
            "approved_reports": DailyReport.objects.filter(status=DailyReport.Status.APPROVED).count(),
            "total_report_hours": DailyReport.objects.aggregate(total=Sum("time_spent_hours"))["total"] or 0,
            "recent_reports": DailyReportListSerializer(recent_reports, many=True, context={"request": request}).data,
            "recent_activity": AuditLogSerializer(recent_activity, many=True).data,
            "project_progress_summary": list(project_summary),
        }
        return api_response("Admin dashboard retrieved successfully.", data)


class EmployeeDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsEmployee]

    @extend_schema(responses={200: OpenApiResponse(description="Employee dashboard metrics and activity.")})
    def get(self, request):
        today = date.today()
        user = request.user
        assigned_project_qs = Project.objects.filter(memberships__employee=user, memberships__is_active=True).distinct()
        latest_comments = ReportComment.objects.select_related("report", "author").filter(report__employee=user).order_by("-created_at")[:5]
        recent_notifications = Notification.objects.filter(recipient=user).order_by("-created_at")[:5]
        today_report = DailyReport.objects.filter(employee=user, report_date=today).first()
        report_qs = DailyReport.objects.filter(employee=user)

        data = {
            "todays_report_status": today_report.status if today_report else None,
            "total_reports": report_qs.count(),
            "pending_reviews": report_qs.filter(status__in=[DailyReport.Status.SUBMITTED, DailyReport.Status.UNDER_REVIEW]).count(),
            "total_report_hours": report_qs.aggregate(total=Sum("time_spent_hours"))["total"] or 0,
            "latest_admin_comments": ReportCommentSerializer(latest_comments, many=True, context={"request": request}).data,
            "assigned_projects": ProjectListSerializer(assigned_project_qs, many=True, context={"request": request}).data,
            "recent_notifications": NotificationSerializer(recent_notifications, many=True).data,
        }
        return api_response("Employee dashboard retrieved successfully.", data)
