import unittest
from app.data.cities import cities as city_data
from app.services.quiz_service import QuizService

class TestQuizService(unittest.TestCase):

    def setUp(self):
        self.quiz_service = QuizService()

    def test_randomize_cities(self):
        cities = self.quiz_service.randomize_cities()
        self.assertEqual(len(cities), 36)
        self.assertEqual(len({city["name"] for city in cities}), 36)

    def test_city_pool_matches_requested_list(self):
        expected_names = {
            "Atlanta", "Baltimore", "Boston", "Buffalo", "Charleston", "Chicago",
            "Cincinnati", "Cleveland", "Dallas-Ft. Worth", "Denver", "Detroit", "Houston",
            "Kansas City", "Little Rock", "Los Angeles", "Miami", "Milwaukee",
            "Minneapolis-St. Paul", "Montgomery", "Nashville", "New Orleans", "New York",
            "Oklahoma City", "Philadelphia", "Phoenix", "Pittsburgh", "Portland", "Richmond",
            "Salt Lake City", "San Antonio", "San Diego", "San Francisco", "Santa Fe", "Seattle",
            "St. Louis", "Washington, D.C.",
        }
        self.assertEqual({city["name"] for city in city_data}, expected_names)

    def test_check_answer_correct(self):
        city = "Los Angeles"
        answer = "Los Angeles"
        result = self.quiz_service.check_answer(city, answer)
        self.assertTrue(result)

    def test_check_answer_incorrect(self):
        city = "Los Angeles"
        answer = "San Francisco"
        result = self.quiz_service.check_answer(city, answer)
        self.assertFalse(result)

    def test_score_calculation(self):
        correct_answers = 30
        total_questions = 36
        score = self.quiz_service.calculate_score(correct_answers, total_questions)
        self.assertAlmostEqual(score, 83.33, places=2)

    def test_first_attempt_score(self):
        self.assertEqual(self.quiz_service.POINTS_BY_ATTEMPT[0], 100)

if __name__ == '__main__':
    unittest.main()