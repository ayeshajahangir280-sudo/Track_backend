from decimal import Decimal

from django.db.models import Sum
from django.utils.dateparse import parse_date

from reports.models import DailyReport


def parse_optional_date(value):
    if not value:
        return None
    return parse_date(value)


def date_range_from_params(params):
    start = parse_optional_date(params.get("date_from"))
    end = parse_optional_date(params.get("date_to"))
    return start, end


def employee_performance(employee, params):
    start, end = date_range_from_params(params)
    reports = DailyReport.objects.filter(employee=employee)
    if start:
        reports = reports.filter(report_date__gte=start)
    if end:
        reports = reports.filter(report_date__lte=end)

    submitted_dates = set(reports.values_list("report_date", flat=True))
    if start and end:
        total_days = (end - start).days + 1
        expected_dates = {start.fromordinal(start.toordinal() + offset) for offset in range(max(total_days, 0))}
        missed = len(expected_dates - submitted_dates)
    else:
        missed = 0

    total_hours = reports.aggregate(total=Sum("time_spent_hours"))["total"] or Decimal("0")
    return {
        "reports_submitted": reports.exclude(status=DailyReport.Status.DRAFT).count(),
        "reports_missed": missed,
        "reports_pending_review": reports.filter(status__in=[DailyReport.Status.SUBMITTED, DailyReport.Status.UNDER_REVIEW]).count(),
        "reports_changes_required": reports.filter(status=DailyReport.Status.CHANGES_REQUIRED).count(),
        "reports_approved": reports.filter(status=DailyReport.Status.APPROVED).count(),
        "total_hours_reported": float(total_hours),
    }
