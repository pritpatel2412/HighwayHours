"""FMCSA Hours-of-Service discrete-event simulation engine."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Callable, Iterable

MAX_DRIVING_PER_SHIFT_HRS = 11
MAX_DUTY_WINDOW_HRS = 14
REQUIRED_BREAK_AFTER_HRS = 8
REQUIRED_BREAK_MINUTES = 30
REQUIRED_OFF_DUTY_HRS = 10
CYCLE_LIMIT_HRS = 70
RESTART_HRS = 34
FUEL_INTERVAL_MILES = 1000
FUEL_STOP_MINUTES = 30
PICKUP_DUTY_MINUTES = 60
DROPOFF_DUTY_MINUTES = 60

METERS_PER_MILE = 1609.344


class DutyStatus(str, Enum):
    OFF_DUTY = "OFF_DUTY"
    SLEEPER_BERTH = "SLEEPER_BERTH"
    DRIVING = "DRIVING"
    ON_DUTY_NOT_DRIVING = "ON_DUTY_NOT_DRIVING"


@dataclass(frozen=True)
class DutyEvent:
    status: DutyStatus
    start_datetime: datetime
    end_datetime: datetime
    lat: float
    lng: float
    remark: str
    mile_marker: float | None = None
    stop_reason: str | None = None


@dataclass(frozen=True)
class RoutePoint:
    lat: float
    lng: float
    mile: float


@dataclass(frozen=True)
class LegInput:
    label: str
    distance_miles: float
    duration_hours: float
    end_lat: float
    end_lng: float
    end_remark: str


@dataclass
class PlannedDrive:
    start_mile: float
    end_mile: float
    duration_minutes: float
    remaining_minutes: float


@dataclass
class PlannedDuty:
    kind: str
    duration_minutes: float
    lat: float
    lng: float
    remark: str
    mile_marker: float | None = None


PlannedActivity = PlannedDrive | PlannedDuty


@dataclass
class DailyLogSheet:
    day_number: int
    log_date: datetime
    period_start: datetime
    period_end: datetime
    segments: list[dict]
    totals: dict[str, float]
    remarks: list[dict]
    total_miles: float


@dataclass
class RouteStop:
    stop_type: str
    lat: float
    lng: float
    remark: str
    duration_minutes: float
    mile_marker: float | None
    scheduled_at: datetime
    sequence: int


@dataclass
class SimulationResult:
    events: list[DutyEvent]
    daily_logs: list[DailyLogSheet]
    route_stops: list[RouteStop]
    cycle_restart_required: bool
    total_driving_hours: float
    total_on_duty_hours: float
    num_days: int


RemarkFn = Callable[[float, float], str]


def _minutes(value_hours: float) -> float:
    return value_hours * 60


def haversine_miles(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius_m = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return (2 * radius_m * math.atan2(math.sqrt(a), math.sqrt(1 - a))) / METERS_PER_MILE


def build_route_profile(geometry: list[list[float]], total_distance_miles: float) -> list[RoutePoint]:
    if not geometry:
        return []

    raw_miles = [0.0]
    for index in range(1, len(geometry)):
        lat1, lng1 = geometry[index - 1]
        lat2, lng2 = geometry[index]
        raw_miles.append(raw_miles[-1] + haversine_miles(lat1, lng1, lat2, lng2))

    raw_total = raw_miles[-1] or 1.0
    scale = total_distance_miles / raw_total
    return [
        RoutePoint(lat=geometry[index][0], lng=geometry[index][1], mile=raw_miles[index] * scale)
        for index in range(len(geometry))
    ]


def interpolate_route(profile: list[RoutePoint], mile: float) -> tuple[float, float]:
    if not profile:
        return 0.0, 0.0
    if mile <= profile[0].mile:
        return profile[0].lat, profile[0].lng
    if mile >= profile[-1].mile:
        return profile[-1].lat, profile[-1].lng

    for index in range(1, len(profile)):
        if profile[index].mile >= mile:
            prev_point = profile[index - 1]
            next_point = profile[index]
            span = next_point.mile - prev_point.mile
            ratio = 0 if span == 0 else (mile - prev_point.mile) / span
            lat = prev_point.lat + (next_point.lat - prev_point.lat) * ratio
            lng = prev_point.lng + (next_point.lng - prev_point.lng) * ratio
            return lat, lng

    return profile[-1].lat, profile[-1].lng


def _split_drive_with_fuel(
    start_mile: float,
    end_mile: float,
    duration_minutes: float,
    fuel_marks: Iterable[float],
) -> list[PlannedActivity]:
    segments: list[PlannedActivity] = []
    marks = [mark for mark in fuel_marks if start_mile < mark < end_mile]
    cursor = start_mile
    drive_minutes_per_mile = duration_minutes / max(end_mile - start_mile, 0.001)

    for mark in marks:
        if mark > cursor:
            segment_miles = mark - cursor
            segments.append(
                PlannedDrive(
                    start_mile=cursor,
                    end_mile=mark,
                    duration_minutes=segment_miles * drive_minutes_per_mile,
                    remaining_minutes=segment_miles * drive_minutes_per_mile,
                )
            )
        segments.append(
            PlannedDuty(
                kind="fuel",
                duration_minutes=FUEL_STOP_MINUTES,
                lat=0.0,
                lng=0.0,
                remark="Fuel stop",
                mile_marker=mark,
            )
        )
        cursor = mark

    if cursor < end_mile:
        segment_miles = end_mile - cursor
        segments.append(
            PlannedDrive(
                start_mile=cursor,
                end_mile=end_mile,
                duration_minutes=segment_miles * drive_minutes_per_mile,
                remaining_minutes=segment_miles * drive_minutes_per_mile,
            )
        )

    return segments


def build_planned_activities(
    legs: list[LegInput],
    total_distance_miles: float,
) -> list[PlannedActivity]:
    fuel_marks = [
        interval * FUEL_INTERVAL_MILES
        for interval in range(1, int(total_distance_miles // FUEL_INTERVAL_MILES) + 1)
    ]

    planned: list[PlannedActivity] = []
    mile_cursor = 0.0

    for index, leg in enumerate(legs):
        end_mile = mile_cursor + leg.distance_miles
        drive_minutes = leg.duration_hours * 60
        planned.extend(_split_drive_with_fuel(mile_cursor, end_mile, drive_minutes, fuel_marks))
        mile_cursor = end_mile

        if leg.label == "current_to_pickup":
            planned.append(
                PlannedDuty(
                    kind="pickup",
                    duration_minutes=PICKUP_DUTY_MINUTES,
                    lat=leg.end_lat,
                    lng=leg.end_lng,
                    remark=leg.end_remark,
                    mile_marker=end_mile,
                )
            )
        elif leg.label == "pickup_to_dropoff":
            planned.append(
                PlannedDuty(
                    kind="dropoff",
                    duration_minutes=DROPOFF_DUTY_MINUTES,
                    lat=leg.end_lat,
                    lng=leg.end_lng,
                    remark=leg.end_remark,
                    mile_marker=end_mile,
                )
            )

    return planned


@dataclass
class _ShiftState:
    active: bool = False
    shift_start: datetime | None = None
    driving_minutes: float = 0.0
    break_taken: bool = False


@dataclass
class _SimulatorState:
    now: datetime
    shift: _ShiftState = field(default_factory=_ShiftState)
    baseline_cycle_minutes: float = 0.0
    on_duty_history: list[tuple[datetime, float]] = field(default_factory=list)
    cycle_restart_required: bool = False


class HOSSimulator:
    def __init__(
        self,
        start_time: datetime,
        current_cycle_used_hrs: float,
        profile: list[RoutePoint],
        remark_fn: RemarkFn,
    ):
        self.start_time = start_time
        self.profile = profile
        self.remark_fn = remark_fn
        self.state = _SimulatorState(
            now=start_time,
            baseline_cycle_minutes=current_cycle_used_hrs * 60,
        )
        self.events: list[DutyEvent] = []

    def _position_at_mile(self, mile: float) -> tuple[float, float]:
        return interpolate_route(self.profile, mile)

    def _remark_at_mile(self, mile: float) -> str:
        lat, lng = self._position_at_mile(mile)
        return self.remark_fn(lat, lng)

    def _rolling_cycle_minutes(self) -> float:
        window_start = self.state.now - timedelta(days=8)
        trip_total = 0.0
        for started_at, duration in self.state.on_duty_history:
            if started_at >= window_start:
                trip_total += duration
        return self.state.baseline_cycle_minutes + trip_total

    def _would_exceed_cycle(self, on_duty_minutes: float) -> bool:
        return self._rolling_cycle_minutes() + on_duty_minutes > _minutes(CYCLE_LIMIT_HRS)

    def _record_on_duty(self, minutes: float) -> None:
        if minutes <= 0:
            return
        self.state.on_duty_history.append((self.state.now, minutes))

    def _append_event(
        self,
        status: DutyStatus,
        duration_minutes: float,
        lat: float,
        lng: float,
        remark: str,
        mile_marker: float | None = None,
        stop_reason: str | None = None,
    ) -> None:
        if duration_minutes <= 0:
            return
        start = self.state.now
        end = start + timedelta(minutes=duration_minutes)
        self.events.append(
            DutyEvent(
                status=status,
                start_datetime=start,
                end_datetime=end,
                lat=lat,
                lng=lng,
                remark=remark,
                mile_marker=mile_marker,
                stop_reason=stop_reason,
            )
        )
        if status in (DutyStatus.DRIVING, DutyStatus.ON_DUTY_NOT_DRIVING):
            self._record_on_duty(duration_minutes)
        self.state.now = end

    def _start_shift(self, lat: float, lng: float, remark: str) -> None:
        self.state.shift = _ShiftState(active=True, shift_start=self.state.now)

    def _reset_shift(self) -> None:
        self.state.shift = _ShiftState()

    def _shift_elapsed_minutes(self) -> float:
        if not self.state.shift.active or not self.state.shift.shift_start:
            return 0.0
        return (self.state.now - self.state.shift.shift_start).total_seconds() / 60

    def _ensure_cycle_restart(self, lat: float, lng: float, remark: str) -> None:
        self._append_event(
            DutyStatus.OFF_DUTY,
            _minutes(RESTART_HRS),
            lat,
            lng,
            remark,
            stop_reason="34hr_cycle_restart",
        )
        self.state.baseline_cycle_minutes = 0.0
        self.state.on_duty_history.clear()
        self.state.cycle_restart_required = True
        self._reset_shift()

    def _ensure_off_duty_reset(self, lat: float, lng: float, remark: str) -> None:
        self._append_event(
            DutyStatus.OFF_DUTY,
            _minutes(REQUIRED_OFF_DUTY_HRS),
            lat,
            lng,
            remark,
            stop_reason="10hr_reset",
        )
        self._reset_shift()

    def _ensure_break(self, lat: float, lng: float, remark: str) -> None:
        if self.state.shift.break_taken:
            return
        if self.state.shift.driving_minutes < _minutes(REQUIRED_BREAK_AFTER_HRS):
            return
        self._append_event(
            DutyStatus.OFF_DUTY,
            REQUIRED_BREAK_MINUTES,
            lat,
            lng,
            remark,
            stop_reason="30min_break",
        )
        self.state.shift.break_taken = True

    def _minutes_until_limits(self) -> float:
        remaining_drive = _minutes(MAX_DRIVING_PER_SHIFT_HRS) - self.state.shift.driving_minutes
        remaining_window = _minutes(MAX_DUTY_WINDOW_HRS) - self._shift_elapsed_minutes()
        return max(0.0, min(remaining_drive, remaining_window))

    def _drive_chunk(
        self,
        drive: PlannedDrive,
        lat: float,
        lng: float,
        remark: str,
    ) -> None:
        while drive.remaining_minutes > 0:
            if self._would_exceed_cycle(drive.remaining_minutes):
                self._ensure_cycle_restart(lat, lng, remark)
                lat, lng = self._position_at_mile(drive.start_mile + (
                    drive.end_mile - drive.start_mile
                ) * (1 - drive.remaining_minutes / max(drive.duration_minutes, 0.001)))
                remark = self.remark_fn(lat, lng)

            if not self.state.shift.active:
                self._start_shift(lat, lng, remark)

            self._ensure_break(lat, lng, remark)

            limit = self._minutes_until_limits()
            if limit <= 0:
                self._ensure_off_duty_reset(lat, lng, remark)
                lat, lng = self._position_at_mile(
                    drive.end_mile
                    - (drive.remaining_minutes / max(drive.duration_minutes, 0.001))
                    * (drive.end_mile - drive.start_mile)
                )
                remark = self.remark_fn(lat, lng)
                continue

            chunk = min(drive.remaining_minutes, limit)
            progress_ratio = 1 - (drive.remaining_minutes - chunk) / max(drive.duration_minutes, 0.001)
            end_ratio = 1 - (drive.remaining_minutes - chunk) / max(drive.duration_minutes, 0.001)
            start_mile = drive.start_mile + (drive.end_mile - drive.start_mile) * (
                1 - drive.remaining_minutes / max(drive.duration_minutes, 0.001)
            )
            end_mile = drive.start_mile + (drive.end_mile - drive.start_mile) * end_ratio
            chunk_lat, chunk_lng = self._position_at_mile((start_mile + end_mile) / 2)
            chunk_remark = self.remark_fn(chunk_lat, chunk_lng)

            self._append_event(
                DutyStatus.DRIVING,
                chunk,
                chunk_lat,
                chunk_lng,
                chunk_remark,
                mile_marker=(start_mile + end_mile) / 2,
            )
            self.state.shift.driving_minutes += chunk
            drive.remaining_minutes -= chunk

            if self._minutes_until_limits() <= 0 and drive.remaining_minutes > 0:
                reset_lat, reset_lng = self._position_at_mile(end_mile)
                self._ensure_off_duty_reset(reset_lat, reset_lng, self.remark_fn(reset_lat, reset_lng))

    def _fixed_duty(self, duty: PlannedDuty) -> None:
        lat, lng = duty.lat, duty.lng
        remark = duty.remark
        if duty.mile_marker is not None and duty.kind == "fuel":
            lat, lng = self._position_at_mile(duty.mile_marker)
            remark = self.remark_fn(lat, lng)

        if self._would_exceed_cycle(duty.duration_minutes):
            self._ensure_cycle_restart(lat, lng, remark)
            lat, lng = duty.lat, duty.lng
            if duty.mile_marker is not None and duty.kind == "fuel":
                lat, lng = self._position_at_mile(duty.mile_marker)
            remark = duty.remark if duty.kind in ("pickup", "dropoff") else self.remark_fn(lat, lng)

        if not self.state.shift.active:
            self._start_shift(lat, lng, remark)

        self._append_event(
            DutyStatus.ON_DUTY_NOT_DRIVING,
            duty.duration_minutes,
            lat,
            lng,
            remark,
            mile_marker=duty.mile_marker,
            stop_reason=duty.kind,
        )

    def run(self, planned: list[PlannedActivity]) -> list[DutyEvent]:
        for activity in planned:
            if isinstance(activity, PlannedDrive):
                start_lat, start_lng = self._position_at_mile(activity.start_mile)
                self._drive_chunk(activity, start_lat, start_lng, self.remark_fn(start_lat, start_lng))
            else:
                self._fixed_duty(activity)
        return self.events


def _status_totals(segments: list[dict]) -> dict[str, float]:
    totals = {
        DutyStatus.OFF_DUTY.value: 0.0,
        DutyStatus.SLEEPER_BERTH.value: 0.0,
        DutyStatus.DRIVING.value: 0.0,
        DutyStatus.ON_DUTY_NOT_DRIVING.value: 0.0,
    }
    for segment in segments:
        totals[segment["status"]] = round(totals.get(segment["status"], 0.0) + segment["hours"], 2)
    return totals


def split_daily_logs(
    events: list[DutyEvent],
    start_time: datetime,
    total_distance_miles: float,
) -> list[DailyLogSheet]:
    if not events:
        return []

    end_time = events[-1].end_datetime
    logs: list[DailyLogSheet] = []
    day_number = 1
    period_start = start_time

    while period_start < end_time:
        period_end = period_start + timedelta(hours=24)
        segments: list[dict] = []
        remarks: list[dict] = []
        seen_remarks: set[str] = set()
        last_time = period_start

        for event in events:
            if event.end_datetime <= period_start or event.start_datetime >= period_end:
                continue

            clip_start = max(event.start_datetime, period_start)
            clip_end = min(event.end_datetime, period_end)

            if clip_start > last_time:
                gap_hours = (clip_start - last_time).total_seconds() / 3600
                segments.append(
                    {
                        "status": DutyStatus.OFF_DUTY.value,
                        "start": last_time.isoformat(),
                        "end": clip_start.isoformat(),
                        "hours": round(gap_hours, 2),
                        "start_fraction": _day_fraction(last_time, period_start),
                        "end_fraction": _day_fraction(clip_start, period_start),
                    }
                )
                last_time = clip_start

            hours = (clip_end - clip_start).total_seconds() / 3600
            if hours <= 0:
                continue

            segments.append(
                {
                    "status": event.status.value,
                    "start": clip_start.isoformat(),
                    "end": clip_end.isoformat(),
                    "hours": round(hours, 2),
                    "start_fraction": _day_fraction(clip_start, period_start),
                    "end_fraction": _day_fraction(clip_end, period_start),
                }
            )
            last_time = clip_end

            if clip_start == event.start_datetime and event.remark not in seen_remarks:
                remarks.append(
                    {
                        "time_fraction": _day_fraction(clip_start, period_start),
                        "remark": event.remark,
                    }
                )
                seen_remarks.add(event.remark)

        if last_time < period_end:
            gap_hours = (period_end - last_time).total_seconds() / 3600
            segments.append(
                {
                    "status": DutyStatus.OFF_DUTY.value,
                    "start": last_time.isoformat(),
                    "end": period_end.isoformat(),
                    "hours": round(gap_hours, 2),
                    "start_fraction": _day_fraction(last_time, period_start),
                    "end_fraction": _day_fraction(period_end, period_start),
                }
            )

        totals = _status_totals(segments)
        logs.append(
            DailyLogSheet(
                day_number=day_number,
                log_date=period_start,
                period_start=period_start,
                period_end=period_end,
                segments=segments,
                totals=totals,
                remarks=remarks,
                total_miles=round(total_distance_miles, 2) if day_number == 1 else 0.0,
            )
        )
        day_number += 1
        period_start = period_end

    return logs



def _day_fraction(moment: datetime, period_start: datetime) -> float:
    elapsed = (moment - period_start).total_seconds() / 3600
    return round(max(0.0, min(24.0, elapsed)), 2)


def build_route_stops(events: list[DutyEvent]) -> list[RouteStop]:
    stops: list[RouteStop] = []
    sequence = 1
    for event in events:
        if event.stop_reason in ("pickup", "dropoff", "fuel", "10hr_reset", "30min_break", "34hr_cycle_restart"):
            stop_type = {
                "pickup": "pickup",
                "dropoff": "dropoff",
                "fuel": "fuel",
                "10hr_reset": "rest",
                "30min_break": "break",
                "34hr_cycle_restart": "cycle_restart",
            }.get(event.stop_reason, "rest")
            duration = (event.end_datetime - event.start_datetime).total_seconds() / 60
            stops.append(
                RouteStop(
                    stop_type=stop_type,
                    lat=event.lat,
                    lng=event.lng,
                    remark=event.remark,
                    duration_minutes=round(duration, 1),
                    mile_marker=event.mile_marker,
                    scheduled_at=event.start_datetime,
                    sequence=sequence,
                )
            )
            sequence += 1
    return stops


def simulate_hos_trip(
    start_time: datetime,
    current_cycle_used_hrs: float,
    geometry: list[list[float]],
    total_distance_miles: float,
    legs: list[LegInput],
    remark_fn: RemarkFn | None = None,
) -> SimulationResult:
    remark_resolver = remark_fn or (lambda lat, lng: f"{lat:.4f}, {lng:.4f}")
    profile = build_route_profile(geometry, total_distance_miles)
    planned = build_planned_activities(legs, total_distance_miles)

    for activity in planned:
        if isinstance(activity, PlannedDuty) and activity.kind == "fuel" and activity.mile_marker is not None:
            lat, lng = interpolate_route(profile, activity.mile_marker)
            activity.lat = lat
            activity.lng = lng

    simulator = HOSSimulator(start_time, current_cycle_used_hrs, profile, remark_resolver)
    events = simulator.run(planned)
    daily_logs = split_daily_logs(events, start_time, total_distance_miles)
    route_stops = build_route_stops(events)

    driving_hours = sum(
        (event.end_datetime - event.start_datetime).total_seconds() / 3600
        for event in events
        if event.status == DutyStatus.DRIVING
    )
    on_duty_hours = sum(
        (event.end_datetime - event.start_datetime).total_seconds() / 3600
        for event in events
        if event.status in (DutyStatus.DRIVING, DutyStatus.ON_DUTY_NOT_DRIVING)
    )

    return SimulationResult(
        events=events,
        daily_logs=daily_logs,
        route_stops=route_stops,
        cycle_restart_required=simulator.state.cycle_restart_required,
        total_driving_hours=round(driving_hours, 2),
        total_on_duty_hours=round(on_duty_hours, 2),
        num_days=len(daily_logs),
    )
