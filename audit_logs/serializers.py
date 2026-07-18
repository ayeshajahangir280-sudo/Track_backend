from rest_framework import serializers

from audit_logs.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "user",
            "user_name",
            "user_email",
            "action",
            "entity_type",
            "entity_id",
            "description",
            "ip_address",
            "user_agent",
            "created_at",
        )
        read_only_fields = fields
