from django.contrib import admin

from trips.models import GeocodeCache, ReverseGeocodeCache


@admin.register(GeocodeCache)
class GeocodeCacheAdmin(admin.ModelAdmin):
    list_display = ("query_normalized", "city", "state", "lat", "lng", "updated_at")
    search_fields = ("query_normalized", "display_name", "city", "state")
    readonly_fields = ("created_at", "updated_at")


@admin.register(ReverseGeocodeCache)
class ReverseGeocodeCacheAdmin(admin.ModelAdmin):
    list_display = ("lat_key", "lng_key", "remark", "updated_at")
    search_fields = ("remark", "city", "state")
    readonly_fields = ("created_at", "updated_at")
