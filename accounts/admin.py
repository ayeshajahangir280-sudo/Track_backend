from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from accounts.models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    model = User
    ordering = ("username",)
    list_display = ("username", "email", "full_name", "role", "department", "job_title", "is_active", "is_staff")
    list_filter = ("role", "department", "job_title", "is_active", "is_staff")
    search_fields = ("username", "email", "full_name")
    fieldsets = (
        (None, {"fields": ("username", "email", "password")}),
        ("Profile", {"fields": ("full_name", "role", "phone_number", "job_title", "department", "profile_image")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined", "updated_at")}),
    )
    readonly_fields = ("date_joined", "updated_at", "last_login")
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("username", "email", "full_name", "role", "password1", "password2", "is_staff", "is_superuser"),
            },
        ),
    )
