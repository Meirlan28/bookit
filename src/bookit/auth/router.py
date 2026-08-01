from fastapi import APIRouter, Cookie, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from bookit.auth.exceptions import InvalidRefreshTokenException
from src.bookit.auth.config import auth_settings
from src.bookit.auth.constants import REFRESH_COOKIE_NAME, TOKEN_TYPE_BEARER
from src.bookit.auth.schemas import TokenResponse, UserCreate, UserResponse
from src.bookit.auth.service import AuthService
from src.bookit.database import get_async_session

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_async_session)):
    return await AuthService.register_new_user(user_data, db)

@router.post("/login", response_model=TokenResponse)
async def login(
    response: Response,
    user_data: UserCreate,
    background_tasks: BackgroundTasks, # <-- Добавляем фоновую задачу
    db: AsyncSession = Depends(get_db)
):
    # 1. Авторизуем пользователя
    access_token, refresh_token = await AuthService.authenticate_user(user_data, db)

    # 2. Добавляем задачу по очистке старых токенов в фон
    background_tasks.add_task(AuthService.cleanup_expired_tokens, db)

    # 3. Устанавливаем куку
    response.set_cookie(...)

    return TokenResponse(access_token=access_token, token_type=TOKEN_TYPE_BEARER)

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    response: Response,
    db: AsyncSession = Depends(get_async_session),
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME)
):
    if not refresh_token:
        raise InvalidRefreshTokenException()

    new_access, new_refresh = await AuthService.refresh_tokens(refresh_token, db)

    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=new_refresh,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )

    return TokenResponse(access_token=new_access, token_type=TOKEN_TYPE_BEARER)


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    response: Response,
    db: AsyncSession = Depends(get_async_session),
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME)
):
    if refresh_token:
        await AuthService.logout(refresh_token, db)

    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        httponly=True,
        secure=True,
        samesite="strict"
    )
    return {"message": "Successfully logged out"}
