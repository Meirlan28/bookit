import asyncio
import random
import string
from datetime import UTC, datetime, timedelta

from fastapi import BackgroundTasks, logger
from fastapi_mail import MessageSchema, MessageType
from pydantic import EmailStr, ValidationError
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.bookit.auth.config import auth_settings
from src.bookit.auth.constants import (
    TOKEN_TYPE_ACCESS,
    TOKEN_TYPE_REFRESH,
    TOKEN_TYPE_VERIFY_EMAIL,
)
from src.bookit.auth.email import fast_mail
from src.bookit.auth.exceptions import (
    InvalidCredentialsException,
    InvalidRefreshTokenException,
    InvalidTwoFactorCodeException,
    InvalidVerifyTokenException,
    LoginCooldownException,
    UnrecognizedDeviceException,
    UserAlreadyExistsException,
    UserInactiveException,
    UserNotVerifiedException,
)
from src.bookit.auth.models import RefreshToken, User
from src.bookit.auth.schemas import UserCreate
from src.bookit.auth.utils import (
    create_jwt_token,
    decode_jwt_token,
    get_password_hash,
    hash_token,
    verify_password,
)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _normalize_datetime(value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)

    async def register_new_user(self, user_in: UserCreate) -> tuple[User, str]:
        result = await self.db.execute(select(User).where(User.email == user_in.email))
        if result.scalar_one_or_none():
            raise UserAlreadyExistsException()

        new_user = User(
            email=user_in.email, hashed_password=get_password_hash(user_in.password)
        )
        self.db.add(new_user)
        await self.db.commit()
        await self.db.refresh(new_user)

        verify_token = create_jwt_token(
            data={"sub": str(new_user.id)},
            token_type=TOKEN_TYPE_VERIFY_EMAIL,
            expires_delta=timedelta(
                minutes=auth_settings.VERIFY_EMAIL_TOKEN_EXPIRE_MINUTES
            ),
        )

        return new_user, verify_token

    async def authenticate_user(
        self,
        user_in: UserCreate,
        bg_tasks: BackgroundTasks,
        ip_address: str | None = None,
        user_agent: str | None = None,
        device_code: str | None = None,
    ) -> tuple[str, str]:
        result = await self.db.execute(select(User).where(User.email == user_in.email))
        user = result.scalar_one_or_none()

        if not user:
            raise InvalidCredentialsException()

        now = datetime.now(UTC)

        if user.failed_login_attempts >= 3 and user.last_failed_login_at:
            delay_seconds = 5 * (3 ** (user.failed_login_attempts - 3))
            cooldown_ends_at = self._normalize_datetime(
                user.last_failed_login_at
            ) + timedelta(seconds=delay_seconds)

            if now < cooldown_ends_at:
                seconds_left = int((cooldown_ends_at - now).total_seconds())
                raise LoginCooldownException(seconds_left=seconds_left)

        if not verify_password(user_in.password, user.hashed_password):
            user.failed_login_attempts += 1
            user.last_failed_login_at = now

            if user.failed_login_attempts == 5:
                self.send_security_alert_email(user.email, bg_tasks)

            await self.db.commit()
            raise InvalidCredentialsException()

        if user.failed_login_attempts > 0:
            user.failed_login_attempts = 0
            user.last_failed_login_at = None
            await self.db.commit()

        if not user.is_active:
            raise UserInactiveException()

        if not user.is_verified:
            raise UserNotVerifiedException()

        is_recognized = await self._is_device_recognized(
            user.id, ip_address, user_agent
        )

        if not is_recognized:
            now = datetime.now(UTC)
            if not device_code:
                code = self._generate_6_digit_code()
                user.two_factor_code = get_password_hash(code)
                user.two_factor_expires_at = now + timedelta(minutes=10)
                await self.db.commit()

                self.send_new_device_email(
                    user.email, code, bg_tasks, ip_address, user_agent
                )
                raise UnrecognizedDeviceException()
            else:
                if not user.two_factor_expires_at or user.two_factor_expires_at < now:
                    raise InvalidTwoFactorCodeException()
                if not verify_password(device_code, user.two_factor_code):
                    raise InvalidTwoFactorCodeException()

                user.two_factor_code = None
                user.two_factor_expires_at = None
                await self.db.commit()

        access_token, refresh_token = self._generate_tokens(user.id)
        await self._save_refresh_token(
            refresh_token, user.id, ip_address=ip_address, user_agent=user_agent
        )

        return access_token, refresh_token

    async def refresh_tokens(
        self,
        refresh_token: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> tuple[str, str]:
        payload = decode_jwt_token(refresh_token)
        if not payload or payload.get("type") != TOKEN_TYPE_REFRESH:
            raise InvalidRefreshTokenException()

        user_id = int(payload.get("sub"))

        hashed_token = hash_token(refresh_token)

        result = await self.db.execute(
            select(RefreshToken).where(RefreshToken.token == hashed_token)
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

        hashed_token = hash_token(refresh_token)

        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.token == hashed_token)
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

    def send_verification_email(
        self, user_email: EmailStr, token: str, background_tasks: BackgroundTasks
    ):
        verify_url = f"{auth_settings.BASE_API_URL}/api/v1/auth/verify?token={token}"

        message = MessageSchema(
            subject="confirmation of registration in BookIt",
            recipients=[user_email],
            body=(
                f"<p>Hello!</p>"
                f"<p>Thank you for registering with BookIt.</p>"
                f"<p>Please verify your email by clicking the link below:</p>"
                f"<a href='{verify_url}'>Verify Email</a>"
                f"<p>The link will expire in {auth_settings.VERIFY_EMAIL_TOKEN_EXPIRE_MINUTES} minutes.</p>"
            ),
            subtype=MessageType.html,
        )

        background_tasks.add_task(fast_mail.send_message, message)

    def send_security_alert_email(
        self, user_email: EmailStr, background_tasks: BackgroundTasks
    ):
        message = MessageSchema(
            subject="Security Alert: Multiple Failed Login Attempts",
            recipients=[user_email],
            body=(
                f"<p>Hello!</p>"
                f"<p>We noticed multiple failed login attempts on your account.</p>"
                f"<p>If this wasn't you, we recommend changing your password immediately.</p>"
                f"<p>If you need assistance, please contact our support team.</p>"
            ),
            subtype=MessageType.html,
        )

        background_tasks.add_task(fast_mail.send_message, message)

    async def get_active_sessions(self, user_id: int):
        result = await self.db.execute(
            select(RefreshToken).where(
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked == False,
                RefreshToken.expires_at > datetime.now(UTC),
            )
        )
        return result.scalars().all()

    async def revoke_other_sessions(self, user_id: int, current_refresh_token: str):
        hashed_token = hash_token(current_refresh_token)

        await self.db.execute(
            update(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked == False,
                RefreshToken.token != hashed_token,
            )
            .values(is_revoked=True)
        )
        await self.db.commit()

    def _generate_6_digit_code(self) -> str:
        return "".join(random.choices(string.digits, k=6))

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

    def send_new_device_email(
        self,
        user_email: str,
        code: str,
        background_tasks: BackgroundTasks,
        ip: str | None,
        ua: str | None,
    ):
        try:
            message = MessageSchema(
                subject="BookIt: Login from a new device",
                recipients=[user_email],
                body=(
                    f"<h3>New device detected</h3>"
                    f"<p>We noticed a login attempt from a new device.</p>"
                    f"<ul><li>IP: {ip}</li><li>Browser/OS: {ua}</li></ul>"
                    f"<p>Your verification code is: <b style='font-size: 20px;'>{code}</b></p>"
                    f"<p>Valid for 10 minutes. Do not share it with anyone.</p>"
                ),
                subtype=MessageType.html,
            )
            asyncio.create_task(fast_mail.send_message(message))
        except ValidationError as e:
            logger.error(f"Pydantic email error: {e}")
