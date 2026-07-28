from unittest.mock import MagicMock, patch

from django.test import TestCase

from trips.models import GeocodeCache
from trips.services.geocoding import GeocodingError, geocode_address, normalize_query, reverse_geocode
from trips.services.routing import RouteWaypoint, compute_route


class NormalizeQueryTests(TestCase):
    def test_strips_and_lowercases(self):
        self.assertEqual(normalize_query("  Chicago, IL  "), "chicago, il")


class GeocodeAddressTests(TestCase):
    def test_returns_cached_result_without_api_call(self):
        GeocodeCache.objects.create(
            query_normalized="chicago, il",
            lat=41.8781,
            lng=-87.6298,
            display_name="Chicago, Illinois, USA",
            city="Chicago",
            state="Illinois",
        )

        with patch("trips.services.geocoding.requests.get") as mock_get:
            result = geocode_address("Chicago, IL")

        mock_get.assert_not_called()
        self.assertTrue(result.cached)
        self.assertEqual(result.lat, 41.8781)
        self.assertEqual(result.city, "Chicago")

    @patch("trips.services.geocoding.requests.get")
    def test_geocodes_and_caches_new_address(self, mock_get):
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = [
            {
                "lat": "39.7392",
                "lon": "-104.9903",
                "display_name": "Denver, Colorado, USA",
                "address": {"city": "Denver", "state": "Colorado"},
            }
        ]
        mock_get.return_value = mock_response

        result = geocode_address("Denver, CO")

        self.assertFalse(result.cached)
        self.assertEqual(result.city, "Denver")
        self.assertTrue(GeocodeCache.objects.filter(query_normalized="denver, co").exists())

    @patch("trips.services.geocoding.requests.get")
    def test_raises_when_no_results(self, mock_get):
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = []
        mock_get.return_value = mock_response

        with self.assertRaises(GeocodingError):
            geocode_address("Nowhereville, ZZ")


class ReverseGeocodeTests(TestCase):
    @patch("trips.services.geocoding.requests.get")
    def test_reverse_geocode_formats_city_state(self, mock_get):
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "display_name": "Springfield, Missouri, USA",
            "address": {"city": "Springfield", "state": "Missouri"},
        }
        mock_get.return_value = mock_response

        remark = reverse_geocode(37.2090, -93.2923)
        self.assertEqual(remark, "Springfield, Missouri")


class ComputeRouteTests(TestCase):
    @patch("trips.services.routing.requests.get")
    def test_compute_route_merges_two_legs(self, mock_get):
        def side_effect(url, **kwargs):
            response = MagicMock()
            response.raise_for_status.return_value = None
            if "leg1" in url or mock_get.call_count == 1:
                response.json.return_value = {
                    "code": "Ok",
                    "routes": [
                        {
                            "distance": 160934.4,
                            "duration": 7200,
                            "geometry": {
                                "coordinates": [[-87.6, 41.8], [-87.0, 41.5]],
                            },
                            "legs": [{"distance": 160934.4, "duration": 7200}],
                        }
                    ],
                }
            else:
                response.json.return_value = {
                    "code": "Ok",
                    "routes": [
                        {
                            "distance": 321868.8,
                            "duration": 14400,
                            "geometry": {
                                "coordinates": [[-104.9, 39.7], [-118.2, 34.0]],
                            },
                            "legs": [{"distance": 321868.8, "duration": 14400}],
                        }
                    ],
                }
            return response

        mock_get.side_effect = side_effect

        result = compute_route(
            [
                RouteWaypoint("current", 41.8781, -87.6298),
                RouteWaypoint("pickup", 39.7392, -104.9903),
                RouteWaypoint("dropoff", 34.0522, -118.2437),
            ]
        )

        self.assertEqual(len(result.legs), 2)
        self.assertEqual(result.total_distance_miles, 300.0)
        self.assertGreater(len(result.geometry), 2)
        self.assertEqual(mock_get.call_count, 2)
