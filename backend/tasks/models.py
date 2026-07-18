from django.conf import settings
from django.db import models

from projects.models import Project


class Task(models.Model):
    class Status(models.TextChoices):
        NOT_STARTED = "not_started", "Not Started"
        IN_PROGRESS = "in_progress", "In Progress"
        WAITING_FOR_REVIEW = "waiting_for_review", "Waiting for Review"
        CHANGES_REQUIRED = "changes_required", "Changes Required"
        COMPLETED = "completed", "Completed"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    title = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    project = models.ForeignKey(Project, on_delete=models.PROTECT, related_name="tasks")
    assigned_employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="assigned_tasks")
    assigned_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_tasks_created")
    assigned_date = models.DateField()
    due_date = models.DateField(db_index=True)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM, db_index=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.NOT_STARTED, db_index=True)
    admin_instructions = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_tasks")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["project", "status"]),
            models.Index(fields=["assigned_employee", "status"]),
            models.Index(fields=["due_date"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return self.title


class TaskStatusHistory(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="history")
    old_status = models.CharField(max_length=30, blank=True)
    new_status = models.CharField(max_length=30)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="task_status_changes")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["task", "created_at"]),
            models.Index(fields=["new_status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.task_id}: {self.old_status} -> {self.new_status}"
