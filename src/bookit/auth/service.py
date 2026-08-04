import math
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import BackgroundTasks
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from bookit.notifications.service import EmailService
from src.bookit.auth.config import auth_settings
from src.bookit.auth.constants import (
    TOKEN_TYPE_ACCESS,
    TOKEN_TYPE_REFRESH,
    TOKEN_TYPE_RESET_PASSWORD,
    TOKEN_TYPE_VERIFY_EMAIL,
)
from src.bookit.auth.exceptions import (
    InvalidResetTokenException,
    InvalidVerifyTokenException,
)
from src.bookit.auth.models import RefreshToken, User
from src.bookit.auth.schemas import (
    AuthFailure,
    AuthResult,
    AuthSuccess,
    InvalidCredentialsResult,
    LoginCooldownResult,
    NewDeviceVerificationRequired,
    RegistrationFailure,
    RegistrationResult,
    RegistrationSuccess,
    ResetPasswordRequest,
    TokenRefreshFailure,
    TokenRefreshResult,
    TokenRefreshSuccess,
    UserCreate,
)
from src.bookit.auth.utils import (
    create_jwt_token,
    decode_jwt_token,
    get_password_hash,
    hash_token,
    verify_password,
)


class AuthService:
    def __init__(self, db: AsyncSession, email_service: EmailService):
        self.db = db
        self.email_service = email_service

    # registraion and authentication methods

    @staticmethod
    def _normalize_datetime(value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)

    async def register_new_user(
        self,
        user_in: UserCreate,
    ) -> RegistrationResult:
        result = await self.db.execute(select(User).where(User.email == user_in.email))
        existing_user = result.scalar_one_or_none()

        if existing_user is not None:
            return RegistrationFailure.USER_ALREADY_EXISTS

        new_user = User(
            email=user_in.email,
            hashed_password=get_password_hash(user_in.password),
        )

        self.db.add(new_user)

        await self.db.commit()
        await self.db.refresh(new_user)

        verification_token = create_jwt_token(
            data={"sub": str(new_user.id)},
            token_type=TOKEN_TYPE_VERIFY_EMAIL,
            expires_delta=timedelta(
                minutes=auth_settings.VERIFY_EMAIL_TOKEN_EXPIRE_MINUTES
            ),
        )

        return RegistrationSuccess(
            user_id=new_user.id,
            email=new_user.email,
            verification_token=verification_token,
        )

    async def authenticate_user(
        self,
        user_in: UserCreate,
        ip_address: str | None = None,
        user_agent: str | None = None,
        device_code: str | None = None,
    ) -> AuthResult:
        result = await self.db.execute(select(User).where(User.email == user_in.email))
        user = result.scalar_one_or_none()

        if user is None:
            return InvalidCredentialsResult()

        now = datetime.now(UTC)

        cooldown_result = self._get_login_cooldown_result(user, now)

        if cooldown_result is not None:
            return cooldown_result

        if not verify_password(user_in.password, user.hashed_password):
            return await self._handle_invalid_password(user, now)

        await self._reset_failed_login_attempts(user)

        if not user.is_active:
            return AuthFailure.USER_INACTIVE

        if not user.is_verified:
            return AuthFailure.USER_NOT_VERIFIED

        is_recognized = await self._is_device_recognized(
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        if not is_recognized:
            device_result = await self._handle_unrecognized_device(
                user=user,
                now=now,
                device_code=device_code,
                ip_address=ip_address,
                user_agent=user_agent,
            )

            if device_result is not None:
                return device_result

        access_token, refresh_token = self._generate_tokens(user.id)

        await self._save_refresh_token(
            token=refresh_token,
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return AuthSuccess(
            access_token=access_token,
            refresh_token=refresh_token,
        )

    def _get_login_cooldown_result(
        self,
        user: User,
        now: datetime,
    ) -> LoginCooldownResult | None:
        if (
            user.failed_login_attempts <= auth_settings.MAX_LOGIN_ATTEMPTS
            or user.last_failed_login_at is None
        ):
            return None

        attempts_over_limit = (
            user.failed_login_attempts - auth_settings.MAX_LOGIN_ATTEMPTS - 1
        )

        delay_seconds = (
            auth_settings.LOGIN_COOLDOWN_INITIAL_SECONDS
            * auth_settings.LOGIN_COOLDOWN_BACKOFF_FACTOR**attempts_over_limit
        )

        cooldown_ends_at = self._normalize_datetime(
            user.last_failed_login_at
        ) + timedelta(seconds=delay_seconds)

        if now >= cooldown_ends_at:
            return None

        seconds_left = math.ceil((cooldown_ends_at - now).total_seconds())

        return LoginCooldownResult(
            seconds_left=seconds_left,
        )

    async def _handle_invalid_password(
        self,
        user: User,
        now: datetime,
    ) -> InvalidCredentialsResult:
        user.failed_login_attempts += 1
        user.last_failed_login_at = now

        security_alert_email = None

        if (
            user.failed_login_attempts
            == auth_settings.LOGIN_ATTEMPTS_BEFORE_SECURITY_ALERT
        ):
            security_alert_email = user.email

        await self.db.commit()

        return InvalidCredentialsResult(
            security_alert_email=security_alert_email,
        )

    async def _reset_failed_login_attempts(
        self,
        user: User,
    ) -> None:
        if user.failed_login_attempts == 0:
            return

        user.failed_login_attempts = 0
        user.last_failed_login_at = None

        await self.db.commit()

    async def _handle_unrecognized_device(
        self,
        user: User,
        now: datetime,
        device_code: str | None,
        ip_address: str | None,
        user_agent: str | None,
    ) -> NewDeviceVerificationRequired | AuthFailure | None:
        if device_code is None:
            code = self._generate_6_digit_code()

            user.two_factor_code = get_password_hash(code)
            user.two_factor_expires_at = now + timedelta(minutes=10)

            await self.db.commit()

            return NewDeviceVerificationRequired(
                email=user.email,
                code=code,
                ip_address=ip_address,
                user_agent=user_agent,
            )

        if user.two_factor_code is None or user.two_factor_expires_at is None:
            return AuthFailure.INVALID_TWO_FACTOR_CODE

        expires_at = self._normalize_datetime(user.two_factor_expires_at)

        if expires_at < now:
            return AuthFailure.INVALID_TWO_FACTOR_CODE

        if not verify_password(device_code, user.two_factor_code):
            return AuthFailure.INVALID_TWO_FACTOR_CODE

        user.two_factor_code = None
        user.two_factor_expires_at = None

        await self.db.commit()

        return None

    async def _is_device_recognized(
        self, user_id: int, ip_address: str | None, user_agent: str | None
    ) -> bool:
        total_sessions = await self.db.execute(
            select(func.count())
            .select_from(RefreshToken)
            .where(RefreshToken.user_id == user_id)
        )
        if total_sessions.scalar() == 0:
            return True

        result = await self.db.execute(
            select(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.ip_address == ip_address,
                RefreshToken.user_agent == user_agent,
            )
            .limit(1)
        )
        return result.scalar_one_or_none() is not None

    @staticmethod
    def _generate_6_digit_code() -> str:
        return f"{secrets.randbelow(1_000_000):06d}"

    async def logout(self, refresh_token: str) -> None:

        hashed_token = hash_token(refresh_token)

        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.token == hashed_token)
            .values(is_revoked=True)
        )
        await self.db.commit()

    # token management methods

    async def refresh_tokens(
        self,
        refresh_token: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> TokenRefreshResult:
        payload = decode_jwt_token(refresh_token)

        if payload is None or payload.get("type") != TOKEN_TYPE_REFRESH:
            return TokenRefreshFailure.INVALID_REFRESH_TOKEN

        subject = payload.get("sub")

        try:
            user_id = int(subject)
        except (TypeError, ValueError):
            return TokenRefreshFailure.INVALID_REFRESH_TOKEN

        user_result = await self.db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()

        if user is None or not user.is_active or not user.is_verified:
            return TokenRefreshFailure.INVALID_REFRESH_TOKEN

        hashed_token = hash_token(refresh_token)

        token_result = await self.db.execute(
            select(RefreshToken)
            .where(RefreshToken.token == hashed_token)
            .with_for_update()
        )
        db_token = token_result.scalar_one_or_none()

        if db_token is None:
            return TokenRefreshFailure.INVALID_REFRESH_TOKEN

        if db_token.user_id != user_id:
            return TokenRefreshFailure.INVALID_REFRESH_TOKEN

        if db_token.is_revoked:
            return TokenRefreshFailure.INVALID_REFRESH_TOKEN

        now = datetime.now(UTC)

        expires_at = self._normalize_datetime(db_token.expires_at)

        if expires_at <= now:
            return TokenRefreshFailure.INVALID_REFRESH_TOKEN

        new_access_token, new_refresh_token = self._generate_tokens(user_id)

        db_token.token = hash_token(new_refresh_token)
        db_token.expires_at = now + timedelta(
            days=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        db_token.last_activity = now

        if ip_address is not None:
            db_token.ip_address = ip_address

        if user_agent is not None:
            db_token.user_agent = user_agent

        await self.db.commit()

        return TokenRefreshSuccess(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
        )

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

    async def _save_refresh_token(
        self,
        token: str,
        user_id: int,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ):
        expires_at = datetime.now(UTC) + timedelta(
            days=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        hashed_token = hash_token(token)

        db_refresh_token = RefreshToken(
            token=hashed_token,
            user_id=user_id,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
            last_activity=datetime.now(UTC),
        )
        self.db.add(db_refresh_token)
        await self.db.commit()

    # session management methods

    async def get_active_sessions(self, user_id: int):
        result = await self.db.execute(
            select(RefreshToken).where(
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked.is_(False),
                RefreshToken.expires_at > datetime.now(UTC),
            )
        )
        return result.scalars().all()

    async def revoke_other_sessions(
        self, user_id: int, current_refresh_token: str
    ) -> None:
        hashed_token = hash_token(current_refresh_token)

        await self.db.execute(
            update(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked.is_(False),
                RefreshToken.token != hashed_token,
            )
            .values(is_revoked=True)
        )
        await self.db.commit()

    # password reset methods

    async def request_password_reset(
        self, email: str, background_tasks: BackgroundTasks
    ) -> None:
        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user or not user.is_active:
            return

        reset_token = create_jwt_token(
            data={"sub": str(user.id)},
            token_type=TOKEN_TYPE_RESET_PASSWORD,
            expires_delta=timedelta(minutes=15),
        )

        self.email_service.send_password_reset_email(
            mail_to=user.email,
            token=reset_token,
            base_url=auth_settings.FRONTEND_URL,
            bg_tasks=background_tasks,
        )

    async def reset_password(self, payload_data: ResetPasswordRequest) -> None:
        payload = decode_jwt_token(payload_data.token)

        if not payload or payload.get("type") != TOKEN_TYPE_RESET_PASSWORD:
            raise InvalidResetTokenException()

        user_id = int(payload.get("sub"))
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user or not user.is_active:
            raise InvalidResetTokenException()

        user.hashed_password = get_password_hash(payload_data.new_password)

        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user.id)
            .values(is_revoked=True)
        )

        await self.db.commit()

    # email verification methods

    async def verify_email(self, token: str):
        payload = decode_jwt_token(token)

        if not payload or payload.get("type") != TOKEN_TYPE_VERIFY_EMAIL:
            raise InvalidVerifyTokenException()

        user_id = int(payload.get("sub"))

        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise InvalidVerifyTokenException()

        if user.is_verified:
            return

        user.is_verified = True
        await self.db.commit()
