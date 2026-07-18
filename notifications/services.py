from django.contrib.auth import get_user_model

from notifications.models import Notification


def create_notification(
    recipient,
    notification_type: str,
    title: str,
    message: str,
    related_object_type: str = "",
    related_object_id=None,
):
    if not recipient:
        return None
    return Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        related_object_type=related_object_type,
        related_object_id=str(related_object_id or ""),
    )


def notify_admins(notification_type: str, title: str, message: str, related_object_type: str = "", related_object_id=None):
    User = get_user_model()
    notifications = []
    for admin in User.objects.filter(role=User.Role.ADMIN, is_active=True):
        notifications.append(
            create_notification(admin, notification_type, title, message, related_object_type, related_object_id)
        )
    return notifications
