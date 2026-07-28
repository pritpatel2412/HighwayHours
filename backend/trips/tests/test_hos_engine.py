from datetime import datetime, timezone

from django.test import TestCase

from trips.hos_engine import (
    FUEL_INTERVAL_MILES,
    DutyStatus,
    LegInput,
    build_planned_activities,
    simulate_hos_trip,
)


def fixed_remark(_lat: float, _lng: float) -> str:
    return "Test City, TS"


def simple_geometry() -> list[list[float]]:
    return [[41.0, -87.0], [39.0, -104.0], [34.0, -118.0]]


class BuildPlannedActivitiesTests(TestCase):
    def test_inserts_fuel_stop_at_1000_miles(self):
        legs = [
            LegInput("current_to_pickup", 600, 10, 39.0, -104.0, "Denver, CO"),
            LegInput("pickup_to_dropoff", 500, 8, 34.0, -118.0, "Los Angeles, CA"),
        ]
        planned = build_planned_activities(legs, total_distance_miles=1100)
        fuel_stops = [item for item in planned if getattr(item, "kind", None) == "fuel"]
        self.assertEqual(len(fuel_stops), 1)
        self.assertEqual(fuel_stops[0].mile_marker, FUEL_INTERVAL_MILES)


class HOSSimulationTests(TestCase):
    def setUp(self):
        self.start = datetime(2026, 1, 15, 8, 0, tzinfo=timezone.utc)

    def test_short_same_day_trip_no_reset(self):
        result = simulate_hos_trip(
            start_time=self.start,
            current_cycle_used_hrs=0,
            geometry=simple_geometry(),
            total_distance_miles=300,
            legs=[
                LegInput("current_to_pickup", 150, 2.5, 39.0, -104.0, "Denver, CO"),
                LegInput("pickup_to_dropoff", 150, 2.5, 34.0, -118.0, "Los Angeles, CA"),
            ],
            remark_fn=fixed_remark,
        )
        reset_stops = [event for event in result.events if event.stop_reason == "10hr_reset"]
        self.assertEqual(len(reset_stops), 0)
        self.assertEqual(result.num_days, 1)
        self.assertFalse(result.cycle_restart_required)

    def test_long_drive_requires_10hr_reset(self):
        result = simulate_hos_trip(
            start_time=self.start,
            current_cycle_used_hrs=0,
            geometry=simple_geometry(),
            total_distance_miles=800,
            legs=[
                LegInput("current_to_pickup", 800, 13, 39.0, -104.0, "Denver, CO"),
                LegInput("pickup_to_dropoff", 0.1, 0.1, 34.0, -118.0, "Los Angeles, CA"),
            ],
            remark_fn=fixed_remark,
        )
        reset_stops = [event for event in result.events if event.stop_reason == "10hr_reset"]
        self.assertGreaterEqual(len(reset_stops), 1)

    def test_high_cycle_usage_triggers_34hr_restart(self):
        result = simulate_hos_trip(
            start_time=self.start,
            current_cycle_used_hrs=65,
            geometry=simple_geometry(),
            total_distance_miles=600,
            legs=[
                LegInput("current_to_pickup", 300, 5, 39.0, -104.0, "Denver, CO"),
                LegInput("pickup_to_dropoff", 300, 5, 34.0, -118.0, "Los Angeles, CA"),
            ],
            remark_fn=fixed_remark,
        )
        self.assertTrue(result.cycle_restart_required)
        restart_events = [event for event in result.events if event.stop_reason == "34hr_cycle_restart"]
        self.assertGreaterEqual(len(restart_events), 1)

    def test_daily_logs_sum_to_24_hours(self):
        result = simulate_hos_trip(
            start_time=self.start,
            current_cycle_used_hrs=0,
            geometry=simple_geometry(),
            total_distance_miles=1200,
            legs=[
                LegInput("current_to_pickup", 600, 11, 39.0, -104.0, "Denver, CO"),
                LegInput("pickup_to_dropoff", 600, 11, 34.0, -118.0, "Los Angeles, CA"),
            ],
            remark_fn=fixed_remark,
        )
        for log in result.daily_logs:
            total = round(sum(log.totals.values()), 2)
            self.assertAlmostEqual(total, 24.0, delta=0.05)

    def test_includes_pickup_and_dropoff_on_duty(self):
        result = simulate_hos_trip(
            start_time=self.start,
            current_cycle_used_hrs=0,
            geometry=simple_geometry(),
            total_distance_miles=200,
            legs=[
                LegInput("current_to_pickup", 100, 1.5, 39.0, -104.0, "Denver, CO"),
                LegInput("pickup_to_dropoff", 100, 1.5, 34.0, -118.0, "Los Angeles, CA"),
            ],
            remark_fn=fixed_remark,
        )
        pickup = [event for event in result.events if event.stop_reason == "pickup"]
        dropoff = [event for event in result.events if event.stop_reason == "dropoff"]
        self.assertEqual(len(pickup), 1)
        self.assertEqual(len(dropoff), 1)
        self.assertEqual(pickup[0].status, DutyStatus.ON_DUTY_NOT_DRIVING)
