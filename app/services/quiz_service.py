import random

from app.data.cities import QUIZ_LENGTH, cities as city_data


class QuizService:
    POINTS_BY_ATTEMPT = (100, 70, 40)

    def __init__(self, cities=None, question_count=QUIZ_LENGTH):
        self.cities = list(city_data if cities is None else cities)
        self.question_count = question_count

    def randomize_cities(self):
        return random.sample(self.cities, min(self.question_count, len(self.cities)))

    @staticmethod
    def check_answer(selected_city, correct_city):
        selected_name = selected_city.get("name") if isinstance(selected_city, dict) else selected_city
        correct_name = correct_city.get("name") if isinstance(correct_city, dict) else correct_city
        return selected_name == correct_name

    @staticmethod
    def calculate_score(correct_answers, total_questions):
        return round((correct_answers / total_questions) * 100, 2) if total_questions else 0