"""High-level route planning: geocode addresses then compute driving route."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from trips.services.geocoding import GeocodedLocation, GeocodingError, geocode_address
from trips.services.routing import RouteResult, RouteWaypoint, RoutingError, compute_route


@dataclass
class LocationPayload:
    address: str
    lat: float
    lng: float
    display_name: str
    city: str
    state: str
    cached: bool


@dataclass
class RoutePreviewResult:
    locations: dict[str, LocationPayload]
    legs: list[dict[str, Any]]
    total_distance_miles: float
    total_duration_hours: float
    geometry: list[list[float]]

    def to_dict(self) -> dict[str, Any]:
        return {
            "locations": {
                key: asdict(value) for key, value in self.locations.items()
            },
            "legs": self.legs,
            "total_distance_miles": self.total_distance_miles,
            "total_duration_hours": self.total_duration_hours,
            "geometry": self.geometry,
        }


def _location_payload(location: GeocodedLocation) -> LocationPayload:
    return LocationPayload(
        address=location.address,
        lat=location.lat,
        lng=location.lng,
        display_name=location.display_name,
        city=location.city,
        state=location.state,
        cached=location.cached,
    )


def build_route_preview(
    current_location: str,
    pickup_location: str,
    dropoff_location: str,
) -> RoutePreviewResult:
    """Geocode three addresses and compute current → pickup → dropoff route."""
    current = geocode_address(current_location)
    pickup = geocode_address(pickup_location)
    dropoff = geocode_address(dropoff_location)

    route = compute_route(
        [
            RouteWaypoint("current", current.lat, current.lng),
            RouteWaypoint("pickup", pickup.lat, pickup.lng),
            RouteWaypoint("dropoff", dropoff.lat, dropoff.lng),
        ]
    )

    return RoutePreviewResult(
        locations={
            "current": _location_payload(current),
            "pickup": _location_payload(pickup),
            "dropoff": _location_payload(dropoff),
        },
        legs=[
            {
                "from": leg.from_label,
                "to": leg.to_label,
                "distance_miles": leg.distance_miles,
                "duration_hours": leg.duration_hours,
                "geometry": leg.geometry,
            }
            for leg in route.legs
        ],
        total_distance_miles=route.total_distance_miles,
        total_duration_hours=route.total_duration_hours,
        geometry=route.geometry,
    )


__all__ = [
    "GeocodingError",
    "RoutingError",
    "RoutePreviewResult",
    "build_route_preview",
]
