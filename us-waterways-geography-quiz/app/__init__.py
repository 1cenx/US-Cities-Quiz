import os

from flask import Flask


def create_app():
    app = Flask(__name__)
    app.config["DEBUG"] = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "local-development-only-key")

    from app.routes import blueprint

    app.register_blueprint(blueprint)
    return app