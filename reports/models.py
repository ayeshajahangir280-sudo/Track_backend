from django.conf import settings
from django.db import models

from core.validators import validate_attachment_file
from projects.models import Project
from tasks.models import Task


class DailyReport(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        UNDER_REVIEW = "under_review", "Under Review"
        CHANGES_REQUIRED = "changes_required", "Changes Required"
        REVIEWED = "reviewed", "Reviewed"
        APPROVED = "approved", "Approved"

    employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="daily_reports")
    report_date = models.DateField(db_index=True)
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name="daily_reports")
    task = models.ForeignKey(Task, on_delete=models.SET_NULL, null=True, blank=True, related_name="daily_reports")
    work_completed = models.TextField()
    work_in_progress = models.TextField(blank=True)
    blockers = models.TextField(blank=True)
    next_day_plan = models.TextField(blank=True)
    time_spent_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    additional_notes = models.TextField(blank=True)
    attachment = models.FileField(upload_to="reports/%Y/%m/", validators=[validate_attachment_file], blank=True, null=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.DRAFT, db_index=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_reports")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-report_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["employee", "report_date"], name="unique_employee_daily_report")
        ]
        indexes = [
            models.Index(fields=["employee", "report_date"]),
            models.Index(fields=["project", "report_date"]),
            models.Index(fields=["task"]),
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.employee} - {self.report_date}"


class ReportComment(models.Model):
    class Type(models.TextChoices):
        FEEDBACK = "feedback", "Feedback"
        INSTRUCTION = "instruction", "Instruction"
        CHANGES_REQUIRED = "changes_required", "Changes Required"
        APPROVAL = "approval", "Approval"

    report = models.ForeignKey(DailyReport, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="report_comments")
    comment = models.TextField()
    comment_type = models.CharField(max_length=30, choices=Type.choices, default=Type.FEEDBACK)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["report", "created_at"]),
            models.Index(fields=["author"]),
            models.Index(fields=["comment_type"]),
        ]

    def __str__(self):
        return f"{self.comment_type} on report {self.report_id}"
