from audit_logs.models import AuditLog


def get_client_ip(request):
    if request is None:
        return None
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def record_audit(user, action: str, entity_type: str = "", entity_id=None, description: str = "", request=None):
    return AuditLog.objects.create(
        user=user if getattr(user, "is_authenticated", False) else None,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id or ""),
        description=description,
        ip_address=get_client_ip(request),
        user_agent=(request.META.get("HTTP_USER_AGENT", "") if request else ""),
    )
