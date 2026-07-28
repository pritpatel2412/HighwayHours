from django.db import models


class GeocodeCache(models.Model):
    """Cached forward-geocode results to reduce Nominatim API calls."""

    query_normalized = models.CharField(max_length=512, unique=True, db_index=True)
    lat = models.FloatField()
    lng = models.FloatField()
    display_name = models.CharField(max_length=512)
    city = models.CharField(max_length=128, blank=True, default="")
    state = models.CharField(max_length=64, blank=True, default="")
    raw_response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"{self.query_normalized} → ({self.lat}, {self.lng})"


class ReverseGeocodeCache(models.Model):
    """Cached reverse-geocode results keyed by rounded coordinates."""

    lat_key = models.DecimalField(max_digits=7, decimal_places=4)
    lng_key = models.DecimalField(max_digits=7, decimal_places=4)
    remark = models.CharField(max_length=256)
    city = models.CharField(max_length=128, blank=True, default="")
    state = models.CharField(max_length=64, blank=True, default="")
    raw_response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("lat_key", "lng_key")]
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"({self.lat_key}, {self.lng_key}) → {self.remark}"
