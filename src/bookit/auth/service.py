from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.bookit.auth.config import auth_settings
from src.bookit.auth.constants import TOKEN_TYPE_ACCESS, TOKEN_TYPE_REFRESH
from src.bookit.auth.exceptions import (InvalidCredentialsException,
                                        InvalidRefreshTokenException,
                                        UserAlreadyExistsException)
from src.bookit.auth.models import RefreshToken, User
from src.bookit.auth.schemas import UserCreate
from src.bookit.auth.utils import (create_jwt_token, decode_jwt_token,
                                   get_password_hash, verify_password)


class AuthService:
    @staticmethod
    async def register_new_user(user_in: UserCreate, db: AsyncSession) -> User:
        result = await db.execute(select(User).where(User.email == user_in.email))
        if result.scalar_one_or_none():
            raise UserAlreadyExistsException()

        new_user = User(
            email=user_in.email,
            hashed_password=get_password_hash(user_in.password)
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user

    @staticmethod
    async def authenticate_user(user_in: UserCreate, db: AsyncSession) -> tuple[str, str]:
        # Ищем пользователя
        result = await db.execute(select(User).where(User.email == user_in.email))
        user = result.scalar_one_or_none()

        if not user or not verify_password(user_in.password, user.hashed_password):
            raise InvalidCredentialsException()


        access_token, refresh_token = AuthService._generate_tokens(user.id)


        await AuthService._save_refresh_token(db, refresh_token, user.id)

        return access_token, refresh_token

    @staticmethod
    async def refresh_tokens(refresh_token: str, db: AsyncSession) -> tuple[str, str]:
        # 1. Декодируем токен
        payload = decode_jwt_token(refresh_token)
        if not payload or payload.get("type") != TOKEN_TYPE_REFRESH:
            raise InvalidRefreshTokenException()

        user_id = int(payload.get("sub"))

        # 2. Ищем токен в базе (без фильтра is_revoked, чтобы поймать возможную кражу)
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token == refresh_token)
        )
        db_token = result.scalar_one_or_none()

        if not db_token:
            raise InvalidRefreshTokenException()

        # 🚨 3. ЗАЩИТА ОТ КРАЖИ (Token Reuse Detection)
        if db_token.is_revoked:
            # Тревога! Кто-то пытается использовать уже отработанный токен.
            # Отзываем ВСЕ сессии пользователя, так как его устройство могло быть скомпрометировано.
            await db.execute(
                update(RefreshToken)
                .where(RefreshToken.user_id == user_id)
                .values(is_revoked=True)
            )
            await db.commit()
            raise InvalidRefreshTokenException() # Можно добавить detail="Security alert: Token reuse detected."

        # ⏳ 4. Проверка срока жизни в БД (Defense in depth)
        # Если время жизни вышло (даже если JWT еще жив из-за рассинхрона времени), отклоняем
        if db_token.expires_at < datetime.now(timezone.utc):
            raise InvalidRefreshTokenException()

        # 5. Отзываем старый токен (Refresh Token Rotation)
        db_token.is_revoked = True

        # 6. Генерируем новые токены
        new_access, new_refresh = AuthService._generate_tokens(user_id)

        # 7. Сохраняем новый refresh_token
        await AuthService._save_refresh_token(db, new_refresh, user_id)

        return new_access, new_refresh

    @staticmethod
    async def logout(refresh_token: str, db: AsyncSession):
        # Помечаем токен как отозванный
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.token == refresh_token)
            .values(is_revoked=True)
        )
        await db.commit()

    # 🧹 8. ОЧИСТКА БАЗЫ (Garbage Collection)
    @staticmethod
    async def cleanup_expired_tokens(db: AsyncSession):
        """
        Удаляет из БД токены, срок действия которых истек.
        Отозванные токены (is_revoked) мы временно храним для аналитики и
        Token Reuse Detection, но если они протухли по времени — смело удаляем.
        """
        await db.execute(
            delete(RefreshToken)
            .where(RefreshToken.expires_at < datetime.now(timezone.utc))
        )
        await db.commit()


    @staticmethod
    def _generate_tokens(user_id: int) -> tuple[str, str]:
        access = create_jwt_token(
            {"sub": str(user_id)},
            TOKEN_TYPE_ACCESS,
            timedelta(minutes=auth_settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        refresh = create_jwt_token(
            {"sub": str(user_id)},
            TOKEN_TYPE_REFRESH,
            timedelta(days=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS)
        )
        return access, refresh

    @staticmethod
    async def _save_refresh_token(db: AsyncSession, token: str, user_id: int):
        expires_at = datetime.now(timezone.utc) + timedelta(days=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS)
        db_refresh_token = RefreshToken(
            token=token,
            user_id=user_id,
            expires_at=expires_at
        )
        db.add(db_refresh_token)
        await db.commit()
            expires_at=expires_at
        )
        db.add(db_refresh_token)
        await db.commit()
