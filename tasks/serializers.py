from django.contrib.auth import get_user_model
from rest_framework import serializers

from projects.models import Project, ProjectMember
from tasks.models import Task, TaskStatusHistory

User = get_user_model()


class TaskStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.full_name", read_only=True)

    class Meta:
        model = TaskStatusHistory
        fields = ("id", "task", "old_status", "new_status", "changed_by", "changed_by_name", "notes", "created_at")
        read_only_fields = fields


class TaskListSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    assigned_employee_name = serializers.CharField(source="assigned_employee.full_name", read_only=True)
    assigned_employee_email = serializers.EmailField(source="assigned_employee.email", read_only=True)
    assigned_by_name = serializers.CharField(source="assigned_by.full_name", read_only=True)

    class Meta:
        model = Task
        fields = (
            "id",
            "title",
            "description",
            "project",
            "project_name",
            "assigned_employee",
            "assigned_employee_name",
            "assigned_employee_email",
            "assigned_by",
            "assigned_by_name",
            "assigned_date",
            "due_date",
            "priority",
            "status",
            "admin_instructions",
            "completed_at",
            "approved_by",
            "created_at",
            "updated_at",
        )


class TaskDetailSerializer(TaskListSerializer):
    history = TaskStatusHistorySerializer(many=True, read_only=True)

    class Meta(TaskListSerializer.Meta):
        fields = TaskListSerializer.Meta.fields + ("history",)


class TaskCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = (
            "title",
            "description",
            "project",
            "assigned_employee",
            "assigned_date",
            "due_date",
            "priority",
            "status",
            "admin_instructions",
        )

    def validate_assigned_employee(self, value):
        if value.role != User.Role.EMPLOYEE:
            raise serializers.ValidationError("Tasks can only be assigned to employees.")
        if not value.is_active:
            raise serializers.ValidationError("Assigned employee must be active.")
        return value

    def validate(self, attrs):
        project = attrs.get("project", getattr(self.instance, "project", None))
        employee = attrs.get("assigned_employee", getattr(self.instance, "assigned_employee", None))
        if project and employee and not ProjectMember.objects.filter(project=project, employee=employee, is_active=True).exists():
            raise serializers.ValidationError({"assigned_employee": "Assigned employee must be an active member of the selected project."})
        assigned_date = attrs.get("assigned_date", getattr(self.instance, "assigned_date", None))
        due_date = attrs.get("due_date", getattr(self.instance, "due_date", None))
        if assigned_date and due_date and due_date < assigned_date:
            raise serializers.ValidationError({"due_date": "Due date cannot be before assigned date."})
        return attrs


class TaskStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Task.Status.choices)
    notes = serializers.CharField(required=False, allow_blank=True)


class TaskRequestChangesSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)


class TaskAssignSerializer(serializers.Serializer):
    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all(), required=False)
    assigned_employee = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(role=User.Role.EMPLOYEE, is_active=True))
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        task = self.context["task"]
        project = attrs.get("project", task.project)
        employee = attrs["assigned_employee"]
        if not ProjectMember.objects.filter(project=project, employee=employee, is_active=True).exists():
            raise serializers.ValidationError({"assigned_employee": "Assigned employee must be an active member of the selected project."})
        return attrs
