from typing import Annotated

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Cookie,
    Depends,
    Header,
    Request,
    Response,
    status,
)
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from bookit.auth.presenters import present_auth_result
from src.bookit.auth.config import auth_settings
from src.bookit.auth.constants import REFRESH_COOKIE_NAME
from src.bookit.auth.dependencies import (
    AuthServiceDep,
    EmailServiceDep,
    OAuth2PasswordRequestFormDep,
    get_current_user,
)
from src.bookit.auth.exceptions import (
    InvalidRefreshTokenException,
)
from src.bookit.auth.models import User
from src.bookit.auth.presenters import present_token_refresh_result
from src.bookit.auth.schemas import (
    AuthSuccess,
    ForgotPasswordRequest,
    InvalidCredentialsResult,
    RegistrationFailure,
    RegistrationResponse,
    RegistrationSuccess,
    ResetPasswordRequest,
    SessionResponse,
    TokenRefreshSuccess,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from src.bookit.limiter import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/me", response_model=UserResponse)
@limiter.limit("20/minute")
async def get_me(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
):
    return current_user


@router.post(
    "/register",
    response_model=RegistrationResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("3/hour")
async def register(
    auth_service: AuthServiceDep,
    request: Request,
    user_data: UserCreate,
    bg_tasks: BackgroundTasks,
    email_service: EmailServiceDep,
):
    result = await auth_service.register_new_user(user_data)

    match result:
        case RegistrationFailure.USER_ALREADY_EXISTS:
            return JSONResponse(
                status_code=status.HTTP_409_CONFLICT,
                content={
                    "detail": "User with this email already exists",
                    "code": "user_already_exists",
                },
            )

        case RegistrationSuccess(
            user_id=user_id,
            email=email,
            verification_token=verification_token,
        ):
            email_service.send_verification_email(
                mail_to=email,
                token=verification_token,
                base_url=auth_settings.FRONTEND_URL,
                bg_tasks=bg_tasks,
            )

            return JSONResponse(
                status_code=status.HTTP_201_CREATED,
                content={
                    "id": user_id,
                    "email": str(email),
                    "detail": "User registered successfully",
                },
            )

        case _:
            raise RuntimeError(f"Unhandled registration result: {result!r}")


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    auth_service: AuthServiceDep,
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestFormDep,
    bg_tasks: BackgroundTasks,
    email_service: EmailServiceDep,
    x_device_code: str | None = Header(default=None),
):
    try:
        user_data = UserLogin(email=form_data.username, password=form_data.password)
    except ValidationError:
        return present_auth_result(
            result=InvalidCredentialsResult(),
            background_tasks=bg_tasks,
            email_service=email_service,
        )

    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    result = await auth_service.authenticate_user(
        user_in=user_data,
        ip_address=ip_address,
        user_agent=user_agent,
        device_code=x_device_code,
    )

    if isinstance(result, AuthSuccess):
        response.set_cookie(
            key=REFRESH_COOKIE_NAME,
            value=result.refresh_token,
            httponly=True,
            secure=auth_settings.REFRESH_COOKIE_SECURE,
            samesite="strict",
            max_age=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        )

    return present_auth_result(
        result=result,
        background_tasks=bg_tasks,
        email_service=email_service,
    )


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
async def refresh_token(
    auth_service: AuthServiceDep,
    request: Request,
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
):

    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    result = await auth_service.refresh_tokens(
        refresh_token, ip_address=ip_address, user_agent=user_agent
    )

    if isinstance(result, TokenRefreshSuccess):
        new_refresh = result.refresh_token

        response.set_cookie(
            key=REFRESH_COOKIE_NAME,
            value=new_refresh,
            httponly=True,
            secure=auth_settings.REFRESH_COOKIE_SECURE,
            samesite="strict",
            max_age=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        )

    return present_token_refresh_result(result)


@router.post("/logout", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def logout(
    auth_service: AuthServiceDep,
    request: Request,
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
):
    if refresh_token:
        await auth_service.logout(refresh_token)
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        httponly=True,
        secure=auth_settings.REFRESH_COOKIE_SECURE,
        samesite="strict",
    )

    return {"message": "Вы успешно вышли из системы"}


@router.get("/verify", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def verify_email(
    auth_service: AuthServiceDep,
    token: str,
    request: Request,
):
    await auth_service.verify_email(token)

    return {"message": "Email self-verification successful. You can now log in."}


@router.get("/sessions", response_model=list[SessionResponse])
@limiter.limit("10/minute")
async def get_active_sessions(
    request: Request,
    auth_service: AuthServiceDep,
    current_user: Annotated[User, Depends(get_current_user)],
):
    return await auth_service.get_active_sessions(current_user.id)


@router.delete("/sessions/others", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def terminate_other_sessions(
    request: Request,
    auth_service: AuthServiceDep,
    current_user: Annotated[User, Depends(get_current_user)],
    refresh_token: str = Cookie(alias=REFRESH_COOKIE_NAME),
):
    if not refresh_token:
        raise InvalidRefreshTokenException()

    await auth_service.revoke_other_sessions(current_user.id, refresh_token)
    return {"message": "All other sessions have been terminated successfully."}


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    auth_service: AuthServiceDep,
    background_tasks: BackgroundTasks,
):
    await auth_service.request_password_reset(body.email, background_tasks)
    return {
        "message": "If such an email exists, a link to reset the password has been sent."
    }


@router.post("/reset-password", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    body: ResetPasswordRequest,
    auth_service: AuthServiceDep,
):
    await auth_service.reset_password(body)
    return {
        "message": "The password has been successfully reset. You can now log in with your new password."
    }
