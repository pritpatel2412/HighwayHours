"""Nominatim geocoding with database caching and rate-limit compliance."""

from __future__ import annotations

import re
import time
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

import requests
from django.conf import settings
from django.db import transaction

from trips.models import GeocodeCache, ReverseGeocodeCache

NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
NOMINATIM_MIN_INTERVAL_SEC = 1.0

_last_nominatim_request_at: float = 0.0


class GeocodingError(Exception):
    """Raised when an address cannot be geocoded."""


@dataclass(frozen=True)
class GeocodedLocation:
    address: str
    lat: float
    lng: float
    display_name: str
    city: str
    state: str
    cached: bool = False


def normalize_query(query: str) -> str:
    return re.sub(r"\s+", " ", query.strip().lower())


def _round_coord(value: float) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


def _wait_for_nominatim_rate_limit() -> None:
    global _last_nominatim_request_at
    elapsed = time.monotonic() - _last_nominatim_request_at
    if elapsed < NOMINATIM_MIN_INTERVAL_SEC:
        time.sleep(NOMINATIM_MIN_INTERVAL_SEC - elapsed)
    _last_nominatim_request_at = time.monotonic()


def _nominatim_headers() -> dict[str, str]:
    return {"User-Agent": settings.NOMINATIM_USER_AGENT}


def _extract_city_state(address: dict[str, Any]) -> tuple[str, str]:
    city = (
        address.get("city")
        or address.get("town")
        or address.get("village")
        or address.get("hamlet")
        or address.get("county")
        or ""
    )
    state = address.get("state") or address.get("region") or ""
    return city, state


def _format_remark(city: str, state: str, display_name: str) -> str:
    if city and state:
        return f"{city}, {state}"
    if city:
        return city
    if state:
        return state
    parts = [part.strip() for part in display_name.split(",") if part.strip()]
    if len(parts) >= 2:
        return f"{parts[0]}, {parts[1]}"
    return display_name or "Unknown location"


def geocode_address(address: str) -> GeocodedLocation:
    """Forward-geocode an address, using DB cache when available."""
    normalized = normalize_query(address)
    if not normalized:
        raise GeocodingError("Address cannot be empty.")

    cached = GeocodeCache.objects.filter(query_normalized=normalized).first()
    if cached:
        return GeocodedLocation(
            address=address,
            lat=cached.lat,
            lng=cached.lng,
            display_name=cached.display_name,
            city=cached.city,
            state=cached.state,
            cached=True,
        )

    _wait_for_nominatim_rate_limit()
    response = requests.get(
        f"{NOMINATIM_BASE}/search",
        params={"q": address, "format": "json", "limit": 1, "addressdetails": 1},
        headers=_nominatim_headers(),
        timeout=30,
    )
    response.raise_for_status()
    results = response.json()

    if not results:
        raise GeocodingError(f"Could not geocode address: {address}")

    result = results[0]
    lat = float(result["lat"])
    lng = float(result["lon"])
    display_name = result.get("display_name", address)
    addr = result.get("address") or {}
    city, state = _extract_city_state(addr)

    with transaction.atomic():
        GeocodeCache.objects.update_or_create(
            query_normalized=normalized,
            defaults={
                "lat": lat,
                "lng": lng,
                "display_name": display_name,
                "city": city,
                "state": state,
                "raw_response": result,
            },
        )

    return GeocodedLocation(
        address=address,
        lat=lat,
        lng=lng,
        display_name=display_name,
        city=city,
        state=state,
        cached=False,
    )


def reverse_geocode(lat: float, lng: float) -> str:
    """Reverse-geocode coordinates to a city/state remark string."""
    lat_key = _round_coord(lat)
    lng_key = _round_coord(lng)

    cached = ReverseGeocodeCache.objects.filter(lat_key=lat_key, lng_key=lng_key).first()
    if cached:
        return cached.remark

    _wait_for_nominatim_rate_limit()
    response = requests.get(
        f"{NOMINATIM_BASE}/reverse",
        params={"lat": lat, "lon": lng, "format": "json", "addressdetails": 1},
        headers=_nominatim_headers(),
        timeout=30,
    )
    response.raise_for_status()
    result = response.json()

    if result.get("error"):
        remark = f"{lat:.4f}, {lng:.4f}"
        city, state = "", ""
        display_name = remark
    else:
        display_name = result.get("display_name", "")
        addr = result.get("address") or {}
        city, state = _extract_city_state(addr)
        remark = _format_remark(city, state, display_name)

    with transaction.atomic():
        ReverseGeocodeCache.objects.update_or_create(
            lat_key=lat_key,
            lng_key=lng_key,
            defaults={
                "remark": remark,
                "city": city,
                "state": state,
                "raw_response": result,
            },
        )

    return remark
