from sqladmin import ModelView
from sqladmin.authentication import AuthenticationBackend
from sqlalchemy import select
from starlette.requests import Request

from src.bookit.auth.models import Role, User
from src.bookit.auth.utils import verify_password
from src.bookit.database import async_session_maker


class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        email, password = form.get("username"), form.get("password")

        async with async_session_maker() as db:
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()

            if (
                user
                and verify_password(password, user.hashed_password)
                and user.role == Role.ADMIN
                and user.is_active
                and user.is_verified
            ):
                request.session.update({"token": str(user.id)})
                return True

        return False

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        token = request.session.get("token")
        if not token:
            return False

        async with async_session_maker() as db:
            result = await db.execute(select(User).where(User.id == int(token)))
            user = result.scalar_one_or_none()
            if (
                not user
                or user.role != Role.ADMIN
                or not user.is_active
                or not user.is_verified
            ):
                return False

        return True


class UserAdmin(ModelView, model=User):
    column_list = [User.id, User.email, User.role, User.is_active]
    column_searchable_list = [User.email]
    column_sortable_list = [User.id, User.email]
    icon = "fa-solid fa-user"
