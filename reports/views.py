import csv
from datetime import date
from io import StringIO, BytesIO

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from openpyxl import Workbook
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from audit_logs.services import record_audit
from core.permissions import is_admin
from core.responses import api_response
from notifications.services import create_notification, notify_admins
from reports.filters import DailyReportFilter
from reports.models import DailyReport, ReportComment
from reports.serializers import (
    DailyReportCreateUpdateSerializer,
    DailyReportDetailSerializer,
    DailyReportListSerializer,
    ReportCommentCreateUpdateSerializer,
    ReportCommentSerializer,
    ReportStatusActionSerializer,
)

User = get_user_model()


class DailyReportViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = DailyReportFilter
    search_fields = ["work_completed", "employee__full_name", "employee__email", "employee__username", "project__name"]
    ordering_fields = ["report_date", "status", "submitted_at", "reviewed_at", "created_at", "updated_at"]
    ordering = ["-report_date", "-created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return DailyReport.objects.none()
        qs = DailyReport.objects.select_related("employee", "project", "reviewed_by").prefetch_related("comments__author")
        if is_admin(self.request.user):
            return qs
        return qs.filter(employee=self.request.user)

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return DailyReportCreateUpdateSerializer
        if self.action == "retrieve":
            return DailyReportDetailSerializer
        return DailyReportListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            report = serializer.save()
        except IntegrityError:
            return api_response(
                "A daily report already exists for this employee and date.",
                {"report_date": ["Only one report per employee per date is allowed."]},
                status.HTTP_400_BAD_REQUEST,
                False,
            )
        if report.status == DailyReport.Status.SUBMITTED and report.submitted_at is None:
            report.submitted_at = timezone.now()
            report.save(update_fields=["submitted_at", "updated_at"])
            notify_admins("report_submitted", "Report submitted", f"{report.employee.full_name} submitted a daily report.", "report", report.id)
        record_audit(request.user, "report_created", "report", report.id, f"Created report for {report.report_date}.", request)
        return api_response("Report created successfully.", DailyReportDetailSerializer(report, context={"request": request}).data, status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        report = self.get_object()
        if not is_admin(request.user) and report.status not in {
            DailyReport.Status.DRAFT,
            DailyReport.Status.SUBMITTED,
            DailyReport.Status.CHANGES_REQUIRED,
        }:
            return api_response("Reviewed or approved reports cannot be edited.", status_code=status.HTTP_403_FORBIDDEN, success=False)
        previous_status = report.status
        serializer = self.get_serializer(report, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        try:
            report = serializer.save()
        except IntegrityError:
            return api_response(
                "A daily report already exists for this employee and date.",
                {"report_date": ["Only one report per employee per date is allowed."]},
                status.HTTP_400_BAD_REQUEST,
                False,
            )
        if report.status == DailyReport.Status.SUBMITTED and previous_status != DailyReport.Status.SUBMITTED:
            report.submitted_at = timezone.now()
            report.save(update_fields=["submitted_at", "updated_at"])
            notification_type = "report_resubmitted" if previous_status == DailyReport.Status.CHANGES_REQUIRED else "report_submitted"
            notify_admins(notification_type, "Report submitted", f"{report.employee.full_name} submitted a daily report.", "report", report.id)
        record_audit(request.user, "report_edited", "report", report.id, f"Edited report for {report.report_date}.", request)
        return api_response("Report updated successfully.", DailyReportDetailSerializer(report, context={"request": request}).data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        report = self.get_object()
        if not is_admin(request.user) and report.status not in {DailyReport.Status.DRAFT, DailyReport.Status.SUBMITTED, DailyReport.Status.CHANGES_REQUIRED}:
            return api_response("Reviewed or approved reports cannot be deleted.", status_code=status.HTTP_403_FORBIDDEN, success=False)
        record_audit(request.user, "report_deleted", "report", report.id, f"Deleted report for {report.report_date}.", request)
        report.delete()
        return api_response("Report deleted successfully.")

    @action(detail=False, methods=["get"])
    def today(self, request):
        today = date.today()
        qs = self.get_queryset().filter(report_date=today)
        if is_admin(request.user) and request.query_params.get("employee"):
            qs = qs.filter(employee_id=request.query_params["employee"])
        report = qs.first()
        if report is None:
            return api_response("No report exists for today.", {"report": None})
        return api_response("Today's report retrieved successfully.", DailyReportDetailSerializer(report, context={"request": request}).data)

    @action(detail=False, methods=["get"])
    def missing(self, request):
        target_date = request.query_params.get("date")
        target_date = date.fromisoformat(target_date) if target_date else date.today()
        if is_admin(request.user):
            submitted = DailyReport.objects.filter(report_date=target_date).values_list("employee_id", flat=True)
            employees = User.objects.filter(role=User.Role.EMPLOYEE, is_active=True).exclude(id__in=submitted).order_by("full_name")
            data = [{"id": employee.id, "full_name": employee.full_name, "email": employee.email, "department": employee.department} for employee in employees]
            return api_response("Missing reports retrieved successfully.", {"date": target_date, "employees": data})
        exists = DailyReport.objects.filter(employee=request.user, report_date=target_date).exists()
        return api_response("Missing report status retrieved successfully.", {"date": target_date, "missing": not exists})

    @action(detail=False, methods=["get"])
    def export(self, request):
        if not is_admin(request.user):
            self.permission_denied(request, message="Admin access is required.")
        queryset = self.filter_queryset(self.get_queryset())
        export_format = request.query_params.get("format", "csv").lower()
        rows = list(queryset)
        fields = [
            "Employee",
            "Department",
            "Date",
            "Project",
            "Description",
            "Time spent",
            "Status",
            "Reviewed by",
        ]

        def row(report):
            return [
                report.employee.full_name,
                report.employee.department,
                report.report_date.isoformat(),
                report.project.name,
                report.work_completed,
                float(report.time_spent_hours),
                report.status,
                report.reviewed_by.full_name if report.reviewed_by else "",
            ]

        if export_format in {"xlsx", "excel"}:
            workbook = Workbook()
            sheet = workbook.active
            sheet.title = "Reports"
            sheet.append(fields)
            for report in rows:
                sheet.append(row(report))
            output = BytesIO()
            workbook.save(output)
            response = HttpResponse(output.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            response["Content-Disposition"] = 'attachment; filename="reports.xlsx"'
            return response

        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(fields)
        for report in rows:
            writer.writerow(row(report))
        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="reports.csv"'
        return response

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        report = self.get_object()
        if report.employee != request.user and not is_admin(request.user):
            self.permission_denied(request, message="You can only submit your own reports.")
        previous_status = report.status
        if previous_status not in {DailyReport.Status.DRAFT, DailyReport.Status.SUBMITTED, DailyReport.Status.CHANGES_REQUIRED}:
            return api_response("This report cannot be submitted in its current status.", status_code=status.HTTP_400_BAD_REQUEST, success=False)
        report.status = DailyReport.Status.SUBMITTED
        report.submitted_at = timezone.now()
        report.save(update_fields=["status", "submitted_at", "updated_at"])
        notification_type = "report_resubmitted" if previous_status == DailyReport.Status.CHANGES_REQUIRED else "report_submitted"
        notify_admins(notification_type, "Report submitted", f"{report.employee.full_name} submitted a daily report.", "report", report.id)
        record_audit(request.user, notification_type, "report", report.id, f"Submitted report for {report.report_date}.", request)
        return api_response("Report submitted successfully.", DailyReportDetailSerializer(report, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="mark-under-review")
    def mark_under_review(self, request, pk=None):
        if not is_admin(request.user):
            self.permission_denied(request, message="Admin access is required.")
        report = self.get_object()
        report.status = DailyReport.Status.UNDER_REVIEW
        report.reviewed_by = request.user
        report.reviewed_at = timezone.now()
        report.save(update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"])
        return api_response("Report marked under review.", DailyReportDetailSerializer(report, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="request-changes")
    def request_changes(self, request, pk=None):
        if not is_admin(request.user):
            self.permission_denied(request, message="Admin access is required.")
        report = self.get_object()
        serializer = ReportStatusActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            report.status = DailyReport.Status.CHANGES_REQUIRED
            report.reviewed_by = request.user
            report.reviewed_at = timezone.now()
            report.save(update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"])
            if serializer.validated_data.get("comment"):
                ReportComment.objects.create(
                    report=report,
                    author=request.user,
                    comment=serializer.validated_data["comment"],
                    comment_type=ReportComment.Type.CHANGES_REQUIRED,
                )
            create_notification(report.employee, "changes_requested", "Report changes requested", "Please review admin feedback on your report.", "report", report.id)
            record_audit(request.user, "changes_requested", "report", report.id, f"Requested changes for report {report.id}.", request)
        return api_response("Changes requested successfully.", DailyReportDetailSerializer(report, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="mark-reviewed")
    def mark_reviewed(self, request, pk=None):
        if not is_admin(request.user):
            self.permission_denied(request, message="Admin access is required.")
        report = self.get_object()
        report.status = DailyReport.Status.REVIEWED
        report.reviewed_by = request.user
        report.reviewed_at = timezone.now()
        report.save(update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"])
        record_audit(request.user, "report_reviewed", "report", report.id, f"Reviewed report {report.id}.", request)
        return api_response("Report marked reviewed successfully.", DailyReportDetailSerializer(report, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        if not is_admin(request.user):
            self.permission_denied(request, message="Admin access is required.")
        report = self.get_object()
        serializer = ReportStatusActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            report.status = DailyReport.Status.APPROVED
            report.reviewed_by = request.user
            report.reviewed_at = timezone.now()
            report.save(update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"])
            create_notification(report.employee, "report_approved", "Report approved", f"Your report for {report.report_date} was approved.", "report", report.id)
            record_audit(request.user, "report_approved", "report", report.id, f"Approved report {report.id}.", request)
        return api_response("Report approved successfully.", DailyReportDetailSerializer(report, context={"request": request}).data)


class ReportCommentListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_report(self, request, report_id):
        qs = DailyReport.objects.all()
        if not is_admin(request.user):
            qs = qs.filter(employee=request.user)
        return get_object_or_404(qs, pk=report_id)

    @extend_schema(responses={200: ReportCommentSerializer(many=True)})
    def get(self, request, report_id):
        report = self.get_report(request, report_id)
        comments = report.comments.select_related("author")
        return api_response("Report comments retrieved successfully.", ReportCommentSerializer(comments, many=True, context={"request": request}).data)

    @extend_schema(request=ReportCommentCreateUpdateSerializer, responses={201: ReportCommentSerializer})
    def post(self, request, report_id):
        if not is_admin(request.user):
            self.permission_denied(request, message="Admin access is required.")
        report = self.get_report(request, report_id)
        serializer = ReportCommentCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            comment = serializer.save(report=report, author=request.user)
            create_notification(report.employee, "admin_comment", "Admin comment", "An admin added a comment to your report.", "report", report.id)
            record_audit(request.user, "comment_added", "report", report.id, f"Added comment to report {report.id}.", request)
        return api_response("Comment added successfully.", ReportCommentSerializer(comment, context={"request": request}).data, status.HTTP_201_CREATED)


class ReportCommentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ReportCommentSerializer
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ReportComment.objects.none()
        qs = ReportComment.objects.select_related("report", "author", "report__employee")
        if is_admin(self.request.user):
            return qs
        return qs.filter(report__employee=self.request.user)

    def get_serializer_class(self):
        if self.action in {"partial_update", "update"}:
            return ReportCommentCreateUpdateSerializer
        return ReportCommentSerializer

    def partial_update(self, request, *args, **kwargs):
        if not is_admin(request.user):
            self.permission_denied(request, message="Admin access is required.")
        comment = self.get_object()
        serializer = self.get_serializer(comment, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        comment = serializer.save()
        return api_response("Comment updated successfully.", ReportCommentSerializer(comment, context={"request": request}).data)

    def destroy(self, request, *args, **kwargs):
        if not is_admin(request.user):
            self.permission_denied(request, message="Admin access is required.")
        comment = self.get_object()
        comment.delete()
        return api_response("Comment deleted successfully.")
