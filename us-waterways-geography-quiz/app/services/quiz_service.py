from app.data.waterways import waterways as waterway_data


class QuizService:
    ATTEMPT_LIMIT = 3

    def __init__(self, waterways=None):
        self.waterways = list(waterway_data if waterways is None else waterways)

    @staticmethod
    def check_answer(answer, correct_answer):
        return answer.strip().casefold() == correct_answer.casefold()