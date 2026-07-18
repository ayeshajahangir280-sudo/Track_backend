from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from core.responses import api_response
from notifications.models import Notification
from notifications.serializers import NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    ordering = ["-created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Notification.objects.none()
        return Notification.objects.filter(recipient=self.request.user).order_by("-created_at")

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        return api_response("Unread count retrieved successfully.", {"count": self.get_queryset().filter(is_read=False).count()})

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save(update_fields=["is_read", "read_at"])
        return api_response("Notification marked read successfully.", NotificationSerializer(notification).data)

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        now = timezone.now()
        updated = self.get_queryset().filter(is_read=False).update(is_read=True, read_at=now)
        return api_response("All notifications marked read successfully.", {"updated": updated})
