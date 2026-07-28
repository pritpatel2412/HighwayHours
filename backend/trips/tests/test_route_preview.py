from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from trips.services.route_planner import RoutePreviewResult
from trips.services.route_planner import LocationPayload


class RoutePreviewViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch("trips.views.build_route_preview")
    def test_route_preview_returns_result(self, mock_build):
        mock_build.return_value = RoutePreviewResult(
            locations={
                "current": LocationPayload(
                    address="Chicago, IL",
                    lat=41.8781,
                    lng=-87.6298,
                    display_name="Chicago, Illinois",
                    city="Chicago",
                    state="Illinois",
                    cached=False,
                ),
                "pickup": LocationPayload(
                    address="Denver, CO",
                    lat=39.7392,
                    lng=-104.9903,
                    display_name="Denver, Colorado",
                    city="Denver",
                    state="Colorado",
                    cached=False,
                ),
                "dropoff": LocationPayload(
                    address="Los Angeles, CA",
                    lat=34.0522,
                    lng=-118.2437,
                    display_name="Los Angeles, California",
                    city="Los Angeles",
                    state="California",
                    cached=False,
                ),
            },
            legs=[
                {
                    "from": "current",
                    "to": "pickup",
                    "distance_miles": 920.0,
                    "duration_hours": 13.5,
                    "geometry": [[41.8781, -87.6298]],
                }
            ],
            total_distance_miles=1900.0,
            total_duration_hours=28.0,
            geometry=[[41.8781, -87.6298], [34.0522, -118.2437]],
        )

        response = self.client.post(
            reverse("route-preview"),
            {
                "current_location": "Chicago, IL",
                "pickup_location": "Denver, CO",
                "dropoff_location": "Los Angeles, CA",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_distance_miles"], 1900.0)
        self.assertIn("current", response.data["locations"])

    def test_route_preview_validates_required_fields(self):
        response = self.client.post(
            reverse("route-preview"),
            {"current_location": "Chicago, IL"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
