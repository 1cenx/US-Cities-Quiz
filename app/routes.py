from flask import Blueprint, jsonify, render_template
from app.data.cities import CITY_TOLERANCE_MILES, cities
from app.services.quiz_service import QuizService

blueprint = Blueprint("main", __name__)
quiz_service = QuizService(cities)


@blueprint.get("/")
def index():
    return render_template('index.html', city_count=len(cities), max_score=len(cities) * 100)


@blueprint.get("/api/quiz")
def get_quiz():
    return jsonify({
        "cities": quiz_service.randomize_cities(),
        "cityCount": len(cities),
        "maxScore": len(cities) * 100,
        "toleranceMiles": CITY_TOLERANCE_MILES,
    })