from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import (
    ChangePasswordView,
    EmployeeViewSet,
    LoginView,
    LogoutView,
    MeView,
)
from audit_logs.views import AuditLogViewSet
from core.views import AdminDashboardView, EmployeeDashboardView
from notifications.views import NotificationViewSet
from projects.views import ProjectViewSet
from reports.views import DailyReportViewSet, ReportCommentListCreateView, ReportCommentViewSet


router = DefaultRouter()
router.register("employees", EmployeeViewSet, basename="employees")
router.register("projects", ProjectViewSet, basename="projects")
router.register("reports", DailyReportViewSet, basename="reports")
router.register("report-comments", ReportCommentViewSet, basename="report-comments")
router.register("notifications", NotificationViewSet, basename="notifications")
router.register("audit-logs", AuditLogViewSet, basename="audit-logs")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/login/", LoginView.as_view(), name="auth-login"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("api/auth/me/", MeView.as_view(), name="auth-me"),
    path("api/auth/change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("api/auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("api/dashboard/admin/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("api/dashboard/employee/", EmployeeDashboardView.as_view(), name="employee-dashboard"),
    path("api/reports/export/", DailyReportViewSet.as_view({"get": "export"}), name="reports-export"),
    path("api/reports/<int:report_id>/comments/", ReportCommentListCreateView.as_view(), name="report-comments"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    path("api/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
