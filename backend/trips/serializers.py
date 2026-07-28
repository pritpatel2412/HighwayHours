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
