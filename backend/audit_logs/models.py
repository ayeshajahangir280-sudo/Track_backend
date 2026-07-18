from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
    action = models.CharField(max_length=80, db_index=True)
    entity_type = models.CharField(max_length=80, blank=True, db_index=True)
    entity_id = models.CharField(max_length=80, blank=True)
    description = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["action"]),
            models.Index(fields=["entity_type"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.action} by {self.user or 'system'}"
