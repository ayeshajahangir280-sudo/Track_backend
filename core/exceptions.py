from rest_framework.views import exception_handler


def first_error(detail):
    if isinstance(detail, dict):
        for field, value in detail.items():
            message = first_error(value)
            if message:
                return f"{field}: {message}" if field not in {"detail", "non_field_errors"} else message
    if isinstance(detail, list) and detail:
        return first_error(detail[0])
    if detail:
        return str(detail)
    return ""


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return None

    detail = response.data
    message = "Request failed."
    if isinstance(detail, dict):
        if "detail" in detail:
            message = str(detail["detail"])
        elif "non_field_errors" in detail:
            message = " ".join(str(item) for item in detail["non_field_errors"])
        else:
            message = first_error(detail) or "Please correct the highlighted fields."

    response.data = {
        "success": False,
        "message": message,
        "errors": detail,
    }
    return response
