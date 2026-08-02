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
from pydantic_core import ValidationError

from src.bookit.auth.config import auth_settings
from src.bookit.auth.constants import REFRESH_COOKIE_NAME, TOKEN_TYPE_BEARER
from src.bookit.auth.dependencies import (
    AuthServiceDep,
    OAuth2PasswordRequestFormDep,
    get_current_user,
)
from src.bookit.auth.exceptions import (
    InvalidCredentialsException,
    InvalidRefreshTokenException,
)
from src.bookit.auth.models import User
from src.bookit.auth.schemas import (
    SessionResponse,
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
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
@limiter.limit("3/hour")
async def register(
    auth_service: AuthServiceDep,
    request: Request,
    user_data: UserCreate,
    bg_tasks: BackgroundTasks,
):
    user, verify_token = await auth_service.register_new_user(user_data)

    auth_service.send_verification_email(user.email, verify_token, bg_tasks)

    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    auth_service: AuthServiceDep,
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestFormDep,
    background_tasks: BackgroundTasks,
    x_device_code: str | None = Header(default=None),
):
    try:
        user_data = UserLogin(email=form_data.username, password=form_data.password)
    except ValidationError:
        raise InvalidCredentialsException()

    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    access_token, refresh_token = await auth_service.authenticate_user(
        user_data, background_tasks, ip_address, user_agent, x_device_code
    )

    background_tasks.add_task(auth_service.cleanup_expired_tokens)

    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=auth_settings.REFRESH_COOKIE_SECURE,
        samesite="strict",
        max_age=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return TokenResponse(access_token=access_token, token_type=TOKEN_TYPE_BEARER)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
async def refresh_token(
    auth_service: AuthServiceDep,
    request: Request,
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
):
    if not refresh_token:
        raise InvalidRefreshTokenException()

    new_access, new_refresh = await auth_service.refresh_tokens(refresh_token)

    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=new_refresh,
        httponly=True,
        secure=auth_settings.REFRESH_COOKIE_SECURE,
        samesite="strict",
        max_age=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return TokenResponse(access_token=new_access, token_type=TOKEN_TYPE_BEARER)


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
    return {"message": "Successfully logged out"}


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
