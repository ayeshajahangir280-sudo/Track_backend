from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from notifications.models import Notification
from projects.models import Project, ProjectMember
from reports.models import DailyReport, ReportComment

User = get_user_model()


@override_settings(MEDIA_ROOT="test_media", ALLOWED_HOSTS=["testserver", "127.0.0.1", "localhost"])
class BackendAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="AdminPass123!",
            full_name="Admin User",
        )
        self.employee = User.objects.create_user(
            username="employee",
            email="employee@example.com",
            password="EmployeePass123!",
            full_name="Employee One",
            role=User.Role.EMPLOYEE,
            department="Engineering",
            job_title="Developer",
        )
        self.other_employee = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="EmployeePass123!",
            full_name="Employee Two",
            role=User.Role.EMPLOYEE,
            department="Design",
            job_title="Designer",
        )
        self.project = Project.objects.create(
            name="Project Alpha",
            client_name="Client A",
            description="Important work",
            start_date=date.today() - timedelta(days=3),
            deadline=date.today() + timedelta(days=7),
            priority=Project.Priority.HIGH,
            status=Project.Status.ACTIVE,
            created_by=self.admin,
        )
        ProjectMember.objects.create(project=self.project, employee=self.employee, assigned_by=self.admin)

    def auth_as(self, user):
        self.client.force_authenticate(user=user)

    def create_report(self, **overrides):
        payload = {
            "employee": self.employee,
            "report_date": date.today(),
            "project": self.project,
            "work_completed": "Completed setup",
            "time_spent_hours": 4,
            "status": DailyReport.Status.SUBMITTED,
            "submitted_at": timezone.now(),
        }
        payload.update(overrides)
        return DailyReport.objects.create(**payload)

    def test_login_and_me(self):
        response = self.client.post("/api/auth/login/", {"username": self.employee.username, "password": "EmployeePass123!"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data["data"])
        self.auth_as(self.employee)
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, status.HTTP_200_OK)
        self.assertEqual(me.data["data"]["username"], self.employee.username)
        self.assertEqual(me.data["data"]["email"], self.employee.email)

    def test_admin_can_create_employee_but_employee_cannot_list(self):
        self.auth_as(self.employee)
        denied = self.client.get("/api/employees/")
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)
        self.auth_as(self.admin)
        created = self.client.post(
            "/api/employees/",
            {
                "username": "newemployee",
                "password": "StrongPass123!",
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["username"], "newemployee")

    def test_employee_data_isolation_for_reports(self):
        report = self.create_report()
        self.auth_as(self.other_employee)
        self.assertEqual(self.client.get(f"/api/reports/{report.id}/").status_code, status.HTTP_404_NOT_FOUND)

    def test_project_assignment_endpoint(self):
        self.auth_as(self.admin)
        response = self.client.post(f"/api/projects/{self.project.id}/assign-employees/", {"employee_ids": [self.other_employee.id]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(ProjectMember.objects.filter(project=self.project, employee=self.other_employee, is_active=True).exists())

    def test_admin_can_create_project_with_simple_payload(self):
        self.auth_as(self.admin)
        response = self.client.post(
            "/api/projects/",
            {
                "name": "Simple Project",
                "description": "Created without client or dates",
                "priority": Project.Priority.MEDIUM,
                "status": Project.Status.PLANNING,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        project = Project.objects.get(name="Simple Project")
        self.assertEqual(project.client_name, "")
        self.assertEqual(project.start_date, date.today())
        self.assertEqual(project.deadline, date.today())

    def test_employee_can_submit_simple_daily_report(self):
        self.auth_as(self.employee)
        response = self.client.post(
            "/api/reports/",
            {
                "report_date": date.today(),
                "project": self.project.id,
                "work_completed": "Prepared event checklist and vendor notes.",
                "time_spent_hours": 5,
                "status": DailyReport.Status.SUBMITTED,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        report = DailyReport.objects.get(id=response.data["data"]["id"])
        self.assertIsNone(report.task)
        self.assertEqual(report.employee, self.employee)
        self.assertEqual(report.status, DailyReport.Status.SUBMITTED)

    def test_daily_report_unique_date_validation(self):
        self.create_report()
        self.auth_as(self.employee)
        response = self.client.post(
            "/api/reports/",
            {
                "report_date": date.today(),
                "project": self.project.id,
                "work_completed": "More work",
                "time_spent_hours": 1,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_employee_cannot_edit_approved_report(self):
        report = self.create_report(status=DailyReport.Status.APPROVED, reviewed_by=self.admin, reviewed_at=timezone.now())
        self.auth_as(self.employee)
        response = self.client.patch(f"/api/reports/{report.id}/", {"work_completed": "Changed"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_comments_and_employee_read_access(self):
        report = self.create_report()
        self.auth_as(self.admin)
        created = self.client.post(
            f"/api/reports/{report.id}/comments/",
            {"comment": "Please add exact venue setup notes.", "comment_type": ReportComment.Type.FEEDBACK},
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.auth_as(self.employee)
        read = self.client.get(f"/api/reports/{report.id}/comments/")
        self.assertEqual(read.status_code, status.HTTP_200_OK)
        self.auth_as(self.other_employee)
        self.assertEqual(self.client.get(f"/api/reports/{report.id}/comments/").status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_can_mark_report_status(self):
        report = self.create_report(status=DailyReport.Status.SUBMITTED)
        self.auth_as(self.admin)
        reviewed = self.client.post(f"/api/reports/{report.id}/mark-reviewed/", {}, format="json")
        self.assertEqual(reviewed.status_code, status.HTTP_200_OK)
        report.refresh_from_db()
        self.assertEqual(report.status, DailyReport.Status.REVIEWED)
        approved = self.client.post(f"/api/reports/{report.id}/approve/", {}, format="json")
        self.assertEqual(approved.status_code, status.HTTP_200_OK)
        report.refresh_from_db()
        self.assertEqual(report.status, DailyReport.Status.APPROVED)
        self.assertTrue(Notification.objects.filter(recipient=self.employee, notification_type=Notification.Type.REPORT_APPROVED).exists())

    def test_dashboard_endpoints(self):
        self.create_report()
        self.auth_as(self.admin)
        self.assertEqual(self.client.get("/api/dashboard/admin/").status_code, status.HTTP_200_OK)
        self.auth_as(self.employee)
        self.assertEqual(self.client.get("/api/dashboard/employee/").status_code, status.HTTP_200_OK)

    def test_report_export_csv_and_excel(self):
        self.create_report()
        self.auth_as(self.admin)
        csv_response = self.client.get("/api/reports/export/?format=csv")
        self.assertEqual(csv_response.status_code, status.HTTP_200_OK)
        self.assertEqual(csv_response["Content-Type"], "text/csv")
        self.assertIn("Description", csv_response.content.decode())
        xlsx_response = self.client.get("/api/reports/export/?format=xlsx")
        self.assertEqual(xlsx_response.status_code, status.HTTP_200_OK)
        self.assertIn("spreadsheetml", xlsx_response["Content-Type"])
