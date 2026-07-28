from rest_framework import serializers


class RoutePreviewSerializer(serializers.Serializer):
    current_location = serializers.CharField(max_length=512)
    pickup_location = serializers.CharField(max_length=512)
    dropoff_location = serializers.CharField(max_length=512)

    def validate_current_location(self, value: str) -> str:
        return value.strip()

    def validate_pickup_location(self, value: str) -> str:
        return value.strip()

    def validate_dropoff_location(self, value: str) -> str:
        return value.strip()


class TripCreateSerializer(serializers.Serializer):
    current_location = serializers.CharField(max_length=512)
    pickup_location = serializers.CharField(max_length=512)
    dropoff_location = serializers.CharField(max_length=512)
    current_cycle_used = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0, max_value=70)

    def validate_current_location(self, value: str) -> str:
        return value.strip()

    def validate_pickup_location(self, value: str) -> str:
        return value.strip()

    def validate_dropoff_location(self, value: str) -> str:
        return value.strip()
