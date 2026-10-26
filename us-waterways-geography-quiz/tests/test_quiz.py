import json
import unittest

from app import create_app
from app.data.waterways import waterways
from app.services.quiz_service import QuizService


class TestQuizService(unittest.TestCase):
    def test_pool_has_all_30_unique_waterways(self):
        self.assertEqual(len(waterways), 30)
        self.assertEqual(len({waterway["name"] for waterway in waterways}), 30)
        self.assertTrue(all(waterway["kind"] in {"area", "river"} for waterway in waterways))
        self.assertTrue(all(waterway["coordinates"] for waterway in waterways))
        self.assertEqual(
            {waterway["name"] for waterway in waterways},
            {
                "Pacific Ocean", "Atlantic Ocean", "Gulf of Mexico", "Caribbean Sea",
                "Gulf of California", "Bering Strait", "Chesapeake Bay", "Lake Ontario",
                "Lake Erie", "Lake Huron", "Lake Michigan", "Lake Superior", "Great Salt Lake",
                "St. Lawrence River", "Mississippi River", "Ohio River", "Colorado River",
                "Rio Grande", "Missouri River", "Columbia River", "Yukon River", "Hudson River",
                "Potomac River", "Arkansas River", "Snake River", "Red River",
                "North Platte River", "Tennessee River", "Sacramento River", "Erie Canal",
            },
        )

    def test_correct_answer_ignores_capitalization(self):
        self.assertTrue(QuizService.check_answer("Pacific Ocean", "Pacific Ocean"))
        self.assertTrue(QuizService.check_answer("pacific ocean", "Pacific Ocean"))
        self.assertTrue(QuizService.check_answer("  PACIFIC OCEAN  ", "Pacific Ocean"))

    def test_attempt_limit_is_three(self):
        self.assertEqual(QuizService.ATTEMPT_LIMIT, 3)


class TestQuizRoutes(unittest.TestCase):
    def setUp(self):
        self.client = create_app().test_client()

    def test_home_page_loads(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"30", response.data)

    def test_quiz_api_returns_all_waterways(self):
        response = self.client.get("/api/quiz")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["waterwayCount"], 30)
        self.assertEqual(len(response.json["waterways"]), 30)

    def test_map_features_include_neighboring_countries_and_named_lakes(self):
        response = self.client.get("/static/data/map-features.geojson")
        self.assertEqual(response.status_code, 200)
        feature_collection = json.loads(response.get_data(as_text=True))
        response.close()
        countries = {
            feature["properties"]["country"]
            for feature in feature_collection["features"]
            if "country" in feature["properties"]
        }
        waterway_ids = {
            feature["properties"]["waterwayId"]
            for feature in feature_collection["features"]
            if "waterwayId" in feature["properties"]
        }
        self.assertEqual(countries, {"Canada", "Mexico"})
        self.assertEqual(
            waterway_ids,
            {waterway["id"] for waterway in waterways} - {"bering-strait"},
        )


if __name__ == "__main__":
    unittest.main()