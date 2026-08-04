from pydantic_settings import BaseSettings, SettingsConfigDict


class AuthConfig(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    BASE_API_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"

    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int
    VERIFY_EMAIL_TOKEN_EXPIRE_MINUTES: int
    REFRESH_COOKIE_SECURE: bool
    MAX_LOGIN_ATTEMPTS: int = 3
    LOGIN_ATTEMPTS_BEFORE_SECURITY_ALERT: int = 5
    LOGIN_COOLDOWN_INITIAL_SECONDS: int = 5
    LOGIN_COOLDOWN_BACKOFF_FACTOR:int = 3

    SMTP_USER: str
    SMTP_PASSWORD: str
    SMTP_HOST: str
    SMTP_PORT: int


auth_settings = AuthConfig()
