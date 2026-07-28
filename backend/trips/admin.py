from django.contrib import admin

from trips.models import DailyLog, DutyEvent, GeocodeCache, ReverseGeocodeCache, RouteStop, Trip


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ("id", "current_location", "dropoff_location", "total_distance_miles", "num_days", "created_at")
    search_fields = ("current_location", "pickup_location", "dropoff_location")


@admin.register(RouteStop)
class RouteStopAdmin(admin.ModelAdmin):
    list_display = ("trip", "stop_type", "sequence", "remark", "scheduled_at")


@admin.register(DutyEvent)
class DutyEventAdmin(admin.ModelAdmin):
    list_display = ("trip", "sequence", "status", "start_datetime", "remark")


@admin.register(DailyLog)
class DailyLogAdmin(admin.ModelAdmin):
    list_display = ("trip", "day_number", "log_date")


@admin.register(GeocodeCache)
class GeocodeCacheAdmin(admin.ModelAdmin):
    list_display = ("query_normalized", "city", "state", "updated_at")
    search_fields = ("query_normalized", "display_name")


@admin.register(ReverseGeocodeCache)
class ReverseGeocodeCacheAdmin(admin.ModelAdmin):
    list_display = ("lat_key", "lng_key", "remark", "updated_at")


