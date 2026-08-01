from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from alembic.environment import Any
from src.bookit.auth.config import auth_settings
from src.bookit.auth.constants import TOKEN_TYPE_ACCESS, TOKEN_TYPE_REFRESH

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_jwt_token(data: dict, token_type: str, expires_delta: timedelta) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire, "type": token_type})
    return jwt.encode(
        to_encode, auth_settings.SECRET_KEY, algorithm=auth_settings.ALGORITHM
    )


def decode_jwt_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(
            token, auth_settings.SECRET_KEY, algorithms=[auth_settings.ALGORITHM]
        )
    except jwt.PyJWTError:
        return None
