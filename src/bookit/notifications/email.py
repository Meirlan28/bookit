from pathlib import Path

from fastapi_mail import ConnectionConfig, FastMail

from src.bookit.auth.config import auth_settings

TEMPLATE_DIR = Path(__file__).resolve().parent / "templates"

conf = ConnectionConfig(
    MAIL_USERNAME=auth_settings.SMTP_USER,
    MAIL_PASSWORD=auth_settings.SMTP_PASSWORD,
    MAIL_FROM=auth_settings.SMTP_USER,
    MAIL_PORT=auth_settings.SMTP_PORT,
    MAIL_SERVER=auth_settings.SMTP_HOST,
    MAIL_STARTTLS=False,
    MAIL_SSL_TLS=True,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
    TEMPLATE_FOLDER=TEMPLATE_DIR,
)

fast_mail = FastMail(conf)
