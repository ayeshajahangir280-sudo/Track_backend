from django.contrib.auth import get_user_model
from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from accounts.serializers import UserSummarySerializer
from projects.models import Project, ProjectMember

User = get_user_model()


class ProjectMemberSerializer(serializers.ModelSerializer):
    employee = UserSummarySerializer(read_only=True)
    assigned_by_name = serializers.CharField(source="assigned_by.full_name", read_only=True)

    class Meta:
        model = ProjectMember
        fields = ("id", "project", "employee", "assigned_at", "assigned_by", "assigned_by_name", "is_active")
        read_only_fields = fields


class ProjectListSerializer(serializers.ModelSerializer):
    members_count = serializers.IntegerField(read_only=True)
    is_archived = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = (
            "id",
            "name",
            "client_name",
            "description",
            "start_date",
            "deadline",
            "priority",
            "status",
            "progress_percentage",
            "members_count",
            "is_archived",
            "created_at",
            "updated_at",
            "archived_at",
        )

    @extend_schema_field(serializers.BooleanField)
    def get_is_archived(self, obj):
        return obj.archived_at is not None


class ProjectDetailSerializer(ProjectListSerializer):
    members = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta(ProjectListSerializer.Meta):
        fields = ProjectListSerializer.Meta.fields + ("created_by", "created_by_name", "members")

    @extend_schema_field(ProjectMemberSerializer(many=True))
    def get_members(self, obj):
        qs = obj.memberships.select_related("employee", "assigned_by").filter(is_active=True)
        return ProjectMemberSerializer(qs, many=True, context=self.context).data


class ProjectCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = (
            "name",
            "client_name",
            "description",
            "start_date",
            "deadline",
            "priority",
            "status",
            "progress_percentage",
        )
        extra_kwargs = {
            "client_name": {"required": False, "allow_blank": True},
            "start_date": {"required": False},
            "deadline": {"required": False},
        }

    def validate_progress_percentage(self, value):
        if value > 100:
            raise serializers.ValidationError("Progress percentage cannot exceed 100.")
        return value

    def validate(self, attrs):
        if self.instance is None:
            today = timezone.localdate()
            attrs.setdefault("client_name", "")
            attrs.setdefault("start_date", today)
            attrs.setdefault("deadline", attrs["start_date"])

        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        deadline = attrs.get("deadline", getattr(self.instance, "deadline", None))
        if start and deadline and deadline < start:
            raise serializers.ValidationError({"deadline": "Deadline cannot be before start date."})
        return attrs


class AssignEmployeesSerializer(serializers.Serializer):
    employee_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.Role.EMPLOYEE, is_active=True),
        many=True,
        source="employees",
    )


class RemoveEmployeeSerializer(serializers.Serializer):
    employee_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.Role.EMPLOYEE),
        source="employee",
    )
