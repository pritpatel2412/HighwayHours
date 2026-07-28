import uuid
from django.db import models


class Trip(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    current_location = models.CharField(max_length=512)
    pickup_location = models.CharField(max_length=512)
    dropoff_location = models.CharField(max_length=512)
    current_cycle_used = models.DecimalField(max_digits=5, decimal_places=2)
    start_time = models.DateTimeField()
    total_distance_miles = models.FloatField()
    total_driving_hours = models.FloatField()
    total_duration_hours = models.FloatField()
    num_days = models.PositiveIntegerField()
    cycle_restart_required = models.BooleanField(default=False)
    locations = models.JSONField(default=dict)
    route_geometry = models.JSONField(default=list)
    summary = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.current_location} → {self.dropoff_location}"


class RouteStop(models.Model):
    STOP_TYPES = [
        ("pickup", "Pickup"),
        ("dropoff", "Dropoff"),
        ("fuel", "Fuel"),
        ("rest", "Rest"),
        ("break", "Break"),
        ("cycle_restart", "Cycle Restart"),
    ]

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="stops")
    stop_type = models.CharField(max_length=32, choices=STOP_TYPES)
    sequence = models.PositiveIntegerField()
    lat = models.FloatField()
    lng = models.FloatField()
    remark = models.CharField(max_length=256)
    duration_minutes = models.FloatField()
    mile_marker = models.FloatField(null=True, blank=True)
    scheduled_at = models.DateTimeField()

    class Meta:
        ordering = ["sequence"]


class DutyEvent(models.Model):
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="duty_events")
    sequence = models.PositiveIntegerField()
    status = models.CharField(max_length=32)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    lat = models.FloatField()
    lng = models.FloatField()
    remark = models.CharField(max_length=256)
    mile_marker = models.FloatField(null=True, blank=True)
    stop_reason = models.CharField(max_length=64, null=True, blank=True)

    class Meta:
        ordering = ["sequence"]


class DailyLog(models.Model):
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="daily_logs")
    day_number = models.PositiveIntegerField()
    log_date = models.DateTimeField()
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    total_miles = models.FloatField(default=0)
    segments = models.JSONField(default=list)
    totals = models.JSONField(default=dict)
    remarks = models.JSONField(default=list)

    class Meta:
        ordering = ["day_number"]


class GeocodeCache(models.Model):
    query_normalized = models.CharField(max_length=512, unique=True, db_index=True)
    lat = models.FloatField()
    lng = models.FloatField()
    display_name = models.CharField(max_length=1024, blank=True)
    city = models.CharField(max_length=256, blank=True)
    state = models.CharField(max_length=256, blank=True)
    raw_response = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"{self.query_normalized} → {self.city}, {self.state}"


class ReverseGeocodeCache(models.Model):
    lat_key = models.DecimalField(max_digits=9, decimal_places=4, db_index=True)
    lng_key = models.DecimalField(max_digits=9, decimal_places=4, db_index=True)
    remark = models.CharField(max_length=512)
    city = models.CharField(max_length=256, blank=True)
    state = models.CharField(max_length=256, blank=True)
    raw_response = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("lat_key", "lng_key")
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"({self.lat_key}, {self.lng_key}) → {self.remark}"

