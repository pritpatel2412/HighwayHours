"""
URL configuration for config project.
"""

from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def root_health_check(request):
    return JsonResponse(
        {
            "status": "ok",
            "app": "HighwayHours API",
            "version": "1.0.0",
            "endpoints": {
                "health": "/",
                "api": "/api/",
                "admin": "/admin/",
            },
        }
    )


urlpatterns = [
    path("", root_health_check, name="root-health-check"),
    path("admin/", admin.site.urls),
    path("api/", include("trips.urls")),
]

