from fastapi import BackgroundTasks, status
from fastapi.responses import JSONResponse

from bookit.notifications.service import EmailService
from src.bookit.auth.schemas import (
    AuthFailure,
    AuthResult,
    AuthSuccess,
    InvalidCredentialsResult,
    LoginCooldownResult,
    NewDeviceVerificationRequired,
    TokenRefreshFailure,
    TokenRefreshResult,
    TokenRefreshSuccess,
    TokenResponse,
)


def present_auth_result(
    result: AuthResult,
    background_tasks: BackgroundTasks,
    email_service: EmailService,
):
    match result:
        case AuthSuccess(
            access_token=access_token,
            refresh_token=_,
        ):
            return TokenResponse(
                access_token=access_token,
                token_type="bearer",
            )

        case InvalidCredentialsResult(
            security_alert_email=security_alert_email
        ):
            if security_alert_email is not None:
                email_service.send_security_alert_email(
                    mail_to=security_alert_email,
                    bg_tasks=background_tasks,
                )

            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "detail": "Invalid email or password",
                    "code": "invalid_credentials",
                },
            )

        case LoginCooldownResult(seconds_left=seconds_left):
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Too many login attempts",
                    "code": "login_cooldown",
                    "seconds_left": seconds_left,
                },
                headers={
                    "Retry-After": str(seconds_left),
                },
            )

        case NewDeviceVerificationRequired(
            email=email,
            code=code,
            ip_address=ip_address,
            user_agent=user_agent,
        ):
            email_service.send_new_device_email(
                mail_to=email,
                code=code,
                ip=ip_address,
                ua=user_agent,
                bg_tasks=background_tasks,
            )

            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": "New device verification required",
                    "code": "new_device_verification_required",
                },
            )

        case AuthFailure.USER_INACTIVE:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": "User account is inactive",
                    "code": "user_inactive",
                },
            )

        case AuthFailure.USER_NOT_VERIFIED:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": "Email is not verified",
                    "code": "user_not_verified",
                },
            )

        case AuthFailure.INVALID_TWO_FACTOR_CODE:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "detail": "Invalid or expired verification code",
                    "code": "invalid_two_factor_code",
                },
            )

        case _:
            raise RuntimeError(
                f"Unhandled auth result: {result!r}"
            )

def present_token_refresh_result(
    result: TokenRefreshResult,
):
    match result:
        case TokenRefreshSuccess(
            access_token=access_token,
            refresh_token=_,
        ):
            return TokenResponse(
                access_token=access_token,
                token_type="bearer",
            )

        case TokenRefreshFailure.INVALID_REFRESH_TOKEN:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "detail": "Invalid refresh token",
                    "code": "invalid_refresh_token",
                },
            )

        case _:
            raise RuntimeError(
                f"Unhandled token refresh result: {result!r}"
            )
