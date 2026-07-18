from rest_framework.response import Response


def api_response(message: str, data=None, status_code: int = 200, success: bool = True):
    return Response(
        {
            "success": success,
            "message": message,
            "data": data if data is not None else {},
        },
        status=status_code,
    )
