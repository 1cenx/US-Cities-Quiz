from flask import Blueprint, jsonify, render_template

from app.data.waterways import waterways
from app.services.quiz_service import QuizService

blueprint = Blueprint("main", __name__)
quiz_service = QuizService()


@blueprint.get("/")
def index():
    return render_template("index.html", waterway_count=len(waterways))


@blueprint.get("/api/quiz")
def get_quiz():
    return jsonify({"waterways": quiz_service.waterways, "waterwayCount": len(waterways)})