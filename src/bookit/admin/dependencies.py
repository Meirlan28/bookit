from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.bookit.admin.service import AdminService
from src.bookit.auth.dependencies import get_current_admin
from src.bookit.auth.models import User
from src.bookit.database import get_async_session


def get_admin_service(
    db: Annotated[AsyncSession, Depends(get_async_session)],
) -> AdminService:
    return AdminService(db)


AdminServiceDep = Annotated[AdminService, Depends(get_admin_service)]
CurrentAdminDep = Annotated[User, Depends(get_current_admin)]
