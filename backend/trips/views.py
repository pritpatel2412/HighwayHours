import requests
from django.db import connection
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from trips.models import Trip
from trips.serializers import RoutePreviewSerializer, TripCreateSerializer
from trips.services.geocoding import GeocodingError
from trips.services.route_planner import build_route_preview
from trips.services.routing import RoutingError
from trips.services.trip_pipeline import create_trip, serialize_trip


@api_view(["GET"])
def health_check(request):
    """Verify API and database connectivity."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            db_ok = cursor.fetchone()[0] == 1
    except Exception as exc:
        return Response({"status": "error", "database": str(exc)}, status=503)

    return Response({"status": "ok", "database": "connected" if db_ok else "disconnected"})


@api_view(["POST"])
def route_preview(request):
    """Geocode three addresses and return route geometry + distance summary."""
    serializer = RoutePreviewSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        result = build_route_preview(
            current_location=serializer.validated_data["current_location"],
            pickup_location=serializer.validated_data["pickup_location"],
            dropoff_location=serializer.validated_data["dropoff_location"],
        )
    except GeocodingError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except RoutingError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
    except requests.RequestException as exc:
        return Response({"detail": f"External service error: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)

    return Response(result.to_dict())


@api_view(["GET", "POST"])
def trip_list_create(request):
    if request.method == "GET":
        trips = Trip.objects.all()[:20]
        return Response(
            [
                {
                    "id": str(trip.id),
                    "current_location": trip.current_location,
                    "dropoff_location": trip.dropoff_location,
                    "total_distance_miles": trip.total_distance_miles,
                    "num_days": trip.num_days,
                    "created_at": trip.created_at.isoformat(),
                }
                for trip in trips
            ]
        )

    serializer = TripCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        trip = create_trip(
            current_location=serializer.validated_data["current_location"],
            pickup_location=serializer.validated_data["pickup_location"],
            dropoff_location=serializer.validated_data["dropoff_location"],
            current_cycle_used=float(serializer.validated_data["current_cycle_used"]),
        )
    except GeocodingError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except RoutingError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
    except requests.RequestException as exc:
        return Response({"detail": f"External service error: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)

    return Response(serialize_trip(trip), status=status.HTTP_201_CREATED)


@api_view(["GET"])
def trip_detail(request, trip_id):
    trip = get_object_or_404(Trip, id=trip_id)
    return Response(serialize_trip(trip))
