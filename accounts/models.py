import re

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


def username_from_email(email: str) -> str:
    base = (email or "").split("@")[0] or "user"
    base = re.sub(r"[^a-zA-Z0-9_]+", "_", base).strip("_").lower() or "user"
    return base[:140]


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, username=None, password=None, **extra_fields):
        email = extra_fields.pop("email", None)
        if not email:
            raise ValueError("Email is required.")
        if not username:
            username = username_from_email(email)
        username = str(username).strip().lower()
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username=None, password=None, **extra_fields):
        extra_fields.setdefault("role", User.Role.ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self.create_user(username, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        EMPLOYEE = "employee", "Employee"

    username = models.CharField(max_length=150, unique=True, db_index=True)
    email = models.EmailField(unique=True, db_index=True)
    full_name = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.EMPLOYEE, db_index=True)
    phone_number = models.CharField(max_length=50, blank=True)
    job_title = models.CharField(max_length=120, blank=True, db_index=True)
    department = models.CharField(max_length=120, blank=True, db_index=True)
    profile_image = models.ImageField(upload_to="profiles/", blank=True, null=True)
    is_active = models.BooleanField(default=True, db_index=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email", "full_name"]

    class Meta:
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["username"]),
            models.Index(fields=["role"]),
            models.Index(fields=["department", "job_title"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.username})"
