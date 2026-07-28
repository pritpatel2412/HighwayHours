"""OSRM routing for multi-stop driving routes."""

from __future__ import annotations

from dataclasses import dataclass

import requests
from django.conf import settings

METERS_PER_MILE = 1609.344


class RoutingError(Exception):
    """Raised when OSRM cannot compute a route."""


@dataclass(frozen=True)
class RouteLeg:
    from_label: str
    to_label: str
    distance_miles: float
    duration_hours: float
    geometry: list[list[float]]


@dataclass(frozen=True)
class RouteResult:
    legs: list[RouteLeg]
    total_distance_miles: float
    total_duration_hours: float
    geometry: list[list[float]]


@dataclass(frozen=True)
class RouteWaypoint:
    label: str
    lat: float
    lng: float


def _meters_to_miles(meters: float) -> float:
    return round(meters / METERS_PER_MILE, 2)


def _seconds_to_hours(seconds: float) -> float:
    return round(seconds / 3600, 2)


def _geojson_to_latlng(coords: list[list[float]]) -> list[list[float]]:
    """Convert GeoJSON [lng, lat] coordinates to [lat, lng] for Leaflet."""
    return [[point[1], point[0]] for point in coords]


def _fetch_leg(from_wp: RouteWaypoint, to_wp: RouteWaypoint) -> RouteLeg:
    base_url = settings.OSRM_BASE_URL.rstrip("/")
    coord_str = f"{from_wp.lng},{from_wp.lat};{to_wp.lng},{to_wp.lat}"
    url = f"{base_url}/route/v1/driving/{coord_str}"

    response = requests.get(
        url,
        params={"overview": "full", "geometries": "geojson", "steps": "false"},
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()

    if payload.get("code") != "Ok" or not payload.get("routes"):
        message = payload.get("message", "Unknown routing error")
        raise RoutingError(f"OSRM routing failed: {message}")

    route = payload["routes"][0]
    leg_data = route["legs"][0]
    geometry = _geojson_to_latlng(route["geometry"]["coordinates"])

    return RouteLeg(
        from_label=from_wp.label,
        to_label=to_wp.label,
        distance_miles=_meters_to_miles(leg_data["distance"]),
        duration_hours=_seconds_to_hours(leg_data["duration"]),
        geometry=geometry,
    )


def _merge_geometries(legs: list[RouteLeg]) -> list[list[float]]:
    if not legs:
        return []

    merged = list(legs[0].geometry)
    for leg in legs[1:]:
        if leg.geometry:
            merged.extend(leg.geometry[1:])
    return merged


def compute_route(waypoints: list[RouteWaypoint]) -> RouteResult:
    """Compute a driving route through ordered waypoints via OSRM."""
    if len(waypoints) < 2:
        raise RoutingError("At least two waypoints are required.")

    legs = [
        _fetch_leg(waypoints[index], waypoints[index + 1])
        for index in range(len(waypoints) - 1)
    ]

    total_distance = round(sum(leg.distance_miles for leg in legs), 2)
    total_duration = round(sum(leg.duration_hours for leg in legs), 2)

    return RouteResult(
        legs=legs,
        total_distance_miles=total_distance,
        total_duration_hours=total_duration,
        geometry=_merge_geometries(legs),
    )
