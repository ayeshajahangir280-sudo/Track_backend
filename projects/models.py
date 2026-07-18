from django.conf import settings
from django.db import models
from django.db.models import Q


class Project(models.Model):
    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    class Status(models.TextChoices):
        PLANNING = "planning", "Planning"
        ACTIVE = "active", "Active"
        ON_HOLD = "on_hold", "On Hold"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    name = models.CharField(max_length=255, db_index=True)
    client_name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    start_date = models.DateField()
    deadline = models.DateField()
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PLANNING, db_index=True)
    progress_percentage = models.PositiveSmallIntegerField(default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_projects")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    archived_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["priority"]),
            models.Index(fields=["start_date"]),
            models.Index(fields=["deadline"]),
            models.Index(fields=["archived_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return self.name


class ProjectMember(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="memberships")
    employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="project_memberships")
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="project_assignments_made")
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["project__name", "employee__full_name"]
        constraints = [
            models.UniqueConstraint(fields=["project", "employee"], condition=Q(is_active=True), name="unique_active_project_employee")
        ]
        indexes = [
            models.Index(fields=["project", "employee"]),
            models.Index(fields=["employee", "is_active"]),
        ]

    def __str__(self):
        return f"{self.employee} on {self.project}"
