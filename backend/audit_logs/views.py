from django_filters.rest_framework import DjangoFilterBackend, FilterSet, DateFromToRangeFilter
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated

from audit_logs.models import AuditLog
from audit_logs.serializers import AuditLogSerializer
from core.permissions import IsAdmin


class AuditLogFilter(FilterSet):
    created_at = DateFromToRangeFilter()

    class Meta:
        model = AuditLog
        fields = {
            "user": ["exact"],
            "action": ["exact", "icontains"],
            "entity_type": ["exact", "icontains"],
        }


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = AuditLogFilter
    search_fields = ["action", "entity_type", "description", "user__full_name", "user__email"]
    ordering_fields = ["created_at", "action", "entity_type"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return AuditLog.objects.select_related("user")
