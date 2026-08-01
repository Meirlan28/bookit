from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.bookit.database import async_session_maker
from src.bookit.auth.utils import decode_jwt_token
from src.bookit.auth.models import Role, User
from src.bookit.auth.constants import TOKEN_TYPE_ACCESS
from src.bookit.auth.exceptions import InvalidTokenException

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(async_session_maker)
) -> User:
    payload = decode_jwt_token(token)
    if not payload or payload.get("type") != TOKEN_TYPE_ACCESS:
        raise InvalidTokenException()

    user_id = payload.get("sub")
    if not user_id:
        raise InvalidTokenException()

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise InvalidTokenException()

    return user

async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Проверяет, является ли текущий авторизованный пользователь администратором.
    """
    if current_user.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have enough permissions to perform this action."
        )
    return current_user
