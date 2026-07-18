from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.serializers import (
    ChangePasswordSerializer,
    EmployeeCreateSerializer,
    EmployeeListSerializer,
    EmployeeUpdateSerializer,
    LogoutSerializer,
    ResetPasswordSerializer,
    UserMeSerializer,
    UsernameTokenObtainPairSerializer,
)
from audit_logs.services import record_audit
from core.permissions import IsAdmin
from core.responses import api_response

User = get_user_model()


class LoginView(APIView):
    permission_classes = []

    @extend_schema(request=UsernameTokenObtainPairSerializer, responses={200: UsernameTokenObtainPairSerializer})
    def post(self, request):
        serializer = UsernameTokenObtainPairSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        record_audit(serializer.user, "login", "user", serializer.user.id, "User logged in.", request)
        return api_response("Login successful.", serializer.validated_data)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: UserMeSerializer})
    def get(self, request):
        return api_response("Profile retrieved successfully.", UserMeSerializer(request.user, context={"request": request}).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=ChangePasswordSerializer, responses={200: None})
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return api_response("Password changed successfully.")


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=LogoutSerializer, responses={200: None})
    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return api_response("Refresh token is required.", {"refresh": ["This field is required."]}, status.HTTP_400_BAD_REQUEST, False)
        token = RefreshToken(refresh_token)
        token.blacklist()
        return api_response("Logged out successfully.")


class EmployeeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["department", "job_title", "is_active"]
    search_fields = ["username", "full_name", "email"]
    ordering_fields = ["username", "full_name", "email", "department", "job_title", "date_joined", "is_active"]
    ordering = ["full_name"]

    def get_queryset(self):
        return User.objects.filter(role=User.Role.EMPLOYEE).order_by("full_name")

    def get_serializer_class(self):
        if self.action == "create":
            return EmployeeCreateSerializer
        if self.action in {"update", "partial_update"}:
            return EmployeeUpdateSerializer
        return EmployeeListSerializer

    def perform_create(self, serializer):
        employee = serializer.save()
        record_audit(self.request.user, "employee_created", "user", employee.id, f"Created employee {employee.email}.", self.request)

    def perform_update(self, serializer):
        employee = serializer.save()
        record_audit(self.request.user, "employee_updated", "user", employee.id, f"Updated employee {employee.email}.", self.request)

    def destroy(self, request, *args, **kwargs):
        employee = self.get_object()
        employee.is_active = False
        employee.save(update_fields=["is_active", "updated_at"])
        record_audit(request.user, "employee_deactivated", "user", employee.id, f"Deactivated employee {employee.email}.", request)
        return api_response("Employee deactivated successfully.")

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        employee = self.get_object()
        employee.is_active = True
        employee.save(update_fields=["is_active", "updated_at"])
        record_audit(request.user, "employee_activated", "user", employee.id, f"Activated employee {employee.email}.", request)
        return api_response("Employee activated successfully.", EmployeeListSerializer(employee, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        employee = self.get_object()
        employee.is_active = False
        employee.save(update_fields=["is_active", "updated_at"])
        record_audit(request.user, "employee_deactivated", "user", employee.id, f"Deactivated employee {employee.email}.", request)
        return api_response("Employee deactivated successfully.", EmployeeListSerializer(employee, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        employee = self.get_object()
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        password = serializer.save(employee)
        record_audit(request.user, "employee_password_reset", "user", employee.id, f"Reset password for {employee.email}.", request)
        return api_response("Password reset successfully.", {"temporary_password": password})

    @action(detail=True, methods=["get"])
    def performance(self, request, pk=None):
        employee = self.get_object()
        from reports.services import employee_performance

        return api_response("Employee performance retrieved successfully.", employee_performance(employee, request.query_params))
