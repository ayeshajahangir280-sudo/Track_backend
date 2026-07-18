from rest_framework.permissions import BasePermission, SAFE_METHODS


def is_admin(user) -> bool:
    return bool(user and user.is_authenticated and getattr(user, "role", None) == "admin")


def is_employee(user) -> bool:
    return bool(user and user.is_authenticated and getattr(user, "role", None) == "employee")


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return is_admin(request.user)


class IsEmployee(BasePermission):
    def has_permission(self, request, view):
        return is_employee(request.user)


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return is_admin(request.user)


class IsAdminOrOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        if is_admin(request.user):
            return True
        owner = getattr(obj, "employee", None) or getattr(obj, "assigned_employee", None) or obj
        return owner == request.user


class IsAssignedEmployee(BasePermission):
    def has_object_permission(self, request, view, obj):
        return is_admin(request.user) or getattr(obj, "assigned_employee", None) == request.user


class IsProjectMember(BasePermission):
    def has_object_permission(self, request, view, obj):
        if is_admin(request.user):
            return True
        members = getattr(obj, "memberships", None)
        if members is None:
            project = getattr(obj, "project", None)
            members = getattr(project, "memberships", None) if project else None
        return bool(members and members.filter(employee=request.user, is_active=True).exists())


class IsReportOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return is_admin(request.user) or getattr(obj, "employee", None) == request.user
