import os


DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
SECRET_KEY = os.environ.get("SECRET_KEY", "local-development-only-key")
SESSION_COOKIE_NAME = 'seterra_quiz_session'
SESSION_PERMANENT = False
SESSION_USE_SIGNER = True
SESSION_COOKIE_SECURE = os.environ.get("FLASK_ENV") == "production"
WTF_CSRF_ENABLED = True
WTF_CSRF_SECRET_KEY = os.environ.get("WTF_CSRF_SECRET_KEY", SECRET_KEY)