from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.bookit.auth.config import auth_settings
from src.bookit.auth.constants import TOKEN_TYPE_ACCESS, TOKEN_TYPE_REFRESH
from src.bookit.auth.exceptions import (
    InvalidCredentialsException,
    InvalidRefreshTokenException,
    UserAlreadyExistsException,
)
from src.bookit.auth.models import RefreshToken, User
from src.bookit.auth.schemas import UserCreate
from src.bookit.auth.utils import (
    create_jwt_token,
    decode_jwt_token,
    get_password_hash,
    verify_password,
)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _normalize_datetime(value: datetime) -> datetime:
        # Эту функцию можно оставить статической, так как она чистая (не использует self.db)
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)

    async def register_new_user(self, user_in: UserCreate) -> User:
        result = await self.db.execute(select(User).where(User.email == user_in.email))
        if result.scalar_one_or_none():
            raise UserAlreadyExistsException()

        new_user = User(
            email=user_in.email, hashed_password=get_password_hash(user_in.password)
        )
        self.db.add(new_user)
        await self.db.commit()
        await self.db.refresh(new_user)
        return new_user

    async def authenticate_user(self, user_in: UserCreate) -> tuple[str, str]:
        result = await self.db.execute(select(User).where(User.email == user_in.email))
        user = result.scalar_one_or_none()

        if not user or not verify_password(user_in.password, user.hashed_password):
            raise InvalidCredentialsException()

        access_token, refresh_token = self._generate_tokens(user.id)
        await self._save_refresh_token(refresh_token, user.id)

        return access_token, refresh_token

    async def refresh_tokens(self, refresh_token: str) -> tuple[str, str]:
        payload = decode_jwt_token(refresh_token)
        if not payload or payload.get("type") != TOKEN_TYPE_REFRESH:
            raise InvalidRefreshTokenException()

        user_id = int(payload.get("sub"))

        result = await self.db.execute(
            select(RefreshToken).where(RefreshToken.token == refresh_token)
        )
        db_token = result.scalar_one_or_none()

        if not db_token:
            raise InvalidRefreshTokenException()

        if db_token.is_revoked:
            await self.db.execute(
                update(RefreshToken)
                .where(RefreshToken.user_id == user_id)
                .values(is_revoked=True)
            )
            await self.db.commit()
            raise InvalidRefreshTokenException()

        if self._normalize_datetime(db_token.expires_at) < datetime.now(UTC):
            raise InvalidRefreshTokenException()

        db_token.is_revoked = True

        new_access, new_refresh = self._generate_tokens(user_id)
        await self._save_refresh_token(new_refresh, user_id)

        return new_access, new_refresh

    async def logout(self, refresh_token: str):
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.token == refresh_token)
            .values(is_revoked=True)
        )
        await self.db.commit()

    async def cleanup_expired_tokens(self):
        await self.db.execute(
            delete(RefreshToken).where(RefreshToken.expires_at < datetime.now(UTC))
        )
        await self.db.commit()

    def _generate_tokens(self, user_id: int) -> tuple[str, str]:
        access = create_jwt_token(
            {"sub": str(user_id)},
            TOKEN_TYPE_ACCESS,
            timedelta(minutes=auth_settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        refresh = create_jwt_token(
            {"sub": str(user_id)},
            TOKEN_TYPE_REFRESH,
            timedelta(days=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        return access, refresh

    async def _save_refresh_token(self, token: str, user_id: int):
        expires_at = datetime.now(UTC) + timedelta(
            days=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        db_refresh_token = RefreshToken(
            token=token, user_id=user_id, expires_at=expires_at
        )
        self.db.add(db_refresh_token)
        await self.db.commit()
