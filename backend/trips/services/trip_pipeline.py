"""Full trip pipeline: geocode → route → HOS simulation → persist."""

from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timezone

from django.db import transaction

from trips.hos_engine import LegInput, simulate_hos_trip
from trips.models import DailyLog, DutyEvent, RouteStop, Trip
from trips.services.geocoding import geocode_address, reverse_geocode
from trips.services.route_planner import build_route_preview


def _remark_resolver(lat: float, lng: float) -> str:
    return reverse_geocode(lat, lng)


def create_trip(
    current_location: str,
    pickup_location: str,
    dropoff_location: str,
    current_cycle_used: float,
) -> Trip:
    route = build_route_preview(current_location, pickup_location, dropoff_location)
    start_time = datetime.now(timezone.utc)

    legs = []
    for leg in route.legs:
        label = f"{leg['from']}_to_{leg['to']}" if leg["from"] != "current" else "current_to_pickup"
        if leg["from"] == "pickup" and leg["to"] == "dropoff":
            label = "pickup_to_dropoff"
        end_key = leg["to"]
        end_loc = route.locations[end_key]
        legs.append(
            LegInput(
                label=label,
                distance_miles=leg["distance_miles"],
                duration_hours=leg["duration_hours"],
                end_lat=end_loc["lat"],
                end_lng=end_loc["lng"],
                end_remark=f"{end_loc['city']}, {end_loc['state']}".strip(", "),
            )
        )

    simulation = simulate_hos_trip(
        start_time=start_time,
        current_cycle_used_hrs=current_cycle_used,
        geometry=route.geometry,
        total_distance_miles=route.total_distance_miles,
        legs=legs,
        remark_fn=_remark_resolver,
    )

    total_duration_hours = (
        (simulation.events[-1].end_datetime - start_time).total_seconds() / 3600
        if simulation.events
        else 0
    )

    with transaction.atomic():
        trip = Trip.objects.create(
            current_location=current_location,
            pickup_location=pickup_location,
            dropoff_location=dropoff_location,
            current_cycle_used=current_cycle_used,
            start_time=start_time,
            total_distance_miles=route.total_distance_miles,
            total_driving_hours=simulation.total_driving_hours,
            total_duration_hours=round(total_duration_hours, 2),
            num_days=simulation.num_days,
            cycle_restart_required=simulation.cycle_restart_required,
            locations=route.locations,
            route_geometry=route.geometry,
            summary={
                "total_distance_miles": route.total_distance_miles,
                "total_driving_hours": simulation.total_driving_hours,
                "total_on_duty_hours": simulation.total_on_duty_hours,
                "total_duration_hours": round(total_duration_hours, 2),
                "num_days": simulation.num_days,
                "cycle_restart_required": simulation.cycle_restart_required,
            },
        )

        RouteStop.objects.bulk_create(
            [
                RouteStop(
                    trip=trip,
                    stop_type=stop.stop_type,
                    sequence=stop.sequence,
                    lat=stop.lat,
                    lng=stop.lng,
                    remark=stop.remark,
                    duration_minutes=stop.duration_minutes,
                    mile_marker=stop.mile_marker,
                    scheduled_at=stop.scheduled_at,
                )
                for stop in simulation.route_stops
            ]
        )

        DutyEvent.objects.bulk_create(
            [
                DutyEvent(
                    trip=trip,
                    sequence=index + 1,
                    status=event.status.value,
                    start_datetime=event.start_datetime,
                    end_datetime=event.end_datetime,
                    lat=event.lat,
                    lng=event.lng,
                    remark=event.remark,
                    mile_marker=event.mile_marker,
                    stop_reason=event.stop_reason,
                )
                for index, event in enumerate(simulation.events)
            ]
        )

        DailyLog.objects.bulk_create(
            [
                DailyLog(
                    trip=trip,
                    day_number=log.day_number,
                    log_date=log.log_date,
                    period_start=log.period_start,
                    period_end=log.period_end,
                    total_miles=log.total_miles,
                    segments=log.segments,
                    totals=log.totals,
                    remarks=log.remarks,
                )
                for log in simulation.daily_logs
            ]
        )

    return trip


def serialize_trip(trip: Trip) -> dict:
    return {
        "id": str(trip.id),
        "current_location": trip.current_location,
        "pickup_location": trip.pickup_location,
        "dropoff_location": trip.dropoff_location,
        "current_cycle_used": float(trip.current_cycle_used),
        "start_time": trip.start_time.isoformat(),
        "created_at": trip.created_at.isoformat(),
        "summary": trip.summary,
        "locations": trip.locations,
        "route_geometry": trip.route_geometry,
        "cycle_restart_required": trip.cycle_restart_required,
        "stops": [
            {
                "stop_type": stop.stop_type,
                "sequence": stop.sequence,
                "lat": stop.lat,
                "lng": stop.lng,
                "remark": stop.remark,
                "duration_minutes": stop.duration_minutes,
                "mile_marker": stop.mile_marker,
                "scheduled_at": stop.scheduled_at.isoformat(),
            }
            for stop in trip.stops.all()
        ],
        "duty_events": [
            {
                "sequence": event.sequence,
                "status": event.status,
                "start_datetime": event.start_datetime.isoformat(),
                "end_datetime": event.end_datetime.isoformat(),
                "lat": event.lat,
                "lng": event.lng,
                "remark": event.remark,
                "mile_marker": event.mile_marker,
                "stop_reason": event.stop_reason,
            }
            for event in trip.duty_events.all()
        ],
        "daily_logs": [
            {
                "day_number": log.day_number,
                "log_date": log.log_date.isoformat(),
                "period_start": log.period_start.isoformat(),
                "period_end": log.period_end.isoformat(),
                "total_miles": log.total_miles,
                "segments": log.segments,
                "totals": log.totals,
                "remarks": log.remarks,
            }
            for log in trip.daily_logs.all()
        ],
    }
