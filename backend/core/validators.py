from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError


def validate_attachment_file(uploaded_file):
    suffix = Path(uploaded_file.name).suffix.lower().lstrip(".")
    if suffix not in settings.ALLOWED_ATTACHMENT_EXTENSIONS:
        raise ValidationError("Unsupported attachment type.")
    if uploaded_file.size > settings.MAX_ATTACHMENT_SIZE:
        raise ValidationError(f"Attachment must be {settings.MAX_ATTACHMENT_SIZE_MB}MB or smaller.")
