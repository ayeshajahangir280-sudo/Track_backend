import re

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils.crypto import get_random_string
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()
USERNAME_RE = re.compile(r"^[a-z0-9_.-]+$")


def generate_temporary_password() -> str:
    return f"Tmp-{get_random_string(12)}1!"


class UserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "full_name", "email", "role", "profile_image")


class UserMeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "full_name",
            "role",
            "phone_number",
            "job_title",
            "department",
            "profile_image",
            "is_active",
            "date_joined",
            "updated_at",
        )
        read_only_fields = fields


class EmployeeListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "full_name",
            "role",
            "phone_number",
            "job_title",
            "department",
            "profile_image",
            "is_active",
            "date_joined",
            "updated_at",
        )


class EmployeeCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, allow_blank=False)
    temporary_password = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "password",
            "temporary_password",
        )

    def validate_username(self, value):
        username = value.strip().lower()
        if not username:
            raise serializers.ValidationError("Username is required.")
        if not USERNAME_RE.fullmatch(username):
            raise serializers.ValidationError("Use only letters, numbers, dots, dashes, and underscores.")
        return username

    def create(self, validated_data):
        username = validated_data["username"]
        password = validated_data["password"]
        user = User.objects.create_user(
            username=username,
            email=f"{username}@willstride.local",
            full_name=username,
            role=User.Role.EMPLOYEE,
            password=password,
        )
        user.temporary_password = password
        return user


class EmployeeUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "username",
            "is_active",
        )

    def validate_username(self, value):
        username = value.strip().lower()
        if not username:
            raise serializers.ValidationError("Username is required.")
        if not USERNAME_RE.fullmatch(username):
            raise serializers.ValidationError("Use only letters, numbers, dots, dashes, and underscores.")
        return username


class UsernameTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        username = (attrs.get("username") or "").strip().lower()
        password = attrs.get("password")
        try:
            self.user = User.objects.get(username__iexact=username)
        except User.DoesNotExist as exc:
            raise serializers.ValidationError("No active account found with the given credentials.") from exc
        if not self.user.check_password(password):
            raise serializers.ValidationError("No active account found with the given credentials.")
        if not self.user.is_active:
            raise serializers.ValidationError("This account is inactive.")

        refresh = self.get_token(self.user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user_id": self.user.id,
            "username": self.user.username,
            "full_name": self.user.full_name,
            "email": self.user.email,
            "role": self.user.role,
            "profile_image": self.context["request"].build_absolute_uri(self.user.profile_image.url)
            if self.user.profile_image
            else None,
        }


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password", "updated_at"])
        return user


class ResetPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=False, validators=[validate_password])

    def save(self, user):
        password = self.validated_data.get("password") or generate_temporary_password()
        user.set_password(password)
        user.save(update_fields=["password", "updated_at"])
        return password


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()
