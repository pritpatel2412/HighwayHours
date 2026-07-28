from django.db import connection
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def health_check(request):
    """Verify API and database connectivity."""
    db_ok = False
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            db_ok = cursor.fetchone()[0] == 1
    except Exception as exc:
        return Response(
            {"status": "error", "database": str(exc)},
            status=503,
        )

    return Response({"status": "ok", "database": "connected" if db_ok else "disconnected"})
