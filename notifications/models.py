from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        TASK_ASSIGNED = "task_assigned", "Task Assigned"
        TASK_UPDATED = "task_updated", "Task Updated"
        ADMIN_COMMENT = "admin_comment", "Admin Comment"
        CHANGES_REQUESTED = "changes_requested", "Changes Requested"
        TASK_COMPLETED = "task_completed", "Task Completed"
        DEADLINE_UPDATED = "deadline_updated", "Deadline Updated"
        REPORT_SUBMITTED = "report_submitted", "Report Submitted"
        REPORT_RESUBMITTED = "report_resubmitted", "Report Resubmitted"
        REPORT_APPROVED = "report_approved", "Report Approved"

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    notification_type = models.CharField(max_length=40, choices=Type.choices, db_index=True)
    title = models.CharField(max_length=255)
    message = models.TextField()
    related_object_type = models.CharField(max_length=80, blank=True)
    related_object_id = models.CharField(max_length=80, blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read"]),
            models.Index(fields=["recipient", "created_at"]),
            models.Index(fields=["notification_type"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.title} -> {self.recipient}"
