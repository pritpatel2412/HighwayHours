from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health_check, name="health-check"),
    path("route/preview/", views.route_preview, name="route-preview"),
    path("trips/", views.trip_list_create, name="trip-list-create"),
    path("trips/<uuid:trip_id>/", views.trip_detail, name="trip-detail"),
]
