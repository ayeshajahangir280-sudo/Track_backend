from django_filters import rest_framework as filters

from reports.models import DailyReport


class DailyReportFilter(filters.FilterSet):
    department = filters.CharFilter(field_name="employee__department", lookup_expr="iexact")
    date_from = filters.DateFilter(field_name="report_date", lookup_expr="gte")
    date_to = filters.DateFilter(field_name="report_date", lookup_expr="lte")
    reviewed = filters.BooleanFilter(method="filter_reviewed")

    class Meta:
        model = DailyReport
        fields = ["employee", "project", "department", "report_date", "date_from", "date_to", "status", "reviewed"]

    def filter_reviewed(self, queryset, name, value):
        if value:
            return queryset.filter(reviewed_at__isnull=False)
        return queryset.filter(reviewed_at__isnull=True)
